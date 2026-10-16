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

test('server holds the ball on the court-centre side', () => {
  const w = newWorld();
  stepWorld(w, {}, 1 / 60);
  const s = w.players.find(p => p.anim === 'serveReady');
  assert.ok(s, 'server is in serve-ready pose');
  assert.ok(Math.abs(w.ball.p[0]) < Math.abs(s.p[0]), `ball x ${w.ball.p[0]} server x ${s.p[0]}`);
});

test('server can shuffle along the baseline but stays in own half behind the service line', () => {
  const w = newWorld();
  const s = w.players.find(p => p.id === 0);
  const xs = Math.sign(s.p[0]), x0 = s.p[0];
  for (let i = 0; i < 120; i++) stepWorld(w, { 0: { move: [-xs, -1] } }, 1 / 60);  // push toward centre + net
  assert.ok(Math.abs(s.p[0]) < Math.abs(x0), 'moved toward centre');
  assert.ok(s.p[0] * xs >= 0.3, `stays in own half: ${s.p[0]}`);
  assert.ok(Math.abs(s.p[1]) >= 7.3, `behind service line: ${s.p[1]}`);
});

test('slice serve carries sidespin, flat serve does not', () => {
  for (const [swing, side] of [['slice', true], ['auto', false]]) {
    const w = newWorld();
    stepWorld(w, { 0: { swing } }, 1 / 60);
    for (let i = 0; i < 120 && w.state === 'toss'; i++) stepWorld(w, {}, 1 / 60);
    assert.equal(w.state, 'play');
    assert.equal(w.ball.w[1] !== 0, side, `${swing}: w=${w.ball.w}`);
  }
});

test('serve: ball is dropped, bounces, and is struck below the waist', () => {
  const w = newWorld();
  stepWorld(w, { 0: { swing: 'auto' } }, 1 / 60);
  assert.equal(w.state, 'toss');
  let minY = Infinity, hitY = null;
  for (let i = 0; i < 120 && w.state === 'toss'; i++) {
    stepWorld(w, {}, 1 / 60);
    minY = Math.min(minY, w.ball.p[1]);
    for (const e of w.events) if (e.type === 'hit') hitY = w.ball.p[1];
  }
  assert.ok(minY < 0.1, `ball reached the floor: ${minY}`);
  assert.ok(hitY != null && hitY < 1.0, `struck below the waist: ${hitY}`);
});

test('sweet-spot timing quality is evaluated and bajada/rulo shots are supported', () => {
  const w = newWorld();
  w.state = 'play';
  Object.assign(w.match.rally, { phase: 'rally', lastHitTeam: 1, bouncesSinceHit: 1 });
  const pl = w.players[0];
  pl.p = [0, 6];
  // place ball right in optimal sweet spot (distance ~0.85m, good height)
  Object.assign(w.ball, { p: [0.85, 1.0, 6], v: [0, 0, 0], w: [0, 0, 0], live: true });
  let hit = null;
  for (let i = 0; i < 20 && !hit; i++) {
    stepWorld(w, { 0: { swing: i === 0 ? 'bajada' : null, aim: 0 } }, 1 / 60);
    hit = w.events.find(e => e.type === 'hit');
  }
  assert.ok(hit, 'hit event recorded');
  assert.equal(hit.shot, 'bajada');
  assert.equal(hit.quality, 'perfect');
});


test('a pending swing plants the feet: aiming sideways barely moves the player', () => {
  const run = (swing) => {
    const w = newWorld(); w.state = 'play';
    const p = w.players[0]; p.p = [0, 8];
    Object.assign(w.ball, { p: [0, -5, 0], v: [0, 0, 0], live: false });
    stepWorld(w, { 0: { move: [-1, 0], swing, aim: -1 } }, 1 / 60);
    for (let i = 0; i < 9; i++) stepWorld(w, { 0: { move: [-1, 0] } }, 1 / 60);
    return Math.abs(p.p[0]);
  };
  assert.ok(run('auto') < run(null) * 0.5, `with swing ${run('auto')} vs walking ${run(null)}`);
});
