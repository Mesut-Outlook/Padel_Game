import test from 'node:test';
import assert from 'node:assert/strict';
import { padText, isPlayStation } from '../src/padstyle.js';

test('PlayStation pads are recognised by their browser id', () => {
  assert.ok(isPlayStation('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'));
  assert.ok(isPlayStation('Sony Interactive Entertainment Wireless Controller'));
  assert.ok(!isPlayStation('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)'));
});

test('button labels switch to PlayStation glyphs; other words stay', () => {
  assert.equal(padText('A', 'ps'), '✕');
  assert.equal(padText('LB', 'ps'), 'L1');
  assert.equal(padText('Start → menu', 'ps'), 'Options → menu');
  assert.equal(padText('camera (View)', 'ps'), 'camera (Share)');
  assert.equal(padText('left stick', 'ps'), 'left stick');
  assert.equal(padText('RB', 'xbox'), 'RB');
});
