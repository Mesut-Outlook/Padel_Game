import test from 'node:test';
import assert from 'node:assert/strict';
import { crowdYaw } from '../src/crowdplan.js';

// Normal of a +Z plane turned by yaw about Y: (sin yaw, 0, cos yaw).
test('crowdYaw: both stands face the court, turned slightly towards the net', () => {
  for (const side of [1, -1]) {
    for (const pz of [9, 0, -9]) {
      const yaw = crowdYaw(side * 7.5, pz, side);
      const nx = Math.sin(yaw), nz = Math.cos(yaw);
      assert.ok(-side * nx > 0.9, `side ${side} z ${pz}: faces the court (nx ${nx})`);
      if (pz === 0) assert.ok(Math.abs(nz) < 1e-9);
      else assert.ok(Math.sign(nz) === -Math.sign(pz), `side ${side} z ${pz}: turned towards the net (nz ${nz})`);
    }
  }
});
