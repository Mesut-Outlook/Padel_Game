// Shared match simulation (client offline + authoritative server). No rendering here.
import { newBall, stepBall, aimVelocity, predict, contraVelocity } from './physics.js';
import { newMatch, onHit, onContact, servePosition, serviceBox, serverId } from './rules.js';

export const REACH = 1.35, MAX_HIT_H = 2.9, SPEED = 5.2;
// Energy 0..1: running and strokes drain it (long rallies ever faster, low stamina faster), points and changeover
// drink breaks give it back. Tired players run slower and miss more. ponytail: tuning knobs, calibrate in play.
// drain: run (per second at full stick), stroke / smash (per hit), long rallies multiply it (capped at rallyMax);
// refill: rest (per second between points), drink (changeover). Effects at energy 0: slow = speed lost,
// miss = extra error, soft = slower shots, reach = racket reach lost (all scale linearly with 1 - energy).
export const ENERGY = { run: 0.012, stroke: 0.006, smash: 0.012, rallyFrom: 6, rallyStep: 0.08, rallyMax: 1.5, rest: 0.025, drink: 0.3,
  slow: 0.4, miss: 1.0, soft: 0.15, reach: 0.2 };
// Hydration 0..1 drains while a point is played (faster when running, ×outdoor outside); below `dry` the player
// is slower and gets less back between points. Tuned with AI play: no water -> under 0.30 around game 5 of a set.
export const HYDRATION = { play: 0.0028, run: 0.0028, outdoor: 1.25, dry: 0.3, drySlow: 0.1, dryRest: 0.5 };
// The bag: one drink at every changeover (water first), food offered there when energy < 0.5 (input `eat` takes it).
// Effects live here, so a client only ever sends counts (the server clamps them).
export const BAG = { bag_water: { hyd: 0.5 }, bag_isotonic: { hyd: 0.35, energy: 0.12 }, bag_banana: { energy: 0.12, tire: 0.95 }, bag_gel: { energy: 0.22 } };
const DRINKS = ['bag_water', 'bag_isotonic'], FOODS = ['bag_banana', 'bag_gel'];
const DEFAULT_BAG = { bag_water: Infinity, bag_banana: Infinity };  // Friendly, tutorial and AI players
function consume(w, pl, item) {
  const e = BAG[item];
  pl.bag[item]--;
  pl.hyd = Math.min(1, pl.hyd + (e.hyd || 0));
  pl.energy = Math.min(1, pl.energy + (e.energy || 0));
  pl.tireK *= e.tire || 1;
  w.events.push({ type: 'consume', pid: pl.id, item, t: w.t });
}
const tire = (w, pl, amount) => {
  const k = (16 - pl.stats.stamina) / 10 * Math.min(ENERGY.rallyMax, 1 + Math.max(0, w.rally - ENERGY.rallyFrom) * ENERGY.rallyStep);
  pl.energy = Math.max(0, pl.energy - amount * k * pl.tireK);
};

// depth = metres from net on opponent side, t = flight time to first bounce, spin = topspin(+)/slice(-) rad/s
export const SHOTS = {
  serve:    { depth: 5.6, t: 0.85, spin: -25, anim: 'serve' },
  serveSlice: { depth: 5.2, t: 0.95, spin: -60, side: 30, anim: 'serve' },  // low, skidding, curls away
  drive:    { depth: 7.4, t: 0.75, spin: 45,  anim: 'forehand' },
  volley:   { depth: 6.2, t: 0.6,  spin: -30, anim: 'volley' },
  lob:      { depth: 8.8, t: 1.85, spin: 20,  anim: 'forehand' },
  chiquita: { depth: 3.2, t: 0.95, spin: -20, anim: 'forehand' },
  bandeja:  { depth: 7.8, t: 0.95, spin: -45, anim: 'overhead' },
  vibora:   { depth: 7.0, t: 0.75, spin: -60, side: 35, anim: 'overhead' },
  smash:    { depth: 6.5, t: 0.38, spin: 10,  anim: 'smash' },
  bajada:   { depth: 8.0, t: 0.50, spin: 40,  anim: 'smash' },      // aggressive smash from high back glass rebound
  contra:   { depth: 6.0, t: 1.4,  spin: 0,   anim: 'forehand' },   // contrapared: off your own back/side glass (falls back to a lob)
  rulo:     { depth: 4.8, t: 0.85, spin: -35, side: 40, anim: 'overhead' }, // hooked topspin/slice towards side mesh
};

export function newWorld(opts = {}) {
  const players = [0, 1, 2, 3].map(id => ({
    id, team: id < 2 ? 0 : 1, active: opts.players === 2 ? id % 2 === 0 : true,
    p: [0, 0], f: 0, swing: null, anim: 'idle', want: null, wantT: 0, energy: 1,
    stats: { speed: 6, power: 6, control: 6, volley: 6, smash: 6, stamina: 6, ...(opts.stats?.[id] || {}) },
    racket: { power: 6, control: 6, spin: 6, sweetSpot: 6, ...(opts.rackets?.[id] || {}) },
    shoes: { speed: 0, agility: 0, ...(opts.shoes?.[id] || {}) },
    hyd: 1, tireK: 1, bag: { ...(opts.bag?.[id] || DEFAULT_BAG) }, offer: null,  // tireK: fatigue factor (a banana lowers it)
    form: Math.max(-0.1, Math.min(0, +opts.form?.[id] || 0)),  // career form (0 sharp .. -0.10 rusty): slower and more errors
  }));
  const w = { t: 0, ballSpec: { speed: 1, bounce: 1, ...opts.ball }, ball: newBall(), match: newMatch({ players: opts.players || 4, ...opts.match }), players,
    state: 'serve', timer: 0, events: [], rally: 0, opts };
  resetPositions(w);
  return w;
}

function resetPositions(w) {
  const m = w.match, sid = serverId(m), [sx, sz] = servePosition(m), box = serviceBox(m);
  const singles = m.opts.players === 2;
  for (const pl of w.players) {
    const zs = pl.team === 0 ? 1 : -1;
    if (pl.id === sid) pl.p = [sx, sz];
    else if (pl.team === w.players[sid].team) pl.p = [-sx, zs * 3.5];                 // server's partner at net
    else {
      const receiver = singles || (pl.id % 2) === ((w.match.points[0] + w.match.points[1]) % 2 === 0 ? 0 : 1);
      pl.p = receiver ? [box.xSign * 2.6, zs * 9.3] : [-box.xSign * 2.4, zs * 8.2];
    }
    if (singles) pl.p[0] = pl.id === sid ? sx : box.xSign * 2.6;
    pl.f = pl.team === 0 ? Math.PI : 0; pl.swing = null; pl.want = null; pl.anim = 'idle';
  }
  const s = w.players[sid];
  w.ball = newBall();
  w.ball.bounce = w.ballSpec.bounce;
  w.ball.p = serveBall(s);
  w.state = 'serve'; w.timer = 0; w.rally = 0;
}

// server holds the ball up in front, on the court-centre side (right of them when serving from the left, and vice versa)
// 0.6 m in front so the dropped ball clears the front foot of the side-on stance
const serveBall = (s) => [s.p[0] - Math.sign(s.p[0]) * 0.35, 1.2, s.p[1] - Math.sign(s.p[1]) * 0.6];

const reachable = (pl, b) => b.live && b.p[1] > 0.22 && b.p[1] < MAX_HIT_H
  && Math.hypot(b.p[0] - pl.p[0], b.p[2] - pl.p[1]) < REACH * (1 - ENERGY.reach * (1 - pl.energy));  // tired arms reach less

function autoShot(w, pl) {
  const b = w.ball, nearNet = Math.abs(pl.p[1]) < 4.5, r = w.match.rally;
  if (b.p[1] > 1.9) {
    if (r?.bouncesSinceHit === 1 && Math.abs(pl.p[1]) > 6.0) return 'bajada';
    return nearNet ? 'smash' : 'bandeja';
  }
  if (r?.bouncesSinceHit === 0 && nearNet) return 'volley';
  return 'drive';
}

function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

function strike(w, pl, kind, aimX = 0) {
  const b = w.ball, s = SHOTS[kind === 'serve' && pl.want === 'slice' ? 'serveSlice' : kind];
  const dir = pl.team === 0 ? -1 : 1;               // team 0 hits toward -z
  const ctl = (pl.stats.control + pl.racket.control) / 20;
  const pow = (pl.stats.power + pl.racket.power) / 20;

  // racket sweet-spot and hit distance evaluation: optimal hit distance is ~0.85m
  const hitD = Math.hypot(b.p[0] - pl.p[0], b.p[2] - pl.p[1]);
  const sweet = (pl.racket.sweetSpot || 6) / 10;
  const sweetTol = 0.22 + sweet * 0.12;
  const dDiff = Math.abs(hitD - 0.85);
  let quality = 'good';
  if (dDiff < sweetTol && b.p[1] >= 0.55 && b.p[1] <= 2.2) quality = 'perfect';
  else if (hitD > 1.15) quality = 'late';
  else if (hitD < 0.55) quality = 'early';

  // career stats, centred on 6 (= no change): volley for balls taken before the bounce, smash for overheads,
  // stamina against the fatigue that sets in after 8 shots of a rally
  const overhead = ['smash', 'bandeja', 'vibora', 'bajada', 'rulo'].includes(kind);
  let statK = 1;
  if (w.match.rally.bouncesSinceHit === 0 && kind !== 'serve') statK *= 1 + (6 - pl.stats.volley) * 0.08;
  if (overhead) statK *= 1 + (6 - pl.stats.smash) * 0.08;
  statK *= Math.max(0.5, 1 + Math.max(0, w.rally - 8) * 0.02 * (6 - pl.stats.stamina));
  statK *= 1 + (1 - pl.energy) * ENERGY.miss;  // a tired player misses more
  statK *= 1 - pl.form;
  tire(w, pl, overhead ? ENERGY.smash : ENERGY.stroke);

  let depth = s.depth, t = s.t;
  if (overhead) t *= 1 + (6 - pl.stats.smash) * 0.03;
  if (kind === 'smash' || kind === 'bajada') t *= 1.25 - pow * 0.5;
  if (kind === 'drive') t *= 1.15 - pow * 0.3;
  if (quality === 'perfect') t *= 0.92;
  t /= w.ballSpec.speed;
  t *= 1 + (1 - pl.energy) * ENERGY.soft;  // and hits softer

  let err = (1 - ctl) * 1.4 * statK;
  if (quality === 'perfect') err *= 0.6;
  else if (quality !== 'good') err *= 1.35;

  let tx, tz;
  if (kind === 'serve') {
    const box = serviceBox(w.match);
    tx = box.xSign * (1.4 + aimX * 1.2) + gauss() * err * 0.5;
    tz = dir * (depth + gauss() * err * 0.5);
  } else {
    tx = Math.max(-4.6, Math.min(4.6, aimX * 3.8 + gauss() * err));
    tz = dir * Math.max(1, Math.min(9.7, depth + gauss() * err));
  }
  // unforced errors: chance grows with poor control, fast incoming ball, awkward height, stretch for the ball
  let mistake = null;
  if (kind === 'serve') {
    // first serve is riskier; second serve is played safe
    if (Math.random() < (1 - ctl) * (w.match.rally.fault ? 0.05 : 0.2)) mistake = Math.random() < 0.5 ? 'net' : 'long';
  } else {
    const inSpeed = Math.hypot(...b.v), reach = Math.hypot(b.p[0] - pl.p[0], b.p[2] - pl.p[1]) / REACH;
    const awkward = b.p[1] < 0.45 || (b.p[1] > 1.6 && !overhead) ? 0.06 : 0;
    const risky = { smash: 0.05, vibora: 0.04, chiquita: 0.03, bajada: 0.05, rulo: 0.04 }[kind] || 0;
    let pErr = ((1 - ctl) * 0.12 + Math.max(0, inSpeed - 14) * 0.006 + reach * reach * 0.05 + awkward + risky) * statK;
    if (quality === 'perfect') pErr *= 0.5;
    else if (quality !== 'good') pErr += 0.06;
    if (Math.random() < pErr) mistake = Math.random() < 0.5 ? 'net' : 'long';
  }
  if (mistake === 'long') tz = dir * (kind === 'serve' ? 7.2 + Math.random() * 0.8 : 10.6 + Math.random()); // past service line / into back glass
  if (mistake === 'net') t *= 0.55;                                       // flat and low into the net
  const spinMag = s.spin * (0.6 + pl.racket.spin / 15) * (quality === 'perfect' ? 1.15 : 1.0);
  const wv = [Math.sign(dir) * spinMag, (s.side || 0) * -dir, 0];
  b.w = wv;
  b.live = true;
  b.v = aimVelocity(b.p, [tx, tz], t, wv, mistake !== 'net');
  if (kind === 'contra') {  // aim left/right picks that side glass, centre the back glass
    const cv = contraVelocity(b.p, pl.team, Math.abs(aimX) > 0.3 ? Math.sign(aimX) : 0);
    if (cv) { b.v = cv.map(x => x + gauss() * err * 0.25); b.w = [0, 0, 0]; }
  }
  if (kind === 'serve') w.state = 'play';
  pl.swing = { kind, t: 0, anim: s.anim, backhand: (b.p[0] - pl.p[0]) * (pl.team === 0 ? -1 : 1) < 0 };
  pl.want = null;
  w.rally++;
  w.events.push({ type: 'hit', pid: pl.id, shot: kind, t: w.t, mistake, speed: Math.hypot(...b.v), quality, volley: w.match.rally.bouncesSinceHit === 0 && kind !== 'serve' });
  const r = onHit(w.match, pl.id);
  if (r?.point != null) endPoint(w, r);
  else if (r?.let) { w.events.push({ type: 'let', why: r.why, t: w.t }); w.state = 'dead'; w.timer = 1.0; }
}

function endPoint(w, r) {
  w.events.push({ type: 'point', team: r.point, why: r.why, rally: w.rally, t: w.t });
  const m = w.match, total = m.points[0] + m.points[1];
  if (m.winner == null && (r.changeEnds || (m.opts.pointsTo && total % 8 === 0))) {  // changeover: a rest, a drink, maybe food
    for (const pl of w.players) {
      if (!pl.active) continue;
      pl.energy = Math.min(1, pl.energy + ENERGY.drink);
      const drink = DRINKS.find(k => pl.bag[k] > 0), food = FOODS.find(k => pl.bag[k] > 0);
      if (drink) consume(w, pl, drink); else w.events.push({ type: 'nowater', pid: pl.id, t: w.t });
      if (food && pl.energy < 0.5) {
        pl.offer = { item: food, until: w.t + 6 };
        w.events.push({ type: 'offer', pid: pl.id, item: food, energy: pl.energy, t: w.t });
      }
    }
    w.events.push({ type: 'drink', t: w.t });
  }
  w.state = w.match.winner != null ? 'over' : 'dead';
  w.timer = 2.2;
}

// inputs[pid] = { move:[x,z] (world, |v|<=1), swing: null|'auto'|shot, aim: -1..1 }
export function stepWorld(w, inputs, dt) {
  w.t += dt;
  for (const pl of w.players) {
    if (!pl.active) continue;
    const inp = inputs[pl.id] || {};
    if (pl.offer) {  // one food per changeover, taken within the offer's seconds
      if (inp.eat && pl.bag[pl.offer.item] > 0) consume(w, pl, pl.offer.item);
      if (inp.eat || w.t > pl.offer.until) pl.offer = null;
    }
    if (pl.swing) { pl.swing.t += dt; if (pl.swing.t > 0.55) pl.swing = null; }
    // movement (server may shuffle within the serving zone before serving)
    const mv = inp.move || [0, 0];
    const len = Math.min(1, Math.hypot(mv[0], mv[1]));
    const dry = pl.hyd < HYDRATION.dry;
    if (w.state === 'play') pl.hyd = Math.max(0, pl.hyd - (HYDRATION.play + HYDRATION.run * len) * dt * (w.opts.outdoor ? HYDRATION.outdoor : 1));
    // feet planted while a stroke is pending or under way: aiming with the move keys must not walk you off the ball
    // (agile shoes keep a little more footwork during the stroke)
    const spd = SPEED * (0.75 + pl.stats.speed / 24) * (1 + pl.shoes.speed) * (1 - ENERGY.slow * (1 - pl.energy)) * (1 + pl.form / 2) * (dry ? 1 - HYDRATION.drySlow : 1) * (pl.swing || pl.want ? 0.35 + pl.shoes.agility : 1);
    const tossing = w.state === 'toss' && pl.id === serverId(w.match);
    if (len > 0.05 && !tossing) {
      pl.p[0] += mv[0] / Math.hypot(...mv) * len * spd * dt;
      pl.p[1] += mv[1] / Math.hypot(...mv) * len * spd * dt;
      pl.anim = len > 0.6 ? 'run' : 'walk';
      if (w.state === 'play') tire(w, pl, ENERGY.run * len * dt);
    } else pl.anim = 'idle';
    if (w.state !== 'play') pl.energy = Math.min(1, pl.energy + ENERGY.rest * dt * pl.stats.stamina / 6 * (dry ? HYDRATION.dryRest : 1));  // breathe between points
    const zs = pl.team === 0 ? 1 : -1;
    pl.p[0] = Math.max(-4.8, Math.min(4.8, pl.p[0]));
    pl.p[1] = zs * Math.max(0.4, Math.min(9.8, pl.p[1] * zs));
    if (w.state === 'serve' && pl.id === serverId(w.match)) {  // behind the service line, in own half
      const xs = Math.sign(servePosition(w.match)[0]);
      pl.p[0] = xs * Math.max(0.3, Math.min(4.6, pl.p[0] * xs));
      pl.p[1] = zs * Math.max(7.3, pl.p[1] * zs);
    }
    // face the ball
    const b = w.ball;
    if (w.state !== 'serve' && !tossing) pl.f = Math.atan2(b.p[0] - pl.p[0], b.p[2] - pl.p[1]);
    if (inp.swing) { pl.want = inp.swing; pl.wantT = 0.3; pl.aim = inp.aim || 0; }
    else if (pl.want && inp.aim) { pl.aim = inp.aim; }
    if (pl.want) pl.wantT -= dt;
    if (pl.wantT <= 0) pl.want = null;
  }

  if (w.state === 'serve') {
    const s = w.players[serverId(w.match)];
    w.ball.p = serveBall(s);
    s.anim = 'serveReady';
    if (s.want) {  // let go of the ball: a padel serve is struck after it bounces, below the waist
      w.state = 'toss'; w.toss = { want: s.want, aim: s.aim || inputs[s.id]?.aim || 0, bounced: false, t: 0 };
      Object.assign(w.ball, { v: [0, 0, 0], w: [0, 0, 0], live: true });
      s.want = null; s.anim = 'serveToss';
    }
    return w;
  }
  if (w.state === 'toss') {
    const s = w.players[serverId(w.match)], b = w.ball, vy = b.v[1], tz = w.toss;
    s.anim = 'serveToss'; s.want = null;
    stepBall(b, dt);  // contact events ignored: the dropped ball is not in play yet
    tz.t += dt;
    if (vy < 0 && b.v[1] > 0) tz.bounced = true;
    if ((tz.bounced && b.v[1] <= 0.3) || tz.t > 2) {  // strike near the top of the bounce
      s.want = tz.want; w.toss = null;
      strike(w, s, 'serve', tz.aim);
    }
    return w;
  }
  if (w.state === 'dead' || w.state === 'over') {
    w.timer -= dt;
    if (w.timer <= 0 && w.state === 'dead') resetPositions(w);
    stepBallEvents(w, dt);
    return w;
  }
  // hits: anyone wanting to swing with ball in reach and on their side (or crossing)
  const b = w.ball;
  for (const pl of w.players) {
    if (!pl.active) continue;
    // swing at the ball's closest approach, not the first frame it enters reach (edge-of-reach hits err more)
    const d = Math.hypot(b.p[0] - pl.p[0], b.p[2] - pl.p[1]), closing = d < (pl.lastD ?? Infinity) - 1e-4;
    pl.lastD = d;
    if (!pl.want || pl.swing) continue;
    const onSide = (pl.team === 0 ? b.p[2] > -0.3 : b.p[2] < 0.3);
    const r = w.match.rally;
    const notMine = r.bouncesSinceHit === 0 && (r.lastHitTeam === pl.team || r.phase === 'serveFlight'); // never volley the serve
    const now = d < 0.8 || !closing || pl.wantT < 0.05 || (b.v[1] < 0 && b.p[1] < 0.45);
    if (onSide && !notMine && reachable(pl, b) && now) strike(w, pl, SHOTS[pl.want] ? pl.want : autoShot(w, pl), pl.aim || inputs[pl.id]?.aim || 0);
  }
  stepBallEvents(w, dt);
  return w;
}

function stepBallEvents(w, dt) {
  const n = 4;
  for (let i = 0; i < n; i++) {
    for (const e of stepBall(w.ball, dt / n)) {
      w.events.push({ type: 'contact', kind: e.kind, p: e.p, t: w.t });
      if (w.state !== 'play') continue;
      const r = onContact(w.match, e);
      if (r?.point != null) endPoint(w, r);
      else if (r?.fault || r?.let) { w.events.push({ type: r.let ? 'let' : 'fault', why: r.why, t: w.t }); w.state = 'dead'; w.timer = 1.0; }
    }
  }
  if (w.state === 'play' && !w.ball.live) { const r = onContact(w.match, { kind: 'out', side: w.ball.p[2] > 0 ? 0 : 1, p: w.ball.p }); if (r?.point != null) endPoint(w, r); }
}

// Compact state for network + replay
export function snapshot(w) {
  return {
    t: w.t, s: w.state,
    b: [...w.ball.p],
    pl: w.players.map(p => [p.p[0], p.p[1], p.f, p.anim, p.swing ? p.swing.anim : 0, p.swing ? p.swing.t : 0, p.swing?.backhand ? 1 : 0, Math.round(p.energy * 100) / 100, Math.round(p.hyd * 100) / 100]),
  };
}

export { predict };
