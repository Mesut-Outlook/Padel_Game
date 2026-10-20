// Fullscreen toggle utilities and keyboard binding
// Supports standard Fullscreen API with webkit/moz/ms fallbacks and input field guards.

import { track } from './track.js';
import { t, N_ } from './i18n.js';

export function isFullscreen(doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc) return false;
  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

export const canFullscreen = (target) => !!(target?.requestFullscreen || target?.webkitRequestFullscreen || target?.mozRequestFullScreen || target?.msRequestFullscreen);

// without the Fullscreen API (iPhone) the game goes full screen only as a home-screen app (manifest + apple meta in index.html)
const HINT = N_('📱 Full screen on iPhone: tap <b>Share</b> (the square with the arrow) → <b>Add to Home Screen</b>, then open Padel Legends from the new icon.');
function showHomeScreenHint(doc) {
  let el = doc.getElementById?.('fsHint');
  if (!el) {
    el = doc.createElement('div'); el.id = 'fsHint'; el.setAttribute('role', 'status');
    el.innerHTML = `<span>${t(HINT)}</span><button type="button" aria-label="${t('Close')}">✕</button>`;
    el.querySelector('button').onclick = () => { el.hidden = true; };
    doc.body.appendChild(el);
  }
  el.hidden = false;
  clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 12000);
}

export async function toggleFullscreen(target = (typeof document !== 'undefined' ? document.documentElement : null), doc = (typeof document !== 'undefined' ? document : null), nav = (typeof navigator !== 'undefined' ? navigator : null)) {
  if (!doc || !target) return false;
  try {
    if (!isFullscreen(doc)) {
      if (!canFullscreen(target)) { showHomeScreenHint(doc); return false; }  // iPhone Safari: pages cannot go fullscreen
      if (target.requestFullscreen) await target.requestFullscreen();
      else if (target.webkitRequestFullscreen) await target.webkitRequestFullscreen();
      else if (target.mozRequestFullScreen) await target.mozRequestFullScreen();
      else if (target.msRequestFullscreen) await target.msRequestFullscreen();
      try { await nav?.keyboard?.lock?.(['Escape']); } catch {}
      track('fullscreen-on');
      return true;
    } else {
      try { nav?.keyboard?.unlock?.(); } catch {}
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
      else if (doc.msExitFullscreen) await doc.msExitFullscreen();
      return false;
    }
  } catch {
    // Fullscreen may be rejected if denied or untrusted gesture
    return isFullscreen(doc);
  }
}

export function updateFullscreenButtons(doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc || !doc.querySelectorAll) return;
  const full = isFullscreen(doc);
  const icon = full ? '🗗' : '⛶';
  const label = full ? t('Exit Fullscreen') : t('Fullscreen');
  const btns = doc.querySelectorAll('.fs-btn-sync');
  btns.forEach(btn => {
    if (btn.dataset.iconOnly === '1') {
      btn.textContent = icon;
      btn.title = full ? t('Exit fullscreen') : t('Fullscreen');
    } else {
      btn.textContent = `${icon} ${label}`;
      btn.title = full ? t('Exit fullscreen') : t('Fullscreen');
    }
  });
}

// enabled(): false while a match runs — in a match F is the slice shot (src/input.js), so there only the ⛶ button,
// the pause menu and the browser's own F11 toggle fullscreen.
export function bindFullscreenKey(target = (typeof window !== 'undefined' ? window : null), doc = (typeof document !== 'undefined' ? document : null), enabled = () => true) {
  if (!target) return () => {};
  const onKey = (e) => {
    if (e.code === 'KeyF' && !e.repeat && enabled()) {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
        return;
      }
      toggleFullscreen(doc?.documentElement, doc);
    }
  };
  const onFsChange = () => {
    if (!isFullscreen(doc)) {
      try { (typeof navigator !== 'undefined' ? navigator : null)?.keyboard?.unlock?.(); } catch {}
    }
    updateFullscreenButtons(doc);
  };

  target.addEventListener('keydown', onKey);
  if (doc?.addEventListener) {
    doc.addEventListener('fullscreenchange', onFsChange);
    doc.addEventListener('webkitfullscreenchange', onFsChange);
  }

  return () => {
    target.removeEventListener('keydown', onKey);
    if (doc?.removeEventListener) {
      doc.removeEventListener('fullscreenchange', onFsChange);
      doc.removeEventListener('webkitfullscreenchange', onFsChange);
    }
  };
}
