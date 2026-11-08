import test from 'node:test';
import assert from 'node:assert/strict';
import { offerKeyLabel, mountTouch } from '../src/touch.js';
import { keepAwake, isKeepAwakeActive } from '../src/wakelock.js';
import { isAudioSuspended } from '../src/audio.js';

test('mountTouch: top bar omits pause button and coach tips reference ✕ Exit', () => {
  const stub = () => ({ style: {}, hidden: false, addEventListener: () => {} });
  const el = {
    innerHTML: '',
    querySelector: () => stub(),
    querySelectorAll: () => [],
    addEventListener: () => {},
  };
  mountTouch(el);
  assert.ok(!el.innerHTML.includes('data-key="Escape"'), 'Escape/pause button removed from TOP');
  assert.ok(!el.innerHTML.includes('⏸'), 'pause icon removed from TOP');
  assert.ok(el.innerHTML.includes('✕ Exit'), 'coach tips mention ✕ Exit');
});

test('offerKeyLabel: returns tap on touch devices only when pad is not active', () => {
  // Touch device, keyboard/touch device mode
  assert.equal(offerKeyLabel({ pid: 0, humans: [0], device: 'kb', control: 'auto', touch: true }), 'tap');

  // Touch device, pad active (device === 'pad') -> must show LT, not tap
  assert.equal(offerKeyLabel({ pid: 0, humans: [0], device: 'pad', control: 'auto', touch: true }), 'LT');

  // Touch device, control forced to pad -> must show LT
  assert.equal(offerKeyLabel({ pid: 0, humans: [0], device: 'kb', control: 'pad', touch: true }), 'LT');

  // Touch device, local human P2 (index > 0) is always on pad
  assert.equal(offerKeyLabel({ pid: 1, humans: [0, 1], device: 'kb', control: 'auto', touch: true }), 'LT');
});

test('offerKeyLabel: returns E or LT on non-touch devices', () => {
  // Non-touch desktop, keyboard
  assert.equal(offerKeyLabel({ pid: 0, humans: [0], device: 'kb', control: 'auto', touch: false }), 'E');

  // Non-touch desktop, gamepad
  assert.equal(offerKeyLabel({ pid: 0, humans: [0], device: 'pad', control: 'auto', touch: false }), 'LT');
});

test('wakelock: keepAwake toggles active state cleanly in headless environments', () => {
  keepAwake(true);
  assert.equal(isKeepAwakeActive(), true);

  keepAwake(false);
  assert.equal(isKeepAwakeActive(), false);
});

test('audio: isAudioSuspended returns boolean', () => {
  assert.equal(typeof isAudioSuspended(), 'boolean');
});
