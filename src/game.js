// Shared match simulation (client offline + authoritative server). No rendering here.
import { newBall, stepBall, aimVelocity, predict } from './physics.js';
import { newMatch, onHit, onContact, servePosition, serviceBox, serverId } from './rules.js';

export const REACH = 1.35, MAX_HIT_H = 2.9, SPEED = 5.2;

// depth = metres from net on opponent side, t = flight time to first bounce, spin = topspin(+)/slice(-) rad/s
export const SHOTS = {
  serve:    { depth: 5.6, t: 0.85, spin: -25, anim: 'serve' },
  drive:    { depth: 7.4, t: 0.75, spin: 45,  anim: 'forehand' },
  volley:   { depth: 6.2, t: 0.6,  spin: -30, anim: 'volley' },
  lob:      { depth: 9.0, t: 1.75, spin: 20,  anim: 'forehand' },
  chiquita: { depth: 3.2, t: 0.95, spin: -20, anim: 'forehand' },
  bandeja:  { depth: 7.8, t: 0.95, spin: -45, anim: 'overhead' },
  vibora:   { depth: 7.0, t: 0.75, spin: -60, side: 35, anim: 'overhead' },
  smash:    { depth: 6.5, t: 0.38, spin: 10,  anim: 'smash' },
};

export function newWorld(opts = {}) {
  const players = [0, 1, 2, 3].map(id => ({
    id, team: id < 2 ? 0 : 1, active: opts.players === 2 ? id % 2 === 0 : true,
    p: [0, 0], f: 0, swing: null, anim: 'idle', want: null, wantT: 0,
    stats: { speed: 6, power: 6, control: 6, volley: 6, smash: 6, ...(opts.stats?.[id] || {}) },
    racket: { power: 6, control: 6, spin: 6, sweetSpot: 6, ...(opts.rackets?.[id] || {}) },
  }));
  const w = { t: 0, ball: newBall(), match: newMatch({ players: opts.players || 4, ...opts.match }), players,
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
  w.ball.p = [s.p[0] + 0.35, 1.0, s.p[1]];
  w.state = 'serve'; w.timer = 0; w.rally = 0;
}

const reachable = (pl, b) => b.live && b.p[1] > 0.22 && b.p[1] < MAX_HIT_H && Math.hypot(b.p[0] - pl.p[0], b.p[2] - pl.p[1]) < REACH;

function autoShot(w, pl) {
  const b = w.ball, nearNet = Math.abs(pl.p[1]) < 4.5;
  if (b.p[1] > 1.9) return nearNet ? 'smash' : 'bandeja';
  if (w.match.rally.bouncesSinceHit === 0 && nearNet) return 'volley';
  return 'drive';
}

function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

function strike(w, pl, kind, aimX = 0) {
  const b = w.ball, s = SHOTS[kind];
  const dir = pl.team === 0 ? -1 : 1;               // team 0 hits toward -z
  const ctl = (pl.stats.control + pl.racket.control) / 20;
  const pow = (pl.stats.power + pl.racket.power) / 20;
  let depth = s.depth, t = s.t;
  if (kind === 'smash') t *= 1.25 - pow * 0.5;
  if (kind === 'drive') t *= 1.15 - pow * 0.3;
  const err = (1 - ctl) * 1.4;
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
    const awkward = b.p[1] < 0.45 || (b.p[1] > 1.6 && !['smash', 'bandeja', 'vibora'].includes(kind)) ? 0.06 : 0;
    const risky = { smash: 0.05, vibora: 0.04, chiquita: 0.03 }[kind] || 0;
    const pErr = (1 - ctl) * 0.12 + Math.max(0, inSpeed - 14) * 0.006 + reach * reach * 0.05 + awkward + risky;
    if (Math.random() < pErr) mistake = Math.random() < 0.5 ? 'net' : 'long';
  }
  if (mistake === 'long') tz = dir * (kind === 'serve' ? 7.2 + Math.random() * 0.8 : 10.6 + Math.random()); // past service line / into back glass
  if (mistake === 'net') t *= 0.55;                                       // flat and low into the net
  const spinMag = s.spin * (0.6 + pl.racket.spin / 15);
  const wv = [Math.sign(dir) * spinMag, (s.side || 0) * -dir, 0];
  b.w = wv;
  b.live = true;
  b.v = aimVelocity(b.p, [tx, tz], t, wv, mistake !== 'net');
  if (kind === 'serve') w.state = 'play';
  pl.swing = { kind, t: 0, anim: s.anim, backhand: (b.p[0] - pl.p[0]) * (pl.team === 0 ? -1 : 1) < 0 };
  pl.want = null;
  w.rally++;
  w.events.push({ type: 'hit', pid: pl.id, shot: kind, t: w.t, mistake });
  const r = onHit(w.match, pl.id);
  if (r?.point != null) endPoint(w, r);
  else if (r?.let) { w.events.push({ type: 'let', why: r.why, t: w.t }); w.state = 'dead'; w.timer = 1.0; }
}

function endPoint(w, r) {
  w.events.push({ type: 'point', team: r.point, why: r.why, rally: w.rally, t: w.t });
  w.state = w.match.winner != null ? 'over' : 'dead';
  w.timer = 2.2;
}

// inputs[pid] = { move:[x,z] (world, |v|<=1), swing: null|'auto'|shot, aim: -1..1 }
export function stepWorld(w, inputs, dt) {
  w.t += dt;
  for (const pl of w.players) {
    if (!pl.active) continue;
    const inp = inputs[pl.id] || {};
    if (pl.swing) { pl.swing.t += dt; if (pl.swing.t > 0.55) pl.swing = null; }
    // movement (server stands still until serving)
    const mv = inp.move || [0, 0];
    const len = Math.min(1, Math.hypot(mv[0], mv[1]));
    const spd = SPEED * (0.75 + pl.stats.speed / 24) * (pl.swing ? 0.35 : 1);
    if (!(w.state === 'serve' && pl.id === serverId(w.match)) && len > 0.05) {
      pl.p[0] += mv[0] / Math.hypot(...mv) * len * spd * dt;
      pl.p[1] += mv[1] / Math.hypot(...mv) * len * spd * dt;
      pl.anim = len > 0.6 ? 'run' : 'walk';
    } else pl.anim = 'idle';
    const zs = pl.team === 0 ? 1 : -1;
    pl.p[0] = Math.max(-4.8, Math.min(4.8, pl.p[0]));
    pl.p[1] = zs * Math.max(0.4, Math.min(9.8, pl.p[1] * zs));
    // face the ball
    const b = w.ball;
    if (w.state !== 'serve') pl.f = Math.atan2(b.p[0] - pl.p[0], b.p[2] - pl.p[1]);
    if (inp.swing) { pl.want = inp.swing; pl.wantT = 0.3; pl.aim = inp.aim || 0; }
    if (pl.want) pl.wantT -= dt;
    if (pl.wantT <= 0) pl.want = null;
  }

  if (w.state === 'serve') {
    const s = w.players[serverId(w.match)];
    w.ball.p = [s.p[0] + (s.team === 0 ? -0.35 : 0.35), 0.75, s.p[1]];
    if (s.want) strike(w, s, 'serve', s.aim);
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
    if (onSide && !notMine && reachable(pl, b) && now) strike(w, pl, pl.want === 'auto' ? autoShot(w, pl) : pl.want, pl.aim);
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
    pl: w.players.map(p => [p.p[0], p.p[1], p.f, p.anim, p.swing ? p.swing.anim : 0, p.swing ? p.swing.t : 0, p.swing?.backhand ? 1 : 0]),
  };
}

export { predict };
