// The career player's match, counted for stat growth (XP) and the coach tip. Pure: fed with world events
// (offline or from the server) and the player's own row each frame, so online matches count too.
import { pointCall, teamOf } from './pointcall.js';

const OVERHEAD = new Set(['smash', 'bandeja', 'vibora', 'bajada', 'rulo']);
const HARD = 25;  // m/s off the racket: a hard drive (about the top 40% of AI drives)

// volley / smash = [made, missed]; drives = hard clean ones; clean = 4+ shot rallies I played without erring;
// long = 8+ shot rallies; dist = metres run; tiredSec / drySec = time spent exhausted / dry
export const newTally = () => ({ volley: [0, 0], smash: [0, 0], drives: 0, clean: 0, long: 0, dist: 0, tiredSec: 0, drySec: 0, last: null, mine: null, played: false, prev: null });

export function tallyEvents(t, events, me) {
  for (const e of events) {
    if (e.type === 'hit') {
      t.last = e.pid;
      if (e.pid !== me) continue;
      t.mine = e; t.played = true;
      if (e.volley) t.volley[e.mistake ? 1 : 0]++;
      if (OVERHEAD.has(e.shot)) t.smash[e.mistake ? 1 : 0]++;
      if (e.shot === 'drive' && !e.mistake && e.speed >= HARD) t.drives++;
    } else if (e.type === 'point') {
      const myErr = t.last === me && teamOf(me) !== e.team && pointCall(e.why, e.team, me).pid === me;
      if (myErr && t.mine && !t.mine.mistake) {  // the shot looked fine but lost the point: count it missed
        if (t.mine.volley) { t.volley[0]--; t.volley[1]++; }
        if (OVERHEAD.has(t.mine.shot)) { t.smash[0]--; t.smash[1]++; }
      }
      if (t.played && !myErr && e.rally >= 4) t.clean++;
      if (e.rally >= 8) t.long++;
      t.last = null; t.mine = null; t.played = false;
    }
  }
}

// row = { p: [x, z], energy, hyd } of my player this frame; a jump of a metre or more is a reset, not running
export function tallyFrame(t, { p, energy, hyd }, dt) {
  if (t.prev) { const d = Math.hypot(p[0] - t.prev[0], p[1] - t.prev[1]); if (d < 1) t.dist += d; }
  t.prev = [p[0], p[1]];
  if (energy < 0.25) t.tiredSec += dt;
  if (hyd < 0.3) t.drySec += dt;
}

// eco.xp = { volley, smash, power, control, speed, stamina } weights; speed is per metre
export function xpFromTally(t, eco) {
  const w = eco.xp;
  const r = (v) => Math.max(0, Math.round(v));
  return {
    volley: r(t.volley[0] * w.volley), smash: r(t.smash[0] * w.smash), power: r(t.drives * w.power),
    control: r(t.clean * w.control), speed: r(t.dist * w.speed), stamina: r(t.long * w.stamina),
  };
}
