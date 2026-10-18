// DOM/CSS opening splash animation for Padel Legends
// Total duration: ~2.5s. Skippable by any key, click, or gamepad button.
// Stored in sessionStorage so it only plays once per session.

import { padText } from './padstyle.js';

const STORAGE_KEY = 'padel.splash.shown';

function isSessionShown() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markSessionShown() {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // sessionStorage blocked or unavailable
  }
}

export function initSplash({ onComplete } = {}) {
  const splashEl = document.getElementById('splash');
  if (!splashEl) {
    onComplete?.();
    return;
  }

  // If already shown this session, dismiss immediately without animation
  if (isSessionShown()) {
    splashEl.remove();
    onComplete?.();
    return;
  }

  let completed = false;
  let animTimer = null;
  let padPollId = null;

  function finish() {
    if (completed) return;
    completed = true;
    if (animTimer) clearTimeout(animTimer);
    if (padPollId) cancelAnimationFrame(padPollId);
    window.removeEventListener('keydown', onInput);
    window.removeEventListener('pointerdown', onInput);
    window.removeEventListener('gamepadconnected', refreshHint);
    window.removeEventListener('gamepaddisconnected', refreshHint);

    markSessionShown();

    splashEl.classList.add('is-dismissed');
    setTimeout(() => {
      splashEl.remove();
      onComplete?.();
    }, 300);
  }

  function onInput() {
    finish();
  }

  function refreshHint() {
    const hint = splashEl.querySelector('#splashSkipHint');
    if (hint) hint.textContent = padText('Press any key or A to skip');
  }

  refreshHint();
  window.addEventListener('keydown', onInput, { once: true });
  window.addEventListener('pointerdown', onInput, { once: true });
  window.addEventListener('gamepadconnected', refreshHint);
  window.addEventListener('gamepaddisconnected', refreshHint);

  // Poll for gamepad button presses to skip
  function pollPad() {
    if (completed) return;
    const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    if (gps.some(gp => gp.buttons?.some(b => b?.pressed))) {
      finish();
      return;
    }
    padPollId = requestAnimationFrame(pollPad);
  }
  padPollId = requestAnimationFrame(pollPad);

  // Respect reduced-motion preferences: static logo for 1.0s then finish
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (prefersReduced) {
    splashEl.classList.add('is-reduced-motion');
    animTimer = setTimeout(finish, 1000);
  } else {
    // Normal 2.5s sequence
    animTimer = setTimeout(finish, 2500);
  }
}
