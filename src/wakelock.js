// Screen Wake Lock helper: keeps screen active during matches on mobile/tablets.
let sentinel = null;
let active = false;

async function requestLock() {
  if (!active || sentinel || typeof navigator === 'undefined' || !navigator.wakeLock?.request) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    sentinel = null;
  }
}

async function releaseLock() {
  if (sentinel) {
    try {
      await sentinel.release();
    } catch {
      // ignore
    }
    sentinel = null;
  }
}

export function keepAwake(on) {
  active = !!on;
  if (active) {
    requestLock();
  } else {
    releaseLock();
  }
}

export function isKeepAwakeActive() {
  return active;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && active) {
      requestLock();
    }
  });
}
