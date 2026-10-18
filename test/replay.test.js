import test from 'node:test';
import assert from 'node:assert/strict';
import { createReplay } from '../src/replay.js';

const snap = (t, x = t, f = 0) => ({ t, s: 'rally', b: [x, 1, 0], pl: [[x, 2, f, 1, 0, 0, 0]] });

test('keeps only the last 15s', () => {
  const r = createReplay(15, 60);
  for (let i = 0; i < 30 * 60; i++) r.record(snap(i / 60));
  assert.equal(r.length, 900);
  assert.ok(Math.abs(r.oldest - (30 - 15)) < 0.02);
  assert.ok(Math.abs(r.newest - (1800 - 1) / 60) < 1e-9);
});

test('play last 2s at 0.5 takes 4s', () => {
  const r = createReplay(15, 60);
  for (let i = 0; i < 600; i++) r.record(snap(i / 60));
  r.play({ from: r.newest - 2, to: r.newest, speed: 0.5 });
  assert.ok(r.playing);
  let steps = 0;
  while (r.playing && steps < 10000) { r.update(1 / 60); steps++; }
  assert.ok(Math.abs(steps / 60 - 4) <= 1 / 60 + 1e-9, `took ${steps / 60}s`);
  assert.equal(r.update(1 / 60), null);
});

test('interpolates ball and player between frames', () => {
  const r = createReplay(1, 10);
  r.record({ t: 0, s: 'a', b: [0, 0, 0], pl: [[0, 0, 0, 1, 0, 0, 0]] });
  r.record({ t: 1, s: 'b', b: [10, 2, 4], pl: [[2, 4, 0, 2, 0, 0, 0]] });
  r.play({ from: 0, to: 1, speed: 1 });
  const s = r.update(0.25);
  assert.deepEqual(s.b, [2.5, 0.5, 1]);
  assert.deepEqual(s.pl[0].slice(0, 2), [0.5, 1]);
  assert.equal(s.s, 'a'); assert.equal(s.pl[0][3], 1);   // nearer frame (a)
  assert.equal(r.update(0.5).s, 'b'); // u=0.75 -> b
});

test('facing wraps across +-PI', () => {
  const r = createReplay(1, 10);
  r.record({ t: 0, b: [0, 0, 0], pl: [[0, 0, 3.0, 0, 0, 0, 0]] });
  r.record({ t: 1, b: [0, 0, 0], pl: [[0, 0, -3.0, 0, 0, 0, 0]] });
  r.play({ from: 0, to: 1, speed: 1 });
  const f = r.update(0.5).pl[0][2];
  assert.ok(Math.abs(Math.abs(f) - Math.PI) < 1e-9, `f=${f}`);
});

test('playLastShots plays starting 0.4s before the 3rd last hit', () => {
  const r = createReplay(15, 60);
  for (let i = 0; i < 600; i++) {
    const t = i / 60;
    r.record(snap(t));
    // Simulate hits at t=2.0, t=4.0, t=6.0, t=7.5, t=9.0
    if (Math.abs(t - 2.0) < 0.005 || Math.abs(t - 4.0) < 0.005 || Math.abs(t - 6.0) < 0.005 || Math.abs(t - 7.5) < 0.005 || Math.abs(t - 9.0) < 0.005) {
      r.markHit(t);
    }
  }
  // Rally ended around t=9.5. The last 3 hits were at t=6.0, t=7.5, t=9.0.
  // 3rd last hit is at t=6.0. Start should be 6.0 - 0.4 = 5.6.
  r.playLastShots(3, { speed: 1 });
  assert.ok(r.playing);
  const firstFrame = r.scrub(0); // scrubs to the 'from' time
  assert.ok(Math.abs(firstFrame.t - 5.6) < 0.05, `expected start around 5.6s, got ${firstFrame.t}`);
});

