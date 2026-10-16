import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, stepWorld } from '../src/game.js';

// naive bots: chase ball x, swing always -> match must progress and score points without throwing
test('bot match progresses and scores', () => {
  const w = newWorld();
  let points = 0, hits = 0;
  for (let i = 0; i < 60 * 600 && w.state !== 'over'; i++) {
    const inp = {};
    for (const p of w.players) inp[p.id] = { move: [Math.sign(w.ball.p[0] - p.p[0]), Math.sign(w.ball.p[2] - p.p[1]) * 0.5], swing: 'auto', aim: Math.random() * 2 - 1 };
    stepWorld(w, inp, 1 / 60);
    for (const e of w.events) { if (e.type === 'point') points++; if (e.type === 'hit') hits++; }
    w.events.length = 0;
  }
  assert.ok(points > 20, `points ${points} hits ${hits} log ${w.match.log.slice(-5)}`);
  assert.ok(hits > points, `rallies happen: hits ${hits} points ${points}`);
});

test('swing waits for the ball to come close instead of hitting at the edge of reach', () => {
  const w = newWorld();
  w.state = 'play';
  Object.assign(w.match.rally, { phase: 'rally', lastHitTeam: 1, bouncesSinceHit: 1 });
  const pl = w.players[0];
  pl.p = [0, 6];
  Object.assign(w.ball, { p: [1.3, 1.0, 6], v: [-8, 0, 0], w: [0, 0, 0], live: true });
  let hitD = null;
  for (let i = 0; i < 30 && hitD == null; i++) {
    const bx = w.ball.p[0];
    stepWorld(w, { 0: { move: [0, 0], swing: i === 0 ? 'drive' : null, aim: 0 } }, 1 / 60);
    if (w.events.some(e => e.type === 'hit')) hitD = Math.abs(bx - pl.p[0]);
    w.events.length = 0;
  }
  assert.ok(hitD != null && hitD < 0.85, `hit at distance ${hitD}`);
});
