// Shared ball physics (client + server). Coordinates: x across (±5), z along (±10), y up. Net at z=0.
// Team 0 defends z>0, team 1 defends z<0.
// ponytail: constants from FIP court specs + real ball aerodynamics; tune against docs/re-findings.md once rea data lands.

export const COURT = { halfW: 5, halfL: 10, netH: 0.88, serviceLine: 6.95, backGlassH: 3, backMeshH: 4 };
// side-wall door openings, flanking the net on both side walls (FIP: 0.72–1.05 m wide, ≥2 m high)
export const DOOR = { z0: 0.08, z1: 1.08, h: 2.2 };
export const BALL_R = 0.033;

export const K = {
  g: 9.81,
  drag: 0.0195,          // 0.5*rho*Cd*A/m
  magnus: 0.00045,       // lift per (rad/s * m/s)
  floor: { e: 0.77, f: 0.62, grip: 0.3 },   // artificial turf: vertical restitution (calibrated to FIP 1.35-1.45m bounce from 2.54m), horizontal retention
  glass: { e: 0.72, f: 0.85, grip: 0.22 },
  mesh:  { e: 0.35, f: 0.5, grip: 0.4 },
  spinDecay: 0.6,        // per second
};

// Side wall layout (per half): glass 3m high for 8<|z|<10, glass 2m for 6<|z|<8, mesh 3m for the rest.
export function wallAt(x, z) {
  const az = Math.abs(z);
  if (Math.abs(x) >= COURT.halfW) {
    if (az > 8) return { kind: 'glass', h: 3, meshH: 4 };
    if (az > 6) return { kind: 'glass', h: 2, meshH: 3 };
    return { kind: 'mesh', h: 3, door: az >= DOOR.z0 && az <= DOOR.z1 ? DOOR.h : 0 };
  }
  if (az >= COURT.halfL) return { kind: 'glass', h: COURT.backGlassH, meshH: COURT.backMeshH };
  return null;
}

export function newBall() {
  return { p: [0, 1, 0], v: [0, 0, 0], w: [0, 0, 0], live: false };
}

function spinKick(b, axis, kind) {
  const s = K[kind];
  if (!s || !s.grip) return;
  const k = s.grip;
  const R = BALL_R;
  if (axis === 1) { // floor
    b.v[0] += b.w[2] * R * -k;
    b.v[2] += b.w[0] * R * k;
    b.w[0] *= (1 - k);
    b.w[2] *= (1 - k);
  } else if (axis === 2) { // back wall (z)
    const sz = Math.sign(b.p[2]);
    b.v[0] += -b.w[1] * sz * R * k;
    b.v[1] += b.w[0] * sz * R * k;
    b.w[0] *= (1 - k);
    b.w[1] *= (1 - k);
  } else if (axis === 0) { // side wall (x)
    const sx = Math.sign(b.p[0]);
    b.v[1] += -b.w[2] * sx * R * k;
    b.v[2] += b.w[1] * sx * R * k;
    b.w[1] *= (1 - k);
    b.w[2] *= (1 - k);
  }
}

// Advance ball by dt; returns array of contact events {kind:'floor'|'glass'|'mesh'|'net'|'out', side:0|1, p}
export function stepBall(b, dt) {
  const ev = [];
  if (!b.live) return ev;
  const [vx, vy, vz] = b.v, [wx, wy, wz] = b.w;
  const sp = Math.hypot(vx, vy, vz);
  const ax = -K.drag * sp * vx + K.magnus * (wy * vz - wz * vy);
  const ay = -K.g - K.drag * sp * vy + K.magnus * (wz * vx - wx * vz);
  const az = -K.drag * sp * vz + K.magnus * (wx * vy - wy * vx);
  b.v[0] += ax * dt; b.v[1] += ay * dt; b.v[2] += az * dt;
  const prevZ = b.p[2];
  b.p[0] += b.v[0] * dt; b.p[1] += b.v[1] * dt; b.p[2] += b.v[2] * dt;
  const decay = Math.exp(-K.spinDecay * dt);
  b.w[0] *= decay; b.w[1] *= decay; b.w[2] *= decay;
  const side = b.p[2] > 0 ? 0 : 1;

  // net
  if (Math.sign(prevZ) !== Math.sign(b.p[2]) && b.p[1] < COURT.netH + BALL_R && Math.abs(b.p[0]) < COURT.halfW) {
    b.p[2] = Math.sign(prevZ) * BALL_R; b.v[2] *= -0.2; b.v[0] *= 0.3;
    ev.push({ kind: 'net', side: prevZ > 0 ? 0 : 1, p: [...b.p] });
  }
  // floor
  if (b.p[1] < BALL_R) {
    b.p[1] = BALL_R;
    const s = K.floor;
    const vIn = Math.abs(b.v[1]);
    b.v[1] = vIn * s.e * (b.bounce ?? 1);  // b.bounce: livelier match balls (career shop)
    b.v[0] *= s.f;
    b.v[2] *= s.f;
    spinKick(b, 1, 'floor');
    if (vIn < 0.4) b.v[1] = 0; // rolling: no more bounce events
    else ev.push({ kind: 'floor', side, p: [...b.p] });
  }
  // walls (back then side)
  const lim = [COURT.halfW - BALL_R, COURT.halfL - BALL_R];
  for (const axis of [2, 0]) {
    const i = axis === 2 ? 1 : 0;
    if (Math.abs(b.p[axis]) <= lim[i] || b.v[axis] * b.p[axis] <= 0) continue;
    const w = wallAt(axis === 0 ? Math.sign(b.p[0]) * COURT.halfW : b.p[0], axis === 2 ? Math.sign(b.p[2]) * COURT.halfL : b.p[2]);
    let kind = w.kind;
    // leaves the court through a door gap or over the top of the wall
    if (b.p[1] < w.door || (b.p[1] > w.h && !(b.p[1] <= w.meshH))) { b.live = false; ev.push({ kind: 'out', side, p: [...b.p] }); return ev; }
    if (b.p[1] > w.h) kind = 'mesh';
    const s = K[kind];
    b.p[axis] = Math.sign(b.p[axis]) * lim[i];
    b.v[axis] *= -s.e * (kind === 'glass' ? b.bounce ?? 1 : 1);
    for (const o of [0, 1, 2]) if (o !== axis) b.v[o] *= s.f;
    spinKick(b, axis, kind);
    if (kind === 'mesh') { b.v[0] += (Math.random() - 0.5) * 0.6; b.v[1] += (Math.random() - 0.5) * 0.4; }
    ev.push({ kind, side, p: [...b.p] });
  }
  return ev;
}

// Velocity that lands ball at target [x,z] from p after ~flightT seconds (spin w), corrected by shooting.
export function aimVelocity(p, target, flightT, w = [0, 0, 0], clearNet = false) {
  let curT = flightT;
  const maxAttempts = clearNet ? 6 : 1;
  const v0 = (t, ft) => [(t[0] - p[0]) / ft, (BALL_R - p[1] + 0.5 * K.g * ft * ft) / ft, (t[1] - p[2]) / ft];
  let v = v0(target, curT);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let aim = [...target];
    v = v0(aim, curT);
    let netCleared = true;
    for (let i = 0; i < 4; i++) {
      const c = { p: [...p], v: [...v], w: [...w] };
      netCleared = true;
      for (let t = 0; t < curT * 3 && !(c.p[1] <= BALL_R + 0.002 && c.v[1] < 0); t += 1 / 120) {
        const prevZ = c.p[2];
        const sp = Math.hypot(...c.v);
        c.v[0] += (-K.drag * sp * c.v[0] + K.magnus * (c.w[1] * c.v[2] - c.w[2] * c.v[1])) / 120;
        c.v[1] += (-K.g - K.drag * sp * c.v[1] + K.magnus * (c.w[2] * c.v[0] - c.w[0] * c.v[2])) / 120;
        c.v[2] += (-K.drag * sp * c.v[2] + K.magnus * (c.w[0] * c.v[1] - c.w[1] * c.v[0])) / 120;
        for (const k of [0, 1, 2]) c.p[k] += c.v[k] / 120;
        if (Math.sign(prevZ) !== Math.sign(c.p[2]) && c.p[1] < COURT.netH + BALL_R && Math.abs(c.p[0]) < COURT.halfW) {
          netCleared = false;
        }
      }
      aim = [aim[0] + target[0] - c.p[0], aim[1] + target[1] - c.p[2]];
      v = v0(aim, curT);
    }
    if (!clearNet || netCleared) break;
    curT *= 1.18;
  }
  return v;
}

// Predict ball path: returns array of {t,p:[..]} samples and first contacts; used by AI and aim assist.
export function predict(b, seconds, dt = 1 / 120) {
  const c = { p: [...b.p], v: [...b.v], w: [...b.w], live: b.live };
  const pts = [], contacts = [];
  for (let t = 0; t < seconds && c.live; t += dt) {
    for (const e of stepBall(c, dt)) contacts.push({ ...e, t });
    pts.push({ t, p: [...c.p] });
  }
  return { pts, contacts };
}

// Contrapared: a velocity that sends the ball into the hitter's OWN glass — back wall (wall 0) or a side wall
// (wall -1/+1 = world -x/+x) — so it rebounds over the net and lands in the opposite court. Random search over
// simulated flights; returns null when nothing works from this spot.
// ponytail: brute-force search (~160 short sims per shot); cache or solve analytically if the server gets busy.
export function contraVelocity(p, team, wall = 0, tries = 240) {
  const zs = team === 0 ? 1 : -1;
  let best = null, bestScore = Infinity;
  for (let i = 0; i < tries; i++) {
    const tgt = wall === 0
      ? [(Math.random() * 2 - 1) * 3.5, 1.0 + Math.random() * 1.8, zs * COURT.halfL]
      : [wall * COURT.halfW, 0.6 + Math.random() * 1.2, zs * (6.2 + Math.random() * 3.6)];
    const speed = 9 + Math.random() * 11;
    const d = [tgt[0] - p[0], tgt[1] - p[1], tgt[2] - p[2]], L = Math.hypot(...d);
    if (L < 0.3) continue;
    const v = d.map(x => x / L * speed);
    v[1] += 0.5 * K.g * (L / speed) + Math.random() * 3;  // lift: counter the drop on the way to the glass
    const { contacts } = predict({ p: [...p], v, w: [0, 0, 0], live: true }, 3);
    const land = contacts.findIndex(c => c.kind === 'floor');
    if (land < 1 || contacts[land].side === team) continue;                       // glass first, then land over the net
    if (!contacts.slice(0, land).every(c => c.kind === 'glass' && c.side === team)) continue;  // no mesh/net/out on the way
    const score = Math.abs(Math.abs(contacts[land].p[2]) - 6.5) + Math.abs(contacts[land].p[0]) * 0.2;
    if (score < bestScore) { bestScore = score; best = v; }
  }
  return best;
}
