// Padel AI: produces the same input shape stepWorld consumes: { move:[x,z], swing, aim }.
// Plain heuristics on top of physics.predict(): find where the ball is hittable (incl. glass rebounds),
// one teammate takes it, the other holds formation; shot choice and aim follow padel tactics.
// ponytail: per-world state in a WeakMap (server may run many matches); heuristics only, no search/learning.
import { predict, REACH, SPEED } from './game.js';
import { serverId, receiverId, serviceBox } from './rules.js';

const LV = {
  //          reaction s, pos error m, decision quality, aim noise, smash prob, unforced-error (skipped ball) prob
  rookie: { react: 0.40, pos: 0.80, q: 0.45, aim: 0.45, smash: 0.15, miss: 0.12, serve: [1.0, 2.2] },
  club:   { react: 0.26, pos: 0.45, q: 0.70, aim: 0.25, smash: 0.35, miss: 0.10, serve: [0.8, 1.6] },
  pro:    { react: 0.15, pos: 0.22, q: 0.90, aim: 0.12, smash: 0.60, miss: 0.05, serve: [0.6, 1.2] },
  legend: { react: 0.07, pos: 0.08, q: 0.98, aim: 0.05, smash: 0.85, miss: 0.02, serve: [0.5, 1.0] },
};
const Z_NET = 3.5, Z_BACK = 8.5, X_SPLIT = 2.5, MAX_H = 2.9;

const rnd = Math.random;
const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const worlds = new WeakMap();
function wstate(w) {
  let s = worlds.get(w);
  if (!s) {
    s = { pl: new Map(), id: 0, pred: null, an: [null, null],
      team: [0, 1].map(() => ({ posture: 'back', seen: -1, taker: null, side: {} })) };
    worlds.set(w, s);
  }
  return s;
}
function pstate(s, pid) {
  let p = s.pl.get(pid);
  if (!p) s.pl.set(pid, p = { serveAt: null, reactUntil: 0, seen: -1, off: [0, 0], move: [0, 0], miss: false });
  return p;
}

function refreshPred(w, s) {
  const p = s.pred;
  if (p && p.rally === w.rally && p.state === w.state && w.t - p.t < 0.1) return p;
  return s.pred = { id: ++s.id, t: w.t, rally: w.rally, state: w.state, ...predict(w.ball, 2.5) };
}

// Where (and when) the ball becomes hittable on team T's side, plus who should take it.
function analyze(w, s, T) {
  const pr = refreshPred(w, s);
  if (s.an[T]?.pid === pr.id) return s.an[T];
  const an = s.an[T] = { pid: pr.id, t: pr.t, incoming: false, cands: [], lob: false, firstFloorZ: null, taker: null, sel: {} };
  const r = w.match.rally, zs = T === 0 ? 1 : -1;
  if (w.state !== 'play' || !w.ball.live || r.lastHitTeam !== 1 - T) return an;
  an.incoming = true;
  const floors = pr.contacts.filter(c => c.kind === 'floor' && c.side === T);
  if (floors.length) an.firstFloorZ = Math.abs(floors[0].p[2]);
  const base = r.bouncesSinceHit;
  let prevY = w.ball.p[1], fi = 0;
  for (let i = 0; i < pr.pts.length; i += 2) {
    const { t, p } = pr.pts[i];
    while (fi < floors.length && floors[fi].t < t) fi++;
    const b = base + fi, y = p[1], desc = y < prevY;
    prevY = y;
    if (b > 1) break;                                   // second bounce on our side = point lost
    if (zs * p[2] < 0.1 || Math.abs(p[0]) > 4.9) continue;
    if (b === 0 && y > 2.6) an.lob = true;
    if (y < 0.3 || y > MAX_H) continue;
    if (b === 0 && r.phase === 'serveFlight') continue; // never volley the serve
    an.cands.push({ t, x: p[0], y, z: p[2], b, desc });
  }
  // each teammate picks an intercept; cheapest one (with hysteresis + side preference) takes the ball
  const tm = s.team[T];
  let best = Infinity;
  for (const pl of w.players) {
    if (pl.team !== T || !pl.active) continue;
    if (r.phase === 'serveFlight' && pl.id !== receiverId(w.match)) continue;  // the serve is the receiver's alone
    const sel = an.sel[pl.id] = select(an, pl);
    let cost;
    if (sel) {
      cost = Math.hypot(sel.c.x - pl.p[0], sel.c.z - pl.p[1]) + (sel.ok ? 0 : 30);
      if (Math.abs(sel.c.x) > 0.5 && tm.side[pl.id] && Math.sign(sel.c.x) !== tm.side[pl.id]) cost += 0.8;
    } else cost = 20 + Math.hypot(w.ball.p[0] - pl.p[0], w.ball.p[2] - pl.p[1]);
    if (tm.taker === pl.id) cost -= 0.6;
    if (cost < best) { best = cost; an.taker = pl.id; }
  }
  tm.taker = an.taker;
  return an;
}

// first reachable "good" intercept (low-ish descending after the bounce / any volley height), else last reachable
function select(an, pl) {
  const spd = SPEED * (0.75 + pl.stats.speed / 24) * 0.85, atNet = Math.abs(pl.p[1]) < 4.8;
  const isDeepLob = an.lob && (an.firstFloorZ == null || an.firstFloorZ >= 7.0);
  let fb = null, last = null;
  for (const c of an.cands) {
    // If incoming ball is a deep lob, don't try to volley it in the air beyond 4.2m; retreat and let it bounce!
    if (c.b === 0 && (isDeepLob ? Math.abs(c.z) > 4.2 : !((atNet || c.y > 1.9) && Math.abs(c.z) < 6.5))) continue;
    last = c;
    const need = Math.max(0, Math.hypot(c.x - pl.p[0], c.z - pl.p[1]) - 1.0) / spd;
    if (c.t - need < 0.03) continue;
    fb = c;
    if (c.b === 0 ? c.y >= 0.55 : (c.desc && c.y >= 0.5 && c.y <= 1.5)) return { c, ok: true };
  }
  return fb ? { c: fb, ok: true } : last ? { c: last, ok: false } : null;
}

function formation(w, s, pl) {
  const T = pl.team, zs = T === 0 ? 1 : -1, tm = s.team[T], net = tm.posture === 'net', bx = w.ball.p[0];
  if (w.match.opts.players === 2) return [clamp(bx * 0.4, -2.5, 2.5), zs * (net ? 4.5 : 7.8)];
  const side = tm.side[pl.id] || (pl.p[0] >= 0 ? 1 : -1);
  const partner = w.players.find(p => p.team === T && p.id !== pl.id && p.active);
  // tandem coverage: if partner steps wide to hit, shift slightly to cover the center channel
  let shiftX = 0;
  if (partner && tm.taker === partner.id && Math.abs(partner.p[0]) > 2.0) {
    shiftX = -Math.sign(partner.p[0]) * 0.8;
  }
  const partnerZ = partner ? Math.abs(partner.p[1]) : (net ? Z_NET : Z_BACK);
  const targetZ = net ? Math.min(Z_NET + 0.4, partnerZ + 0.6) : Math.max(Z_BACK - 0.4, partnerZ - 0.6);
  return [side * X_SPLIT + clamp(bx * 0.25, -1.2, 1.2) + shiftX, zs * targetZ];
}

function chooseShot(w, pl, L, an) {
  const y = w.ball.p[1], r = w.match.rally, pre = r?.bouncesSinceHit === 0, my = Math.abs(pl.p[1]);
  const opps = w.players.filter(p => p.team !== pl.team && p.active);
  const atNet = opps.filter(p => Math.abs(p.p[1]) < 5).length, good = rnd() < L.q;

  // back glass high rebound: aggressive bajada de pared
  if (my > 6.0 && r?.bouncesSinceHit === 1 && y > 1.7 && good) {
    return rnd() < 0.65 ? 'bajada' : 'bandeja';
  }

  if (y > 1.9 && (pre || y > 2.2)) {                                   // overhead zone
    // Smashes require being well forward at the net (my < 4.2). If pushed back or dealing with a deep lob,
    // hit a defensive bandeja or lob instead of an aggressive kill smash.
    const isDeepLob = an?.lob && (an?.firstFloorZ >= 6.8 || my > 4.2);
    if (my < 4.2 && !isDeepLob) {
      if (good && rnd() < 0.25) return 'rulo';                          // spiral hook toward side wall mesh
      return rnd() < L.smash ? 'smash' : (good && rnd() < 0.5 ? 'vibora' : 'bandeja');
    }
    return good ? 'bandeja' : 'lob';
  }
  if (my < 4.8) {                                                      // at the net
    if (atNet === 0 && y < 1.3 && good && rnd() < 0.55) return 'chiquita'; // drop at their feet
    if (good && rnd() < 0.2) return 'rulo';
    return pre ? 'volley' : 'drive';
  }
  if (atNet > 0 && good && rnd() < 0.75) return 'lob';                 // over the net pair
  if (good && rnd() < 0.08) return 'lob';                              // variation
  return 'drive';
}

// aim: world x = aim*3.8. Pick the gap furthest from opponents (middle is usually best), with level noise.
function aimFor(w, pl, L) {
  const opps = w.players.filter(p => p.team !== pl.team && p.active);
  let best = 0, bs = -Infinity;
  for (let a = -0.9; a <= 0.91; a += 0.3) {
    const tx = a * 3.8;
    // distance to nearest opponent
    let sc = Math.min(...opps.map(o => Math.abs(tx - o.p[0]))) - (Math.abs(tx) > 3.2 ? 0.6 : 0) + rnd() * 0.3;
    // bonus for drilling the middle gap between opponents in doubles
    if (opps.length > 1 && Math.abs(tx) < 1.0) sc += 0.45;
    if (sc > bs) { bs = sc; best = a; }
  }
  if (rnd() > L.q) best = rnd() * 1.6 - 0.8;
  return clamp(best + gauss() * L.aim, -1, 1);
}

function moveTo(pl, x, z) {
  const dx = x - pl.p[0], dz = z - pl.p[1], d = Math.hypot(dx, dz);
  if (d < 0.15) return [0, 0];
  const m = Math.min(1, (d - 0.15) / 0.5);
  return [dx / d * m, dz / d * m];
}

export function aiInput(w, pid, level = 'club') {
  const pl = w.players[pid];
  const out = { move: [0, 0], swing: null, aim: 0, eat: !!pl?.offer };  // AI always takes the food it is offered
  if (!pl?.active) return out;
  const L = LV[level] || LV.club, s = wstate(w), st = pstate(s, pid), T = pl.team, tm = s.team[T];
  const zs = T === 0 ? 1 : -1, m = w.match, r = m.rally;

  if (w.state === 'serve') {
    // assign left/right once per point, reset posture, then serve after a short random delay
    const mates = w.players.filter(p => p.team === T && p.active).sort((a, b) => a.p[0] - b.p[0] || a.id - b.id);
    mates.forEach((p, i) => { tm.side[p.id] = mates.length === 1 ? 0 : i === 0 ? -1 : 1; });
    const srv = w.players[serverId(m)];
    tm.posture = srv.team === T && L.q >= 0.85 ? 'net' : 'back';
    tm.taker = null; st.seen = tm.seen = -1;
    if (pid !== srv.id) return out;
    if (st.serveAt == null) st.serveAt = w.t + L.serve[0] + rnd() * (L.serve[1] - L.serve[0]);
    if (w.t >= st.serveAt) {
      out.swing = rnd() < 0.3 ? 'slice' : 'serve';
      // +1 = wide, -0.5 = toward the T; serve aim is world x, so flip it for the box on the -x side
      out.aim = serviceBox(m).xSign * clamp((L.q >= 0.85 ? (rnd() < 0.5 ? 0.9 : -0.4) : rnd() * 1.2 - 0.4) + gauss() * L.aim * 0.3, -0.5, 1);
    }
    return out;
  }
  st.serveAt = null;
  if (w.state !== 'play') { st.move = out.move; return out; }

  const an = analyze(w, s, T), b = w.ball;
  if (st.seen !== w.rally) {                         // new hit: opponent's ball -> reaction delay + fresh positioning error
    st.seen = w.rally;
    if (r.lastHitTeam !== T) { st.reactUntil = w.t + L.react * (0.7 + 0.6 * rnd()); st.off = [gauss() * L.pos, gauss() * L.pos]; st.miss = rnd() < L.miss; }
  }
  if (tm.seen !== w.rally) {                         // team posture: retreat on lobs, go forward on short balls
    tm.seen = w.rally;
    if (an.incoming) {
      if (an.lob) { if (rnd() < Math.min(1, L.q + 0.1)) tm.posture = 'back'; }
      else if (an.firstFloorZ != null && an.firstFloorZ < 5 && rnd() < L.q * 0.8) tm.posture = 'net';
    }
  }
  if (w.t < st.reactUntil) { out.move = st.move; return out; }

  let tgt;
  if (an.incoming && an.taker === pid) {
    const sel = an.sel[pid], waitT = sel ? an.t + sel.c.t - w.t : 0;
    if (sel) { const k = waitT > 0.35 ? 1 : 0.5; tgt = [sel.c.x + st.off[0] * k, sel.c.z + st.off[1] * k]; }
    else tgt = [b.p[0], b.p[2]];
    const d = Math.hypot(b.p[0] - pl.p[0], b.p[2] - pl.p[1]);
    if (d < 1.3 && d < REACH && b.p[1] > 0.25 && b.p[1] < MAX_H && zs * b.p[2] > -0.3 && !pl.swing && waitT < 0.3 && !st.miss
        && !(r.phase === 'serveFlight' && r.bouncesSinceHit === 0)) {
      out.swing = chooseShot(w, pl, L, an);
      out.aim = aimFor(w, pl, L);
      // ball got past them, deep and low: save it with a contrapared off their own back or nearest side glass
      if (zs * b.p[2] > 8.6 && b.p[1] < 1.1 && r.bouncesSinceHit === 1 && rnd() < 0.12) {  // rare, like real padel
        out.swing = 'contra'; out.aim = rnd() < 0.5 ? 0 : Math.sign(pl.p[0] || 1) * 0.8;
      }
      if (rnd() < L.q) tm.posture = out.swing === 'drive' && Math.abs(pl.p[1]) > 5 ? 'back' : 'net';
    }
  } else tgt = formation(w, s, pl);

  out.move = moveTo(pl, clamp(tgt[0], -4.8, 4.8), zs * clamp(tgt[1] * zs, 0.4, 9.8));
  st.move = out.move;
  return out;
}
