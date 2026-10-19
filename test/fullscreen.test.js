import test from 'node:test';
import assert from 'node:assert/strict';
import { isFullscreen, toggleFullscreen, bindFullscreenKey, updateFullscreenButtons } from '../src/fullscreen.js';

test('isFullscreen detects fullscreen elements or absence', () => {
  const fakeDocEmpty = {};
  assert.equal(isFullscreen(fakeDocEmpty), false);

  const fakeDocFull = { fullscreenElement: {} };
  assert.equal(isFullscreen(fakeDocFull), true);

  const fakeDocWebkit = { webkitFullscreenElement: {} };
  assert.equal(isFullscreen(fakeDocWebkit), true);
});

test('toggleFullscreen enters fullscreen when not active and exits when active', async () => {
  let enterCalled = false;
  let exitCalled = false;

  const fakeTarget = {
    requestFullscreen: async () => { enterCalled = true; fakeDoc.fullscreenElement = fakeTarget; }
  };
  const fakeDoc = {
    documentElement: fakeTarget,
    fullscreenElement: null,
    exitFullscreen: async () => { exitCalled = true; fakeDoc.fullscreenElement = null; }
  };

  // Enter
  await toggleFullscreen(fakeTarget, fakeDoc);
  assert.equal(enterCalled, true);
  assert.equal(fakeDoc.fullscreenElement, fakeTarget);

  // Exit
  await toggleFullscreen(fakeTarget, fakeDoc);
  assert.equal(exitCalled, true);
  assert.equal(fakeDoc.fullscreenElement, null);
});

test('toggleFullscreen locks Escape on enter and unlocks on exit', async () => {
  const lockedKeys = [];
  let unlockCalled = false;
  const fakeNav = {
    keyboard: {
      lock: async (keys) => { lockedKeys.push(...keys); },
      unlock: () => { unlockCalled = true; }
    }
  };
  const fakeTarget = {
    requestFullscreen: async () => { fakeDoc.fullscreenElement = fakeTarget; }
  };
  const fakeDoc = {
    documentElement: fakeTarget,
    fullscreenElement: null,
    exitFullscreen: async () => { fakeDoc.fullscreenElement = null; }
  };

  // Enter fullscreen -> should lock Escape
  await toggleFullscreen(fakeTarget, fakeDoc, fakeNav);
  assert.deepEqual(lockedKeys, ['Escape']);
  assert.equal(unlockCalled, false);

  // Exit fullscreen -> should unlock
  await toggleFullscreen(fakeTarget, fakeDoc, fakeNav);
  assert.equal(unlockCalled, true);
});

test('bindFullscreenKey triggers on KeyF when not inside an input field', () => {
  let calls = 0;
  const fakeTarget = {
    requestFullscreen: async () => { calls++; }
  };
  const fakeDoc = {
    documentElement: fakeTarget,
    fullscreenElement: null,
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  const listeners = [];
  const fakeWindow = {
    addEventListener: (type, fn) => listeners.push(fn),
    removeEventListener: (type, fn) => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    }
  };

  const unbind = bindFullscreenKey(fakeWindow, fakeDoc);

  // Typing in an INPUT: should ignore
  listeners[0]({ code: 'KeyF', repeat: false, target: { tagName: 'INPUT' } });
  assert.equal(calls, 0);

  // Pressing KeyF in normal game context: should trigger
  listeners[0]({ code: 'KeyF', repeat: false, target: { tagName: 'BODY' } });
  assert.equal(calls, 1);
  unbind();

  // During a match F is the slice shot: enabled() false must not toggle
  const unbindMatch = bindFullscreenKey(fakeWindow, fakeDoc, () => false);
  listeners[0]({ code: 'KeyF', repeat: false, target: { tagName: 'BODY' } });
  assert.equal(calls, 1);
  unbindMatch();
  assert.equal(listeners.length, 0);
});

test('updateFullscreenButtons updates label and icon based on fullscreen state', () => {
  const btn1 = { dataset: { iconOnly: '1' }, textContent: '⛶', title: '' };
  const btn2 = { dataset: {}, textContent: '⛶ Fullscreen', title: '' };
  const fakeDoc = {
    fullscreenElement: {},
    querySelectorAll: (sel) => sel === '.fs-btn-sync' ? [btn1, btn2] : []
  };

  updateFullscreenButtons(fakeDoc);
  assert.equal(btn1.textContent, '🗗');
  assert.equal(btn2.textContent, '🗗 Exit Fullscreen');

  fakeDoc.fullscreenElement = null;
  updateFullscreenButtons(fakeDoc);
  assert.equal(btn1.textContent, '⛶');
  assert.equal(btn2.textContent, '⛶ Fullscreen');
});
