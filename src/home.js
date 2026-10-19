// HOME Screen for Padel Legends
// 3 big mode cards (Friendly, Career, Friends Cup) + bottom action bar (Training, Settings, Controls, Profile)

import { padText } from './padstyle.js';
import { padDir, spatialFocus } from './padnav.js';
import { loadProfile } from './career.js';
import { toggleFullscreen } from './fullscreen.js';

// ways to play, pictured on HOME (public/assets/howto/), each linking to its part of kontroller.html; ready = shown.
const HOWTO = [
  { img: 'pc-keyboard', to: 'keyboard', label: 'Computer + keyboard', ready: true },
  { img: 'pc-controller', to: 'controller', label: 'Computer + Xbox / PlayStation controller', ready: true },
  { img: 'tablet-touch', to: 'touch', label: 'Tablet touch screen', ready: true },
  { img: 'phone-touch', to: 'touch', label: 'Phone touch screen', ready: true },
  { img: 'tablet-controller', to: 'touch', label: 'Tablet + controller', ready: true },
  { img: 'phone-controller', to: 'touch', label: 'Phone + controller', ready: true },
];

let homeEl = null;
let callbacks = {};
let pollTimer = null;
let lastPadA = false;
let lastPadStart = false;
let lastStickX = 0;
let lastStickY = 0;

function safeLoadProfile() {
  try {
    const res = loadProfile(typeof localStorage !== 'undefined' ? localStorage : null);
    return res.status === 'ok' ? res.profile : null;
  } catch {
    return null;
  }
}

export function initHome(cbs = {}) {
  callbacks = cbs;
  homeEl = document.getElementById('home');
  if (!homeEl) return;

  renderHome();
  window.addEventListener('gamepadconnected', refreshHomeHints);
  window.addEventListener('gamepaddisconnected', refreshHomeHints);
}

export function refreshHomeHints() {
  if (!homeEl) return;
  const hints = homeEl.querySelectorAll('[data-pad-hint]');
  hints.forEach(el => {
    const raw = el.dataset.padHint || el.textContent;
    el.textContent = padText(raw);
  });
  const statusEl = homeEl.querySelector('#hm-pad-status');
  if (statusEl) {
    const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    statusEl.textContent = gps.length > 0
      ? `🎮 ${gps.length} controller(s) connected`
      : '🎮 No controller detected';
  }
}

export function renderHome() {
  if (!homeEl) return;
  const profile = safeLoadProfile();
  const careerSub = profile
    ? `Continue — ${String(profile.player?.name || 'Player').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)}`  // name is shown as text, never markup
    : 'Your player, your road from club courts to the Premier Finals.';

  homeEl.innerHTML = `
    <!-- Top-down court lines decoration -->
    <svg class="pl-bg-court" viewBox="0 0 100 200" preserveAspectRatio="none">
      <rect x="2" y="2" width="96" height="196" fill="none" stroke="rgba(255,255,255,0.035)" stroke-width="1"/>
      <line x1="2" y1="100" x2="98" y2="100" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
      <line x1="2" y1="30.5" x2="98" y2="30.5" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      <line x1="2" y1="169.5" x2="98" y2="169.5" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      <line x1="50" y1="30.5" x2="50" y2="169.5" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </svg>

    <header class="hm-topbar">
      <div class="hm-brand">
        <div class="hm-logo">PADEL <span>LEGENDS</span></div>
        <div class="hm-tour-tag">MESUT PADEL TOUR</div>
      </div>
      <div class="hm-top-right">
        <span class="hm-pad-hint" id="hm-pad-status">🎮 Checking controller…</span>
        <span class="hm-dev">Developer: <b>Mesut</b></span>
      </div>
    </header>

    <main class="hm-main">
      <div class="hm-hero-title">SELECT GAME MODE</div>
      <div class="hm-cards" role="region" aria-label="Game Modes">
        <!-- Card 1: FRIENDLY MATCH -->
        <button type="button" class="hm-card" id="hm-card-friendly" tabindex="0">
          <div class="hm-card-badge">INSTANT PLAY</div>
          <div class="hm-card-icon">🎾</div>
          <div class="hm-card-title">FRIENDLY MATCH</div>
          <div class="hm-card-sub">Play now — solo vs AI, with friends on this computer, or online with a friend.</div>
          <div class="hm-card-action">ENTER LOBBY →</div>
        </button>

        <!-- Card 2: CAREER -->
        <button type="button" class="hm-card is-primary" id="hm-card-career" tabindex="0">
          <div class="hm-card-badge">${profile ? 'ACTIVE CAREER' : 'SINGLE PLAYER'}</div>
          <div class="hm-card-icon">🏆</div>
          <div class="hm-card-title">CAREER</div>
          <div class="hm-card-sub">${careerSub}</div>
          <div class="hm-card-action">${profile ? 'CONTINUE CAREER →' : 'START CAREER →'}</div>
        </button>

        <!-- Card 3: FRIENDS CUP -->
        <button type="button" class="hm-card is-passive" id="hm-card-cup" tabindex="0">
          <div class="hm-card-badge is-notice">COMING SOON</div>
          <div class="hm-card-icon">🌐</div>
          <div class="hm-card-title">FRIENDS CUP</div>
          <div class="hm-card-sub">Create a tournament, invite your friends, play at set times. Missing players? AI steps in.</div>
          <div class="hm-card-action is-passive">Needs an online server — coming soon</div>
        </button>
      </div>

      <div class="hm-howto" aria-label="Ways to play">
        ${HOWTO.filter(h => h.ready).map(h => `<a class="hm-howto-item" href="kontroller.html#${h.to}" target="_blank" rel="noopener"><img src="assets/howto/${h.img}.webp" alt="${h.label}" width="640" height="482" loading="lazy"><span>${h.label}</span></a>`).join('')}
      </div>

      <div class="hm-notice-toast" id="hm-cup-toast" hidden>
        <span>Friends Cup requires an online tournament server. Coming soon in an upcoming update!</span>
      </div>
    </main>

    <footer class="hm-bottom-bar">
      <div class="hm-actions-row">
        <button type="button" class="hm-btn" id="hm-btn-training" tabindex="0">🎓 Training</button>
        <button type="button" class="hm-btn" id="hm-btn-settings" tabindex="0">⚙️ Settings</button>
        <button type="button" class="hm-btn" id="hm-btn-controls" tabindex="0">⌨️ Controls</button>
        <button type="button" class="hm-btn fs-btn-sync" id="hm-btn-fullscreen" tabindex="0" title="Fullscreen">⛶ Fullscreen</button>
        ${profile ? '<button type="button" class="hm-btn" id="hm-btn-profile" tabindex="0">👤 Profile</button>' : ''}
        <a class="hm-privacy" href="privacy.html" target="_blank" rel="noopener">Privacy</a>
      </div>
      <div class="hm-footer-hint" data-pad-hint="←/→ Move · A Select · Start Settings">
        ${padText('←/→ Move · A Select · Start Settings')}
      </div>
    </footer>
  `;

  // Wire events
  homeEl.querySelector('#hm-card-friendly').onclick = () => callbacks.onFriendly?.();
  homeEl.querySelector('#hm-card-career').onclick = () => callbacks.onCareer?.();
  const cupBtn = homeEl.querySelector('#hm-card-cup');
  const cupToast = homeEl.querySelector('#hm-cup-toast');
  cupBtn.onclick = () => {
    if (cupToast) {
      cupToast.hidden = false;
      setTimeout(() => { if (cupToast) cupToast.hidden = true; }, 3200);
    }
  };

  homeEl.querySelector('#hm-btn-training').onclick = () => callbacks.onTraining?.();
  homeEl.querySelector('#hm-btn-settings').onclick = () => callbacks.onOpenSettings?.();
  homeEl.querySelector('#hm-btn-controls').onclick = () => callbacks.onOpenControls?.();
  homeEl.querySelector('#hm-btn-fullscreen').onclick = () => toggleFullscreen();
  const profBtn = homeEl.querySelector('#hm-btn-profile');
  if (profBtn) profBtn.onclick = () => callbacks.onOpenProfile?.();

  refreshHomeHints();
}

function pollHomeGamepad() {
  if (!homeEl || homeEl.hidden) return;
  const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
  if (gps.length > 0) {
    const pad = gps[0];
    const a = pad.buttons[0]?.pressed;
    const start = pad.buttons[9]?.pressed;
    const [sx, sy] = padDir(pad);

    if (Math.abs(sx) > 0.6 && Math.abs(lastStickX) <= 0.6) {
      spatialFocus(homeEl, Math.sign(sx), 0);
    }
    if (Math.abs(sy) > 0.6 && Math.abs(lastStickY) <= 0.6) {
      spatialFocus(homeEl, 0, Math.sign(sy));
    }

    if (a && !lastPadA) {
      const active = document.activeElement;
      if (active && typeof active.click === 'function' && homeEl.contains(active)) {
        active.click();
      } else {
        const first = homeEl.querySelector('#hm-card-friendly');
        first?.focus();
      }
    }

    if (start && !lastPadStart) {
      callbacks.onOpenSettings?.();
    }

    lastPadA = !!a;
    lastPadStart = !!start;
    lastStickX = sx;
    lastStickY = sy;
  }
  pollTimer = requestAnimationFrame(pollHomeGamepad);
}

export function showHome() {
  if (!homeEl) return;
  renderHome();
  homeEl.hidden = false;
  const first = homeEl.querySelector('.hm-card.is-primary') || homeEl.querySelector('.hm-card');
  first?.focus();
  if (pollTimer) cancelAnimationFrame(pollTimer);
  pollTimer = requestAnimationFrame(pollHomeGamepad);
}

export function hideHome() {
  if (!homeEl) return;
  homeEl.hidden = true;
  if (pollTimer) {
    cancelAnimationFrame(pollTimer);
    pollTimer = null;
  }
}
