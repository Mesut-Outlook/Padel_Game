import test from 'node:test';
import assert from 'node:assert/strict';
import { newBall, stepBall, aimVelocity, predict } from '../src/physics.js';

test('dropped ball bounces lower each time', () => {
  const b = newBall(); b.p = [0, 2, 3]; b.live = true;
  const peaks = []; let up = false, prev = 2;
  for (let i = 0; i < 1200; i++) { stepBall(b, 1 / 240); if (up && b.p[1] < prev) { peaks.push(prev); up = false; } if (b.p[1] > prev) up = true; prev = b.p[1]; }
  assert.ok(peaks.length >= 2 && peaks[0] < 2 && peaks[1] < peaks[0], String(peaks));
  assert.ok(peaks[0] > 0.8 && peaks[0] < 1.4, 'first bounce ~1.1m like FIP ball test ' + peaks[0]);
});

test('aimVelocity lands near target', () => {
  const b = newBall(); b.p = [1, 1, 8]; b.live = true;
  b.v = aimVelocity(b.p, [-2, -5], 1.1);
  const first = predict(b, 3).contacts[0];
  assert.equal(first.kind, 'floor');
  assert.ok(Math.hypot(first.p[0] + 2, first.p[2] + 5) < 0.6, JSON.stringify(first.p));
});

test('ball over back glass hits mesh, over 4m goes out', () => {
  const b = newBall(); b.p = [0, 3.5, -9]; b.v = [0, 0, -10]; b.live = true;
  assert.equal(predict(b, 0.3).contacts[0].kind, 'mesh');
  b.p = [0, 4.5, -9];
  assert.equal(predict(b, 0.3).contacts[0].kind, 'out');
});

test('side wall mesh heights: mesh at y=2.5 z=7 and y=3.5 z=9; out at y=3.5 z=7', () => {
  const b1 = newBall(); b1.p = [4.5, 2.5, 7]; b1.v = [10, 0, 0]; b1.live = true;
  assert.equal(predict(b1, 0.2).contacts[0]?.kind, 'mesh');

  const b2 = newBall(); b2.p = [4.5, 3.5, 9]; b2.v = [10, 0, 0]; b2.live = true;
  assert.equal(predict(b2, 0.2).contacts[0]?.kind, 'mesh');

  const b3 = newBall(); b3.p = [4.5, 3.5, 7]; b3.v = [10, 0, 0]; b3.live = true;
  assert.equal(predict(b3, 0.2).contacts[0]?.kind, 'out');
});

test('ball moving inward past boundary does not trigger contact (leaving guard)', () => {
  const b = newBall();
  b.p = [5.01, 1.5, 0]; // slightly outside side wall
  b.v = [-5, 0, 0]; // moving inward towards court center
  b.live = true;
  const ev = stepBall(b, 0.01);
  assert.equal(ev.length, 0); // no bounce triggered
});

test('wall spin kick: topspin kicks up on back glass, slice drops down', () => {
  // Topspin ball moving toward +z back wall (w_x > 0)
  const bTop = newBall();
  bTop.p = [0, 1.5, 9.8];
  bTop.v = [0, 0, 10]; // horizontal impact
  bTop.w = [60, 0, 0]; // topspin
  bTop.live = true;
  stepBall(bTop, 0.03); // hits back glass at z=10
  assert.ok(bTop.v[1] > 0, `topspin vy should be positive after glass kick, got ${bTop.v[1]}`);

  // Slice / backspin ball moving toward +z back wall (w_x < 0)
  const bSlice = newBall();
  bSlice.p = [0, 1.5, 9.8];
  bSlice.v = [0, 0, 10];
  bSlice.w = [-60, 0, 0]; // slice/backspin
  bSlice.live = true;
  stepBall(bSlice, 0.03);
  assert.ok(bSlice.v[1] < 0, `slice vy should be negative (dying down) after glass kick, got ${bSlice.v[1]}`);
});

test('FIP ball bounce test: dropped from 2.54m rebounds between 1.35m and 1.45m', () => {
  const b = newBall(); b.p = [0, 2.54, 0]; b.live = true;
  let maxH = 0, hitFloor = false;
  for (let i = 0; i < 2000; i++) {
    stepBall(b, 1 / 240);
    if (b.v[1] > 0) hitFloor = true;
    if (hitFloor && b.p[1] > maxH) maxH = b.p[1];
    if (hitFloor && b.v[1] < 0) break;
  }
  assert.ok(maxH >= 1.35 && maxH <= 1.45, `FIP rebound must be 1.35-1.45m, got ${maxH.toFixed(4)}m`);
});

test('ball through side door opening goes out; above the door it hits mesh', () => {
  const b = newBall(); b.p = [4.5, 1, 0.6]; b.v = [10, 0, 0]; b.live = true;
  assert.equal(predict(b, 0.2).contacts[0]?.kind, 'out');
  b.p = [4.5, 2.5, 0.6];
  assert.equal(predict(b, 0.2).contacts[0]?.kind, 'mesh');
  b.p = [4.5, 1, 1.5]; // outside door opening (z > 1.08) hits mesh
  assert.equal(predict(b, 0.2).contacts[0]?.kind, 'mesh');
});

test('contrapared: ball off own back glass or side glass lands in the opposite court', async () => {
  const { contraVelocity } = await import('../src/physics.js');
  for (const [p, wall] of [[[0.5, 0.9, 9.2], 0], [[3.6, 0.9, 7.8], 1], [[-3.6, 0.9, 7.8], -1]]) {
    const v = contraVelocity(p, 0, wall);
    assert.ok(v, `found a contrapared from ${p} wall ${wall}`);
    const c = predict({ p: [...p], v, w: [0, 0, 0], live: true }, 3).contacts;
    assert.equal(c[0].kind, 'glass'); assert.equal(c[0].side, 0);
    const land = c.find(x => x.kind === 'floor');
    assert.equal(land.side, 1, JSON.stringify(c.map(x => x.kind + x.side)));
    if (wall) assert.ok(Math.sign(c[0].p[0]) === wall, 'hit the chosen side glass');
  }
});
