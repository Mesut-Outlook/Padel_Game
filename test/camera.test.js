import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { createCameraRig } from '../src/camera.js';

const noop = () => {};
const dom = { style: {}, addEventListener: noop, removeEventListener: noop, getRootNode: () => ({ addEventListener: noop, removeEventListener: noop }) };

function tvCamera(aspect, team, ball) {
  const camera = new PerspectiveCamera(50, aspect, 0.1, 250);
  const rig = createCameraRig(camera, dom);
  const view = { ball, players: [{ p: [0, 8] }, { p: [0, 8] }, { p: [0, -8] }, { p: [0, -8] }], focus: team ? 2 : 0, team };
  for (let i = 0; i < 300; i++) rig.update(0.05, view);
  camera.updateMatrixWorld();
  return { camera, rig };
}

test('TV view: the whole court and the far wall stay in frame on every screen shape, from both ends', () => {
  for (const aspect of [0.6, 1, 4 / 3, 16 / 9, 2.16]) for (const team of [0, 1]) for (const ball of [[0, 1, 0], [5, 1, 10], [-5, 1, -10], [0, 7, 0]]) {
    const { camera } = tvCamera(aspect, team, ball);
    const s = team ? -1 : 1;
    for (const [x, y, z] of [[5.06, 0, 10], [-5.06, 0, 10], [5.06, 4, -10], [-5.06, 4, -10]]) {
      const p = new Vector3(x, y, z * s).project(camera);
      assert.ok(Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1, `aspect ${aspect} team ${team} ball ${ball}: (${x},${y},${z}) at ${p.x.toFixed(2)},${p.y.toFixed(2)}`);
    }
  }
});

test('TV view: phones in landscape get a tighter lens, and the far court is bigger than the old camera showed it', () => {
  const width = cam => { const a = new Vector3(5, 0, -10).project(cam), b = new Vector3(-5, 0, -10).project(cam); return (a.x - b.x) * cam.aspect; };
  const old = new PerspectiveCamera(50, 16 / 9, 0.1, 250);
  old.position.set(0, 7.2, 16.8); old.lookAt(0, 0.8, -1.5); old.updateMatrixWorld();
  const desk = tvCamera(16 / 9, 0, [0, 1, 0]).camera, phone = tvCamera(2.16, 0, [0, 1, 0]).camera;
  assert.ok(width(desk) > width(old) * 1.15, `${width(desk)} vs ${width(old)}`);
  assert.ok(width(phone) > width(desk) * 1.05, `${width(phone)} vs ${width(desk)}`);
});

test('the free camera gets the normal lens back', () => {
  const { camera, rig } = tvCamera(16 / 9, 0, [0, 1, 0]);
  assert.ok(camera.fov < 40);
  rig.set('free');
  assert.equal(camera.fov, 50);
});
