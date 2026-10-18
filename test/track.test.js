import test from 'node:test';
import assert from 'node:assert/strict';
import { track } from '../src/track.js';

test('track sends a fixed event name, and is silent without GoatCounter or when it throws', () => {
  delete globalThis.goatcounter;
  assert.doesNotThrow(() => track('match-start'));  // blocked script: nothing happens
  const sent = [];
  globalThis.goatcounter = { count: (o) => sent.push(o) };
  track('online-click');
  assert.deepEqual(sent, [{ path: 'online-click', title: 'online-click', event: true }]);
  globalThis.goatcounter = { count: () => { throw new Error('offline'); } };
  assert.doesNotThrow(() => track('match-end'));
  delete globalThis.goatcounter;
});
