// Settings Modal UI for Padel Legends
// Controls: Keyboard + Controller / Keyboard only / Controller only (Xbox / PlayStation)
// Speed: Slow (0.7) / Normal (0.85) / Fast (1.0)

import { loadSettings, saveSettings, VALID_CONTROLS, VALID_SPEEDS } from './settings.js';
import { padText } from './padstyle.js';
import { padDir, spatialFocus } from './padnav.js';

let modalEl = null;
let onSaveCallback = null;
let pollTimer = null;
let lastPadA = false;
let lastPadB = false;
let lastStickX = 0;
let lastStickY = 0;

export function initSettingsModal({ onSaved } = {}) {
  onSaveCallback = onSaved;
  modalEl = document.getElementById('settings-modal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'settings-modal';
    modalEl.className = 'sm-overlay';
    modalEl.hidden = true;
    document.body.appendChild(modalEl);
  }

  window.addEventListener('gamepadconnected', refreshModalHints);
  window.addEventListener('gamepaddisconnected', refreshModalHints);
}

function refreshModalHints() {
  if (!modalEl) return;
  const hintEl = modalEl.querySelector('#sm-pad-hint');
  if (hintEl) hintEl.textContent = padText('A Save · B Close');
}

export function openSettingsModal() {
  if (!modalEl) initSettingsModal();
  const current = loadSettings();
  let selControl = current.control;
  let selSpeed = current.speed;

  modalEl.innerHTML = `
    <div class="sm-card" role="dialog" aria-modal="true" aria-labelledby="sm-title">
      <div class="sm-head">
        <h2 class="sm-title" id="sm-title">GAME SETTINGS</h2>
        <button type="button" class="sm-close" id="sm-btn-close" aria-label="Close">✕</button>
      </div>

      <div class="sm-body">
        <div class="sm-section-label">CONTROLS (PLAYER 1)</div>
        <div class="sm-options-grid" id="sm-control-options">
          <button type="button" class="sm-opt ${selControl === 'auto' ? 'is-selected' : ''}" data-ctrl="auto" tabindex="0">
            <span class="sm-opt-icon">⌨️ + 🎮</span>
            <span class="sm-opt-name">Keyboard + Controller</span>
            <span class="sm-opt-sub">Auto-detect connected pad</span>
            <span class="sm-check">✓</span>
          </button>
          <button type="button" class="sm-opt ${selControl === 'kb' ? 'is-selected' : ''}" data-ctrl="kb" tabindex="0">
            <span class="sm-opt-icon">⌨️</span>
            <span class="sm-opt-name">Keyboard only</span>
            <span class="sm-opt-sub">WASD + Space / J</span>
            <span class="sm-check">✓</span>
          </button>
          <button type="button" class="sm-opt ${selControl === 'pad' ? 'is-selected' : ''}" data-ctrl="pad" tabindex="0">
            <span class="sm-opt-icon">🎮</span>
            <span class="sm-opt-name">Controller only</span>
            <span class="sm-opt-sub">Xbox / PlayStation</span>
            <span class="sm-check">✓</span>
          </button>
        </div>

        <div class="sm-section-label">GAME SPEED</div>
        <div class="sm-speed-row" id="sm-speed-options">
          <button type="button" class="sm-speed-btn ${selSpeed === 0.7 ? 'is-selected' : ''}" data-spd="0.7" tabindex="0">
            Slow (70%)
          </button>
          <button type="button" class="sm-speed-btn ${selSpeed === 0.85 ? 'is-selected' : ''}" data-spd="0.85" tabindex="0">
            Normal (85%)
          </button>
          <button type="button" class="sm-speed-btn ${selSpeed === 1 ? 'is-selected' : ''}" data-spd="1" tabindex="0">
            Fast (100% Real)
          </button>
        </div>
      </div>

      <div class="sm-foot">
        <div class="sm-pad-hint" id="sm-pad-hint">${padText('A Save · B Close')}</div>
        <div class="sm-foot-actions">
          <button type="button" class="sm-btn is-cancel" id="sm-btn-cancel" tabindex="0">Cancel</button>
          <button type="button" class="sm-btn is-save" id="sm-btn-save" tabindex="0">Save Settings</button>
        </div>
      </div>
    </div>
  `;

  // Option click handlers
  modalEl.querySelectorAll('#sm-control-options .sm-opt').forEach(btn => {
    btn.onclick = () => {
      selControl = btn.dataset.ctrl;
      modalEl.querySelectorAll('#sm-control-options .sm-opt').forEach(b => b.classList.toggle('is-selected', b === btn));
    };
  });

  modalEl.querySelectorAll('#sm-speed-options .sm-speed-btn').forEach(btn => {
    btn.onclick = () => {
      selSpeed = parseFloat(btn.dataset.spd);
      modalEl.querySelectorAll('#sm-speed-options .sm-speed-btn').forEach(b => b.classList.toggle('is-selected', b === btn));
    };
  });

  function close() {
    modalEl.hidden = true;
    if (pollTimer) {
      cancelAnimationFrame(pollTimer);
      pollTimer = null;
    }
  }

  function save() {
    const updated = saveSettings({ control: selControl, speed: selSpeed });
    // Also sync legacy form inputs if in DOM
    const oldCtrl = document.getElementById('control');
    if (oldCtrl) oldCtrl.value = updated.control;
    const oldSpeed = document.getElementById('speed');
    if (oldSpeed) oldSpeed.value = String(updated.speed);

    onSaveCallback?.(updated);
    close();
  }

  modalEl.querySelector('#sm-btn-close').onclick = close;
  modalEl.querySelector('#sm-btn-cancel').onclick = close;
  modalEl.querySelector('#sm-btn-save').onclick = save;

  modalEl.hidden = false;
  refreshModalHints();
  const first = modalEl.querySelector('.sm-opt.is-selected') || modalEl.querySelector('.sm-opt');
  first?.focus();

  function pollModalPad() {
    if (modalEl.hidden) return;
    const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    if (gps.length > 0) {
      const pad = gps[0];
      const a = pad.buttons[0]?.pressed;
      const b = pad.buttons[1]?.pressed;
      const [sx, sy] = padDir(pad);

      if (Math.abs(sx) > 0.6 && Math.abs(lastStickX) <= 0.6) {
        spatialFocus(modalEl, Math.sign(sx), 0);
      }
      if (Math.abs(sy) > 0.6 && Math.abs(lastStickY) <= 0.6) {
        spatialFocus(modalEl, 0, Math.sign(sy));
      }

      if (a && !lastPadA) {
        const active = document.activeElement;
        if (active && modalEl.contains(active) && typeof active.click === 'function') {
          active.click();
        }
      }

      if (b && !lastPadB) {
        close();
      }

      lastPadA = !!a;
      lastPadB = !!b;
      lastStickX = sx;
      lastStickY = sy;
    }
    pollTimer = requestAnimationFrame(pollModalPad);
  }

  if (pollTimer) cancelAnimationFrame(pollTimer);
  pollTimer = requestAnimationFrame(pollModalPad);
}
