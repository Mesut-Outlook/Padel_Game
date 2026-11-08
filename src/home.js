// HOME Screen for Padel Legends — Live Lobby
// Left column: Match type selectors, big PLAY NOW button, Invite a friend, Play vs AI + Customize
// Right column: Open games list with live dot, or empty / offline state
// Header: Name badge with inline editing, controller status
// Footer: Career, Training, Settings, Controls, Fullscreen, Profile, Privacy, Contact

import { padText } from './padstyle.js';
import { padDir, spatialFocus } from './padnav.js';
import { loadProfile } from './career.js';
import { toggleFullscreen } from './fullscreen.js';
import { t } from './i18n.js';
import { drawFlag } from './flags.js';
import characters from '../data/characters.json' with { type: 'json' };

// ways to play, pictured on HOME (public/assets/howto/), each linking to its part of kontroller.html; ready = shown.
const HOWTO = [
  { img: 'pc-keyboard', to: 'keyboard', label: () => t('Computer + keyboard'), ready: true },
  { img: 'pc-controller', to: 'controller', label: () => t('Computer + Xbox / PlayStation controller'), ready: true },
  { img: 'tablet-touch', to: 'touch', label: () => t('Tablet touch screen'), ready: true },
  { img: 'phone-touch', to: 'touch', label: () => t('Phone touch screen'), ready: true },
  { img: 'tablet-controller', to: 'touch', label: () => t('Tablet + controller'), ready: true },
  { img: 'phone-controller', to: 'touch', label: () => t('Phone + controller'), ready: true },
];

let homeEl = null;
let callbacks = {};
let pollTimer = null;
let lastPadA = false;
let lastPadStart = false;
let lastStickX = 0;
let lastStickY = 0;

let quickPick = { players: 2, mode: 'team' };
let lastRows = [];
let lastServerReady = true;

const flagCache = new Map();

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

function getFlagDataUrl(countryCode) {
  if (!countryCode) return '';
  if (flagCache.has(countryCode)) return flagCache.get(countryCode);
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    if (!canvas || typeof canvas.getContext !== 'function') return '';
    canvas.width = 24;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx && drawFlag(ctx, countryCode, 0, 0, 24, 16)) {
      const url = canvas.toDataURL();
      flagCache.set(countryCode, url);
      return url;
    }
  } catch {}
  flagCache.set(countryCode, '');
  return '';
}

function safeLoadProfile() {
  try {
    const res = loadProfile(typeof localStorage !== 'undefined' ? localStorage : null);
    return res.status === 'ok' ? res.profile : null;
  } catch {
    return null;
  }
}

function loadQuickPick() {
  try {
    const raw = localStorage.getItem('padel.quick.v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      const players = parsed?.players === 4 ? 4 : 2;
      const mode = parsed?.mode === 'face' ? 'face' : 'team';
      return { players, mode };
    }
  } catch {}
  return { players: 2, mode: 'team' };
}

function saveQuickPick(pick) {
  try {
    localStorage.setItem('padel.quick.v1', JSON.stringify({
      players: pick.players === 4 ? 4 : 2,
      mode: pick.mode === 'face' ? 'face' : 'team'
    }));
  } catch {}
}

export function getQuickPick() {
  return { ...quickPick };
}

function initOnlineName() {
  try {
    let name = localStorage.getItem('padel.onlineName');
    if (!name || !name.trim()) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      name = `Player ${rand}`;
      localStorage.setItem('padel.onlineName', name);
    }
    return name.trim().slice(0, 16);
  } catch {
    return 'Player 1234';
  }
}

export function getOnlineName() {
  try {
    const name = localStorage.getItem('padel.onlineName');
    if (name && name.trim()) return name.trim().slice(0, 16);
  } catch {}
  return initOnlineName();
}

function saveOnlineName(name) {
  const clean = (name || '').trim().slice(0, 16);
  if (!clean) return;
  try {
    localStorage.setItem('padel.onlineName', clean);
  } catch {}
}

export function initHome(cbs = {}) {
  callbacks = cbs;
  homeEl = document.getElementById('home');
  if (!homeEl) return;

  quickPick = loadQuickPick();
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
      ? t('🎮 {n} controller(s) connected', { n: gps.length })
      : t('🎮 No controller detected');
  }
}

function updatePickUi() {
  if (!homeEl) return;
  const btnSingles = homeEl.querySelector('#hm-pick-singles');
  const btnDoubles = homeEl.querySelector('#hm-pick-doubles');
  const modeSeg = homeEl.querySelector('#hm-mode-segment');
  const btnTeam = homeEl.querySelector('#hm-pick-team');
  const btnFace = homeEl.querySelector('#hm-pick-face');
  const descEl = homeEl.querySelector('#hm-pick-desc');

  if (btnSingles && btnDoubles) {
    btnSingles.classList.toggle('is-active', quickPick.players === 2);
    btnDoubles.classList.toggle('is-active', quickPick.players === 4);
  }
  if (modeSeg) {
    modeSeg.hidden = quickPick.players !== 4;
  }
  if (btnTeam && btnFace) {
    btnTeam.classList.toggle('is-active', quickPick.mode === 'team');
    btnFace.classList.toggle('is-active', quickPick.mode === 'face');
  }
  if (descEl) {
    if (quickPick.players === 4) {
      const modeText = quickPick.mode === 'face'
        ? t('You against another player, each with an AI partner.')
        : t('You and another player vs two AI players.');
      const aiText = t('Empty seats are played by the AI.');
      descEl.textContent = `${modeText} ${aiText}`;
      descEl.hidden = false;
    } else {
      descEl.textContent = '';
      descEl.hidden = true;
    }
  }
}

function renderOpenGamesList() {
  if (!homeEl) return;
  const listEl = homeEl.querySelector('#hm-games-list');
  if (!listEl) return;

  if (!lastServerReady) {
    listEl.innerHTML = `<div class="hm-games-empty">${t('Online play is not open yet.')}</div>`;
    return;
  }

  if (lastRows.length === 0) {
    listEl.innerHTML = `<div class="hm-games-empty">${t('Nobody is waiting right now — be the first.')}</div>`;
    return;
  }

  const items = lastRows.map(row => {
    const charIdx = typeof row.char === 'number' ? row.char : -1;
    const charObj = charIdx >= 0 && charIdx < characters.length ? characters[charIdx] : null;
    const cc = charObj?.countryCode;
    const flagUrl = getFlagDataUrl(cc);
    const host = escapeHtml(row.host || 'Player');
    const code = escapeHtml(row.code || '');
    const isSingles = row.players === 2;
    const isTeam = row.mode === 'team';
    const total = isSingles ? 2 : (isTeam ? 2 : 4);
    const free = typeof row.free === 'number' ? row.free : 1;
    const taken = Math.max(1, Math.min(total, total - free));
    const typeStr = isSingles
      ? `${t('Singles')} ${taken}/${total}`
      : `${t('Doubles')} · ${isTeam ? t('Team up') : t('Face off')} ${taken}/${total}`;

    return `
      <div class="hm-game-row">
        <div class="hm-game-info">
          ${flagUrl ? `<img class="hm-game-flag" src="${flagUrl}" alt="${escapeHtml(cc)}" width="24" height="16">` : ''}
          <span class="hm-game-host">${host}</span>
          <span class="hm-game-type">${typeStr}</span>
        </div>
        <button type="button" class="hm-btn hm-btn-join" data-code="${code}" tabindex="0">${t('Join')}</button>
      </div>
    `;
  }).join('');

  listEl.innerHTML = items;

  listEl.querySelectorAll('.hm-btn-join').forEach(btn => {
    btn.onclick = () => {
      const code = btn.dataset.code;
      if (code) callbacks.onJoin?.(code);
    };
  });
}

export function setOpenGames(rows, serverReady = true) {
  lastRows = Array.isArray(rows) ? rows : [];
  lastServerReady = serverReady !== false;
  renderOpenGamesList();
}

export function renderHome() {
  if (!homeEl) return;
  const profile = safeLoadProfile();
  const onlineName = getOnlineName();

  homeEl.innerHTML = `
    <!-- Top-down court lines decoration -->
    <svg class="pl-bg-court" viewBox="0 0 100 200" preserveAspectRatio="none">
      <rect x="2" y="2" width="96" height="196" fill="none" stroke="rgba(15,23,42,0.035)" stroke-width="1"/>
      <line x1="2" y1="100" x2="98" y2="100" stroke="rgba(15,23,42,0.06)" stroke-width="1.5"/>
      <line x1="2" y1="30.5" x2="98" y2="30.5" stroke="rgba(15,23,42,0.04)" stroke-width="1"/>
      <line x1="2" y1="169.5" x2="98" y2="169.5" stroke="rgba(15,23,42,0.04)" stroke-width="1"/>
      <line x1="50" y1="30.5" x2="50" y2="169.5" stroke="rgba(15,23,42,0.04)" stroke-width="1"/>
    </svg>

    <header class="hm-topbar">
      <div class="hm-brand">
        <div class="hm-logo">PADEL <span>LEGENDS</span></div>
        <div class="hm-tour-tag">MESUT PADEL TOUR</div>
      </div>
      <div class="hm-top-right">
        <span class="hm-pad-hint" id="hm-pad-status">${t('🎮 Checking controller…')}</span>
        <div class="hm-name-box">
          <div class="hm-name-row">
            <button type="button" class="hm-name-badge" id="hm-name-badge" tabindex="0" title="${t('Edit name')}">
              <span class="hm-name-text" id="hm-name-text">${escapeHtml(onlineName)}</span>
              <span class="hm-name-icon" aria-hidden="true">✎</span>
            </button>
            <input type="text" class="hm-name-input" id="hm-name-input" maxlength="16" value="${escapeHtml(onlineName)}" hidden aria-label="${t('Edit name')}">
          </div>
          <span class="hm-name-note">${t("Visible to other players — don't use your real name.")}</span>
        </div>
      </div>
    </header>

    <main class="hm-main">
      <div class="hm-cols">
        <!-- Left Column: Match configuration & Play Now -->
        <section class="hm-col hm-col-left" aria-label="${t('Match')}">
          <div class="hm-pick-section">
            <div class="hm-segment" role="group" aria-label="${t('Singles')} / ${t('Doubles')}">
              <button type="button" class="hm-seg-btn ${quickPick.players === 2 ? 'is-active' : ''}" id="hm-pick-singles" tabindex="0">${t('Singles')}</button>
              <button type="button" class="hm-seg-btn ${quickPick.players === 4 ? 'is-active' : ''}" id="hm-pick-doubles" tabindex="0">${t('Doubles')}</button>
            </div>
            <div class="hm-segment hm-mode-segment" id="hm-mode-segment" role="group" aria-label="${t('Team up')} / ${t('Face off')}" ${quickPick.players === 4 ? '' : 'hidden'}>
              <button type="button" class="hm-seg-btn ${quickPick.mode === 'team' ? 'is-active' : ''}" id="hm-pick-team" tabindex="0">${t('Team up')}</button>
              <button type="button" class="hm-seg-btn ${quickPick.mode === 'face' ? 'is-active' : ''}" id="hm-pick-face" tabindex="0">${t('Face off')}</button>
            </div>
            <div class="hm-pick-desc" id="hm-pick-desc" ${quickPick.players === 4 ? '' : 'hidden'}>
              ${quickPick.players === 4 ? `${quickPick.mode === 'face' ? t('You against another player, each with an AI partner.') : t('You and another player vs two AI players.')} ${t('Empty seats are played by the AI.')}` : ''}
            </div>
          </div>

          <button type="button" class="hm-play-now" id="hm-btn-play-now" tabindex="0">
            ${t('PLAY NOW')}
          </button>

          <div class="hm-sub-actions">
            <button type="button" class="hm-btn-sec" id="hm-btn-invite" tabindex="0">${t('Invite a friend')}</button>
            <div class="hm-ai-row">
              <button type="button" class="hm-btn-sec" id="hm-btn-play-ai" tabindex="0">${t('Play vs AI')}</button>
              <button type="button" class="hm-link-btn" id="hm-link-customize" tabindex="0">${t('Customize')}</button>
            </div>
          </div>
        </section>

        <!-- Right Column: Open Games -->
        <section class="hm-col hm-col-right" aria-label="${t('Open games')}">
          <div class="hm-games-header">
            <h2 class="hm-games-title">
              <span class="hm-live-dot" aria-hidden="true"></span>
              ${t('Open games')}
            </h2>
          </div>
          <div class="hm-games-list" id="hm-games-list" role="list"></div>
        </section>
      </div>

      <div class="hm-howto" aria-label="${t('Ways to play')}">
        ${HOWTO.filter(h => h.ready).map(h => `<a class="hm-howto-item" href="kontroller.html#${h.to}" target="_blank" rel="noopener"><img src="assets/howto/${h.img}.webp" alt="${h.label()}" width="640" height="482" loading="lazy"><span>${h.label()}</span></a>`).join('')}
      </div>
    </main>

    <footer class="hm-bottom-bar">
      <div class="hm-actions-row">
        <button type="button" class="hm-btn" id="hm-btn-career" tabindex="0">🏆 ${t('Career')}</button>
        <button type="button" class="hm-btn" id="hm-btn-training" tabindex="0">🎓 ${t('Training')}</button>
        <button type="button" class="hm-btn" id="hm-btn-settings" tabindex="0">⚙️ ${t('Settings')}</button>
        <button type="button" class="hm-btn" id="hm-btn-controls" tabindex="0">⌨️ ${t('Controls')}</button>
        <button type="button" class="hm-btn fs-btn-sync" id="hm-btn-fullscreen" tabindex="0" title="${t('Fullscreen')}">⛶ ${t('Fullscreen')}</button>
        ${profile ? `<button type="button" class="hm-btn" id="hm-btn-profile" tabindex="0">👤 ${t('Profile')}</button>` : ''}
        <a class="hm-privacy" href="privacy.html" target="_blank" rel="noopener">Privacy</a>
        <a class="hm-privacy" href="mailto:contact@padellegends.eu">✉ contact@padellegends.eu</a>
      </div>
      <div class="hm-footer-hint" data-pad-hint="${t('←/→ Move · A Select · Start Settings')}">
        ${padText(t('←/→ Move · A Select · Start Settings'))}
      </div>
    </footer>
  `;

  // Wire inline name edit
  const nameBadge = homeEl.querySelector('#hm-name-badge');
  const nameInput = homeEl.querySelector('#hm-name-input');
  const nameText = homeEl.querySelector('#hm-name-text');

  function startEditingName() {
    if (!nameBadge || !nameInput) return;
    nameBadge.hidden = true;
    nameInput.hidden = false;
    nameInput.value = getOnlineName();
    nameInput.focus();
    nameInput.select();
  }

  function finishEditingName(save) {
    if (!nameBadge || !nameInput) return;
    if (save) {
      const val = nameInput.value.trim().slice(0, 16);
      if (val) {
        saveOnlineName(val);
        if (nameText) nameText.textContent = val;
      }
    }
    nameInput.hidden = true;
    nameBadge.hidden = false;
    nameBadge.focus();
  }

  if (nameBadge && nameInput) {
    nameBadge.onclick = () => startEditingName();
    nameInput.onblur = () => finishEditingName(true);
    nameInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        finishEditingName(true);
      } else if (e.key === 'Escape') {
        finishEditingName(false);
      }
    };
  }

  // Wire match picker events
  homeEl.querySelector('#hm-pick-singles').onclick = () => {
    quickPick.players = 2;
    saveQuickPick(quickPick);
    updatePickUi();
  };
  homeEl.querySelector('#hm-pick-doubles').onclick = () => {
    quickPick.players = 4;
    saveQuickPick(quickPick);
    updatePickUi();
  };
  homeEl.querySelector('#hm-pick-team').onclick = () => {
    quickPick.mode = 'team';
    saveQuickPick(quickPick);
    updatePickUi();
  };
  homeEl.querySelector('#hm-pick-face').onclick = () => {
    quickPick.mode = 'face';
    saveQuickPick(quickPick);
    updatePickUi();
  };

  // Wire action buttons
  homeEl.querySelector('#hm-btn-play-now').onclick = () => {
    callbacks.onPlayNow?.(getQuickPick());
  };
  homeEl.querySelector('#hm-btn-invite').onclick = () => {
    callbacks.onInvite?.(getQuickPick());
  };
  homeEl.querySelector('#hm-btn-play-ai').onclick = () => {
    callbacks.onPlayAI?.();
  };
  homeEl.querySelector('#hm-link-customize').onclick = () => {
    callbacks.onCustomize?.();
  };

  // Wire footer actions
  homeEl.querySelector('#hm-btn-career').onclick = () => callbacks.onCareer?.();
  homeEl.querySelector('#hm-btn-training').onclick = () => callbacks.onTraining?.();
  homeEl.querySelector('#hm-btn-settings').onclick = () => callbacks.onOpenSettings?.();
  homeEl.querySelector('#hm-btn-controls').onclick = () => callbacks.onOpenControls?.();
  homeEl.querySelector('#hm-btn-fullscreen').onclick = () => toggleFullscreen();
  const profBtn = homeEl.querySelector('#hm-btn-profile');
  if (profBtn) profBtn.onclick = () => callbacks.onOpenProfile?.();

  refreshHomeHints();
  renderOpenGamesList();
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
        const first = homeEl.querySelector('#hm-btn-play-now') || homeEl.querySelector('button');
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
  const first = homeEl.querySelector('#hm-btn-play-now') || homeEl.querySelector('button');
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
