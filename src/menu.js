// Broadcast-quality visual menu for Padel Legends.
// Integrates with existing HTML form inputs (#mode, #char, #venue, #racket, etc.) as the single source of truth.
// Styles are authored in index.html under the .pl-* class hierarchy.
import { track } from './track.js';
import * as THREE from 'three';
import characters from '../data/characters.json';
import venues from '../data/venues.json';
import rackets from '../data/rackets.json';
import { createAvatar } from './player.js';
import { getPortraitThumb, getVenueThumb, getRacketThumb, disposeThumbs } from './thumbs.js';
import { openCareer } from './careerui.js';
import { padDir, spatialFocus } from './padnav.js';
import { padText } from './padstyle.js';
import { loadSettings, saveSettings } from './settings.js';
import { toggleFullscreen } from './fullscreen.js';
import { charCard } from './charcard.js';
import { t } from './i18n.js';

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function countryFlag(cc) {
  if (!cc || cc.length !== 2) return '';
  const codePoints = cc.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

let previewApi = null;
let setWizardWhereFn = null;
export function setCareerPreview(ch, rk, infoHtml, badgeText) {
  return previewApi?.setCustomPreview(ch, rk, infoHtml, badgeText);
}
export function restoreQuickMatchPreview() {
  return previewApi?.restoreQuickMatch();
}
export function setCareerGamepadHandler(fn) {
  return previewApi?.setPadHandler(fn);
}
export function setWizardWhere(where, room) {
  return setWizardWhereFn?.(where, room);
}

let disposeFn = null;
export const disposeMenu = () => disposeFn?.();

export function initMenu() {
  const menuEl = $('menu');
  if (!menuEl) return;

  // Keep the legacy .card hidden so original form controls stay in DOM as single source of truth
  const oldCard = menuEl.querySelector('.card');
  if (oldCard) oldCard.style.display = 'none';

  // Remove previous instance if any
  const prevShell = menuEl.querySelector('.pl-shell');
  if (prevShell) prevShell.remove();

  const shell = document.createElement('div');
  shell.className = 'pl-shell';
  shell.innerHTML = `
    <!-- Top-down decorative court lines -->
    <svg class="pl-bg-court" viewBox="0 0 100 200" preserveAspectRatio="none">
      <rect x="2" y="2" width="96" height="196" fill="none" stroke="rgba(255,255,255,0.035)" stroke-width="1"/>
      <line x1="2" y1="100" x2="98" y2="100" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
      <line x1="2" y1="30.5" x2="98" y2="30.5" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      <line x1="2" y1="169.5" x2="98" y2="169.5" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      <line x1="50" y1="30.5" x2="50" y2="169.5" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </svg>

    <!-- Topbar -->
    <header class="pl-topbar">
      <div class="pl-brand">
        <div class="pl-logo">PADEL <span>LEGENDS</span></div>
        <div class="pl-tour-tag">MESUT PADEL TOUR</div>
      </div>
      <div class="pl-top-right">
        <button type="button" class="pl-home-top-btn is-home" id="pl-home-btn" title="${t('Back to the home screen (Esc)')}">🏠 ${t('HOME')}</button>
        <button type="button" class="pl-home-top-btn fs-btn-sync" id="pl-fs-btn" title="${t('Fullscreen (F)')}">⛶ ${t('Fullscreen')}</button>
        <span class="pl-pad-hint" id="pl-pad-status">${t('🎮 Checking controller…')}</span>
        <a class="pl-dev" href="kontroller.html" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;margin-right:14px">⌨ <b>${t('Controls')}</b></a>
        <span class="pl-dev">${t('Developer: <b>Mesut</b>')}</span>
      </div>
    </header>

    <!-- Main 2-column layout (~38% / ~62%) -->
    <main class="pl-main">
      <!-- Left Panel: Live 3D Avatar Preview -->
      <section class="pl-left-panel">
        <div class="pl-preview-stage">
          <canvas id="pl-preview-canvas" class="pl-preview-canvas"></canvas>
          <div class="pl-preview-badge">${t('LIVE PREVIEW')}</div>
          <div class="pl-preview-racket-pill" id="pl-preview-racket-pill">Starter Nova</div>
          <button type="button" class="pl-preview-nav is-prev" data-step="-1" aria-label="${t('Previous player')}">‹</button>
          <button type="button" class="pl-preview-nav is-next" data-step="1" aria-label="${t('Next player')}">›</button>
        </div>
        <div class="pl-char-info" id="pl-char-info">
          <!-- Populated dynamically -->
        </div>
      </section>

      <!-- Right Panel: Step Tabs + Step Body + Step Footer -->
      <section class="pl-right-panel">
        <nav class="pl-tabs" role="tablist">
          <button type="button" class="pl-tab is-active" data-step="0"><span class="pl-tab-num">1</span>${t('Mode')}</button>
          <button type="button" class="pl-tab" data-step="1"><span class="pl-tab-num">2</span>${t('Player')}</button>
          <button type="button" class="pl-tab" data-step="2"><span class="pl-tab-num">3</span>${t('Venue')}</button>
          <button type="button" class="pl-tab" data-step="3"><span class="pl-tab-num">4</span>${t('Racket')}</button>
          <button type="button" class="pl-tab" data-step="4"><span class="pl-tab-num">5</span>${t('Match')}</button>
        </nav>

        <div class="pl-step-body">
          <!-- Step 0: Mode -->
          <div class="pl-step" data-step="0">
            <div class="pl-section-label">${t('WHERE TO PLAY?')}</div>
            <div class="pl-where-grid" id="pl-where-grid">
              <button type="button" class="pl-card pl-where-card is-selected" data-where="local">
                <div class="pl-card-title">🖥️ ${t('On this computer')}</div>
                <div class="pl-card-sub">${t('Local couch match · Keyboard or gamepads')}</div>
                <span class="pl-check">✓</span>
              </button>
              <button type="button" class="pl-card pl-where-card" data-where="online">
                <div class="pl-card-title">🌐 ${t('Online with a friend')}</div>
                <div class="pl-card-sub">${t('Play over network with a room code')}</div>
                <span class="pl-check">✓</span>
              </button>
            </div>

            <div class="pl-online-section" id="pl-online-section" hidden>
              <div class="pl-section-label">${t('ONLINE ROOM')}</div>
              <div class="pl-room-link-box">
                <div style="font-weight:700;font-size:13px;white-space:nowrap;">${t('ROOM CODE:')} <b id="pl-room-code-val" style="color:var(--acc);letter-spacing:1px;">------</b></div>
                <input type="text" readonly id="pl-room-link-input" class="pl-room-link-input" value="">
                <button type="button" id="pl-copy-link-btn" class="pl-copy-btn">📋 ${t('Copy Link')}</button>
                <span id="pl-copy-status" class="pl-copy-status"></span>
              </div>
              <div class="pl-online-divider"><span>${t('OR JOIN / ENTER CODE')}</span></div>
              <div style="display:flex;gap:8px;align-items:center;">
                <input type="text" class="pl-room-input" id="pl-join-room-input" placeholder="${t('ROOM CODE')}" maxlength="6">
                <button type="button" class="pl-online-btn" id="pl-set-room-btn">${t('USE CODE')}</button>
              </div>
              <div class="pl-lobby-status" id="pl-online-lobby-status"></div>
            </div>

            <div class="pl-section-label">${t('GAME MODE')}</div>
            <div class="pl-mode-grid">
              <button type="button" class="pl-card pl-mode-card is-selected" data-mode="4">
                <svg class="mode-court-svg" viewBox="0 0 100 70">
                  <rect x="2" y="2" width="96" height="66" rx="4" fill="#14263b" stroke="#2f6fb5" stroke-width="1.5"/>
                  <line x1="50" y1="2" x2="50" y2="68" stroke="#ffffffaa" stroke-width="1.5" stroke-dasharray="3 2"/>
                  <circle cx="25" cy="20" r="5" fill="#d8f53a"/>
                  <circle cx="25" cy="50" r="5" fill="#d8f53a"/>
                  <circle cx="75" cy="20" r="5" fill="#e63946"/>
                  <circle cx="75" cy="50" r="5" fill="#e63946"/>
                </svg>
                <div>
                  <div class="pl-card-title">${t('DOUBLES (2v2)')}</div>
                  <div class="pl-card-sub">${t('4 players · Classic padel team setup')}</div>
                </div>
                <span class="pl-check">✓</span>
              </button>
              <button type="button" class="pl-card pl-mode-card" data-mode="2">
                <svg class="mode-court-svg" viewBox="0 0 100 70">
                  <rect x="2" y="2" width="96" height="66" rx="4" fill="#14263b" stroke="#2f6fb5" stroke-width="1.5"/>
                  <line x1="50" y1="2" x2="50" y2="68" stroke="#ffffffaa" stroke-width="1.5" stroke-dasharray="3 2"/>
                  <circle cx="25" cy="35" r="6" fill="#d8f53a"/>
                  <circle cx="75" cy="35" r="6" fill="#e63946"/>
                </svg>
                <div>
                  <div class="pl-card-title">${t('SINGLES (1v1)')}</div>
                  <div class="pl-card-sub">${t('2 players · Fast cross-court duel')}</div>
                </div>
                <span class="pl-check">✓</span>
              </button>
            </div>

            <div class="pl-section-label">${t('HUMAN PLAYERS')}</div>
            <div class="pl-seg-row" id="pl-humans-seg">
              <button type="button" class="pl-seg-btn" data-val="0">${t('0 (Watch)')}</button>
              <button type="button" class="pl-seg-btn is-selected" data-val="1">1</button>
              <button type="button" class="pl-seg-btn" data-val="2">2</button>
              <button type="button" class="pl-seg-btn" data-val="3">3</button>
              <button type="button" class="pl-seg-btn" data-val="4">4</button>
            </div>

            <div id="pl-sides-wrap" hidden>
              <div class="pl-section-label">${t('TWO PLAYERS')}</div>
              <div class="pl-seg-row" id="pl-sides-seg">
                <button type="button" class="pl-seg-btn is-selected" data-val="opp">${t('Opponents')}</button>
                <button type="button" class="pl-seg-btn" data-val="same">${t('Same team (vs 2 AI)')}</button>
              </div>
            </div>

            <div class="pl-section-label">${t('CONTROLS (PLAYER 1)')}</div>
            <div class="pl-ctrl-grid">
              <button type="button" class="pl-card pl-ctrl-card is-selected" data-ctrl="auto">
                <div class="pl-ctrl-icons">⌨️ <span class="pl-ctrl-plus">+</span> 🎮</div>
                <div class="pl-card-title">${t('Keyboard + Controller')}</div>
                <div class="pl-card-sub">${t('Auto-detect')}</div>
                <span class="pl-check">✓</span>
              </button>
              <button type="button" class="pl-card pl-ctrl-card" data-ctrl="kb">
                <div class="pl-ctrl-icons">⌨️</div>
                <div class="pl-card-title">${t('Keyboard Only')}</div>
                <div class="pl-card-sub">WASD + Space</div>
                <span class="pl-check">✓</span>
              </button>
              <button type="button" class="pl-card pl-ctrl-card" data-ctrl="pad">
                <div class="pl-ctrl-icons">🎮</div>
                <div class="pl-card-title">${t('Controller Only')}</div>
                <div class="pl-card-sub">${t('Left stick + Buttons')}</div>
                <span class="pl-check">✓</span>
              </button>
            </div>
            <div class="pl-gamepad-live" id="pl-gp-live">${t('🎮 Checking controller…')}</div>
          </div>

          <!-- Step 1: Player -->
          <div class="pl-step" data-step="1" hidden>
            <div class="pl-filter-row" id="pl-char-filter-row">
              <button type="button" class="pl-chip is-active" data-filter="all">${t('All')}</button>
              <button type="button" class="pl-chip" data-filter="f">${t('Women')}</button>
              <button type="button" class="pl-chip" data-filter="m">${t('Men')}</button>
            </div>
            <div class="pl-char-grid" id="pl-char-grid"></div>
          </div>

          <!-- Step 2: Venue -->
          <div class="pl-step" data-step="2" hidden>
            <div class="pl-filter-row" id="pl-venue-filter-row">
              <button type="button" class="pl-chip is-active" data-filter="all">${t('All')}</button>
              <button type="button" class="pl-chip" data-filter="indoor">${t('Indoor')}</button>
              <button type="button" class="pl-chip" data-filter="outdoor">${t('Outdoor')}</button>
              <button type="button" class="pl-chip" data-filter="special">${t('Beach / Rooftop')}</button>
            </div>
            <div class="pl-venue-grid" id="pl-venue-grid"></div>
          </div>

          <!-- Step 3: Racket -->
          <div class="pl-step" data-step="3" hidden>
            <div class="pl-racket-grid" id="pl-racket-grid"></div>
          </div>

          <!-- Step 4: Match -->
          <div class="pl-step" data-step="4" hidden>
            <div class="pl-match-groups">
              <div class="pl-section-label">${t('SETS')}</div>
              <div class="pl-seg-row" id="pl-sets-seg">
                <button type="button" class="pl-seg-btn" data-val="1">${t('1 SET')}</button>
                <button type="button" class="pl-seg-btn is-selected" data-val="3">${t('3 SETS')}</button>
                <button type="button" class="pl-seg-btn" data-val="3s">${t('2 SETS + SUPER TIE-BREAK')}</button>
              </div>

              <div class="pl-section-label">${t('DEUCE FORMAT')}</div>
              <div class="pl-seg-row" id="pl-golden-seg">
                <button type="button" class="pl-seg-btn is-selected" data-val="1">${t('GOLDEN POINT')}</button>
                <button type="button" class="pl-seg-btn" data-val="0">${t('ADVANTAGE')}</button>
                <button type="button" class="pl-seg-btn" data-val="star">${t('STAR POINT (FIP 2026)')}</button>
              </div>

              <div class="pl-section-label">${t('AI DIFFICULTY')}</div>
              <div class="pl-seg-row" id="pl-ai-seg">
                <button type="button" class="pl-seg-btn" data-val="rookie">${t('ROOKIE ★')}</button>
                <button type="button" class="pl-seg-btn is-selected" data-val="club">${t('CLUB ★★')}</button>
                <button type="button" class="pl-seg-btn" data-val="pro">${t('PRO ★★★')}</button>
                <button type="button" class="pl-seg-btn" data-val="legend">${t('LEGEND ★★★★')}</button>
              </div>

              <div class="pl-section-label">${t('GAME SPEED')}</div>
              <div class="pl-seg-row" id="pl-speed-seg">
                <button type="button" class="pl-seg-btn" data-val="0.7">${t('SLOW (70%)')}</button>
                <button type="button" class="pl-seg-btn is-selected" data-val="0.85">${t('NORMAL (85%)')}</button>
                <button type="button" class="pl-seg-btn" data-val="1">${t('FAST (REAL)')}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Step Footer: Next Button -->
        <div class="pl-step-footer" style="justify-content:flex-end;">
          <button type="button" class="pl-next-btn" id="pl-next-btn">${t('NEXT →')}</button>
        </div>
      </section>
    </main>

    <!-- Bottom Bar: Summary + START MATCH -->
    <footer class="pl-bottom-bar">
      <div class="pl-summary" id="pl-summary">
        Doubles · Lucia Varela · Madrid Indoor Arena · Starter Nova · 3 sets
      </div>
      <div class="pl-start-slot">
        <button type="button" class="pl-start-btn" id="pl-start-btn">${t('START MATCH')}</button>
      </div>
    </footer>
  `;

  menuEl.appendChild(shell);

  // State
  let curStep = 0;
  let selectedCharIdx = parseInt($('char')?.value) || 0;
  let selectedVenueIdx = parseInt($('venue')?.value) || 0;
  let selectedRacketIdx = parseInt($('racket')?.value) || 0;

  // 3D Preview Engine
  const previewCanvas = shell.querySelector('#pl-preview-canvas');
  let previewRenderer = null, previewScene = null, previewCamera = null;
  let previewAvatar = null, animFrameId = null, turntable = 0;
  let isDragging = false, lastDragX = 0;

  function initPreview() {
    if (previewRenderer) return;
    const stage = previewCanvas.parentElement;
    const w = stage.clientWidth || 340;
    const h = stage.clientHeight || 280;

    previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    previewRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    previewRenderer.setSize(w, h);

    previewScene = new THREE.Scene();
    previewCamera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
    previewCamera.position.set(0, 1.45, 3.4);
    previewCamera.lookAt(0, 0.95, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x1b2838, 1.35);
    const key = new THREE.DirectionalLight(0xfff5ea, 1.6);
    key.position.set(2.5, 4.0, 3.0);
    const fill = new THREE.DirectionalLight(0x2f6fb5, 0.9);
    fill.position.set(-2.5, 2.0, 1.0);
    const rim = new THREE.DirectionalLight(0xd8f53a, 0.45);
    rim.position.set(0, 3.0, -2.5);
    previewScene.add(hemi, key, fill, rim);

    // Blue turf circle disc
    const discGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.06, 32);
    const discMat = new THREE.MeshStandardMaterial({ color: 0x1d4e89, roughness: 0.8 });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -0.03;
    const ringGeo = new THREE.RingGeometry(1.16, 1.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xd8f53a, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    previewScene.add(disc, ring);

    // Manual spin on drag
    previewCanvas.onpointerdown = (e) => { isDragging = true; lastDragX = e.clientX; previewCanvas.setPointerCapture(e.pointerId); };
    previewCanvas.onpointermove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastDragX;
      lastDragX = e.clientX;
      turntable += dx * 0.015;
    };
    previewCanvas.onpointerup = () => { isDragging = false; };

    let fitW = w, fitH = h;
    function loop() {
      if (menuEl.hidden) { animFrameId = null; return; }  // paused behind HOME; resumed below when the menu shows again
      animFrameId = requestAnimationFrame(loop);
      const w = stage.clientWidth, h = stage.clientHeight;  // built while hidden or before layout settled: follow the stage
      if (w && h && (w !== fitW || h !== fitH)) { fitW = w; fitH = h; previewRenderer.setSize(w, h); previewCamera.aspect = w / h; previewCamera.updateProjectionMatrix(); }
      if (!isDragging) turntable += 0.006;
      if (previewAvatar?.holder) {
        previewAvatar.holder.rotation.y = turntable;
        previewAvatar.mixer.update(0.016);
      }
      previewRenderer.render(previewScene, previewCamera);
    }
    animFrameId = requestAnimationFrame(loop);
    new MutationObserver(() => {
      if (!menuEl.hidden && previewRenderer && !animFrameId) animFrameId = requestAnimationFrame(loop);
    }).observe(menuEl, { attributes: true, attributeFilter: ['hidden'] });
  }

  let previewReqId = 0;

  async function updateAvatarPreview(chIdx, racketIdx, force = false) {
    if (!previewScene) initPreview();
    const ch = characters[chIdx] || characters[0];
    const rk = rackets[racketIdx] || rackets[0];
    const req = ++previewReqId;

    // If same character, simply switch the held racket
    if (!force && previewAvatar && previewAvatar.ch.id === ch.id) {
      if (previewAvatar.setRacket) previewAvatar.setRacket(rk.color, rk.shape);
      updateInfoCard(ch, rk);
      return;
    }

    if (previewAvatar) {
      previewScene.remove(previewAvatar.holder);
      previewAvatar.dispose?.();
      previewAvatar = null;
    }

    const av = await createAvatar(previewScene, ch, rk.color, rk.shape);
    if (req !== previewReqId) {
      previewScene.remove(av.holder);
      av.dispose?.();
      return;
    }
    previewAvatar = av;
    previewAvatar.holder.traverse(o => { if (o.isSprite) o.visible = false; });
    updateInfoCard(ch, rk);
  }

  async function setCustomPreview(ch, rk = rackets[0], infoHtml = null, badgeText = t('LIVE PREVIEW')) {
    if (!previewScene) initPreview();
    const req = ++previewReqId;
    const badge = shell.querySelector('.pl-preview-badge');
    if (badge) badge.textContent = badgeText;
    previewCanvas.parentElement.dataset.custom = '1';  // career/online player: no Friendly ‹ › arrows
    const pill = shell.querySelector('#pl-preview-racket-pill');
    if (pill) pill.textContent = rk?.name || 'Starter Nova';
    const info = shell.querySelector('#pl-char-info');
    if (info && infoHtml != null) info.innerHTML = infoHtml;
    else if (ch) updateInfoCard(ch, rk || rackets[0]);

    if (previewAvatar) {
      previewScene.remove(previewAvatar.holder);
      previewAvatar.dispose?.();
      previewAvatar = null;
    }
    if (!ch) return;
    const av = await createAvatar(previewScene, ch, rk?.color || '#7FB3D5', rk?.shape || 'round');
    if (req !== previewReqId) {
      previewScene.remove(av.holder);
      av.dispose?.();
      return;
    }
    previewAvatar = av;
    previewAvatar.holder.traverse(o => { if (o.isSprite) o.visible = false; });
  }

  function updateInfoCard(ch, rk) {
    const pill = shell.querySelector('#pl-preview-racket-pill');
    if (pill) pill.textContent = rk.name;

    const info = shell.querySelector('#pl-char-info');
    if (!info) return;
    const flag = countryFlag(ch.countryCode);
    const gText = ch.gender === 'f' ? t('FEMALE') : t('MALE');
    const hText = ch.hand === 'left' ? t('LEFT-HANDED') : t('RIGHT-HANDED');
    const s = ch.stats || {};
    const card = charCard(s);
    info.innerHTML = `
      <div class="pl-char-header">
        <div class="pl-char-title-wrap">
          <span class="pl-char-flag">${flag}</span>
          <h2 class="pl-char-name" lang="en">${escapeHtml(ch.name)}</h2>
        </div>
        <div class="pl-char-tags">
          <span class="pl-meta-pill">${gText}</span>
          <span class="pl-meta-pill">${hText}</span>
        </div>
      </div>
      <div class="pl-stats-list">
        ${statRow(t('SPEED'), s.speed || 6)}
        ${statRow(t('POWER'), s.power || 6)}
        ${statRow(t('CONTROL'), s.control || 6)}
        ${statRow(t('VOLLEY'), s.volley || 6)}
        ${statRow(t('SMASH'), s.smash || 6)}
        ${statRow(t('STAMINA'), s.stamina || 6)}
      </div>
      <div class="pl-char-tags" style="margin-top:10px;gap:6px;flex-wrap:wrap">
        <span class="pl-meta-pill">💪 ${t(card.strengths[0][0].toUpperCase())} ${card.strengths[0][1]}</span>
        <span class="pl-meta-pill">💪 ${t(card.strengths[1][0].toUpperCase())} ${card.strengths[1][1]}</span>
        <span class="pl-meta-pill" style="color:#ff8fa3">⚠ ${t(card.weakness[0].toUpperCase())} ${card.weakness[1]}</span>
      </div>
      <div class="pl-card-sub" style="margin-top:6px;font-size:12px;line-height:1.4">${escapeHtml(card.tip)}</div>
      <button type="button" id="pl-to-career-btn" class="pl-card-sub" style="margin-top:8px;background:none;border:none;padding:0;color:var(--acc);font-weight:700;font-size:12px;cursor:pointer;text-align:left;display:inline-block">${t('Build your own player in Career →')}</button>
    `;
    const toCareerBtn = info.querySelector('#pl-to-career-btn');
    if (toCareerBtn) toCareerBtn.onclick = () => { location.hash = '#career'; };
  }

  function statRow(name, val) {
    const pct = Math.min(100, (val / 10) * 100);
    return `
      <div class="pl-stat-row">
        <span class="pl-stat-name">${name}</span>
        <div class="pl-stat-track"><div class="pl-stat-fill" style="width:${pct}%"></div></div>
        <span class="pl-stat-val">${val}</span>
      </div>
    `;
  }

  function updateSummary() {
    const m = $('mode')?.value === '2' ? t('Singles') : t('Doubles');
    const ch = characters[selectedCharIdx]?.name || 'Player';
    const vn = venues[selectedVenueIdx]?.name || 'Venue';
    const rk = rackets[selectedRacketIdx]?.name || 'Racket';
    const stVal = $('sets')?.value;
    const st = stVal === '1' ? t('1 set') : stVal === '3s' ? t('2 sets + STB') : t('3 sets');
    const sumEl = shell.querySelector('#pl-summary');
    if (sumEl) sumEl.textContent = `${m} · ${ch} · ${vn} · ${rk} · ${st}`;
  }

  // Populate Character Cards
  function populateCharGrid(filter = 'all') {
    const grid = shell.querySelector('#pl-char-grid');
    if (!grid) return;
    grid.innerHTML = '';
    characters.forEach((ch, idx) => {
      if (filter !== 'all' && ch.gender !== filter) return;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `pl-card pl-char-card ${idx === selectedCharIdx ? 'is-selected' : ''}`;
      card.dataset.idx = idx;
      card.innerHTML = `
        <div class="pl-thumb-box pl-portrait-box shimmer">
          <span class="pl-gender-badge">${ch.gender === 'f' ? 'F' : 'M'}</span>
          <img class="pl-thumb-img" alt="${ch.name}" />
        </div>
        <div class="pl-char-card-meta">
          <span class="pl-char-card-flag">${countryFlag(ch.countryCode)}</span>
          <div class="pl-char-card-name" lang="en">${ch.name}</div>
        </div>
        <span class="pl-check">✓</span>
      `;

      const box = card.querySelector('.pl-thumb-box');
      const img = card.querySelector('.pl-thumb-img');
      getPortraitThumb(ch, (url) => {
        img.src = url;
        img.onload = () => { box.classList.remove('shimmer'); };
      }, idx === selectedCharIdx);

      card.onmouseenter = () => updateAvatarPreview(idx, selectedRacketIdx);
      card.onclick = () => {
        selectedCharIdx = idx;
        if ($('char')) { $('char').value = idx; $('char').dispatchEvent(new Event('change')); }
        shell.querySelectorAll('.pl-char-card').forEach(c => c.classList.remove('is-selected'));
        card.classList.add('is-selected');
        updateAvatarPreview(idx, selectedRacketIdx);
        updateSummary();
      };
      grid.appendChild(card);
    });
  }

  // ‹ › on the preview step through the player cards (same gender filter), wrapping around
  shell.querySelectorAll('.pl-preview-nav').forEach(b => {
    b.onclick = () => {
      const cards = [...shell.querySelectorAll('.pl-char-card')];
      const i = cards.findIndex(c => c.classList.contains('is-selected'));
      cards[(i + +b.dataset.step + cards.length) % cards.length]?.click();
    };
  });

  // Populate Venue Cards
  function populateVenueGrid(filter = 'all') {
    const grid = shell.querySelector('#pl-venue-grid');
    if (!grid) return;
    grid.innerHTML = '';
    venues.forEach((v, idx) => {
      if (filter === 'indoor' && v.type !== 'indoor') return;
      if (filter === 'outdoor' && v.type !== 'outdoor') return;
      if (filter === 'special' && v.type !== 'rooftop' && v.type !== 'beach') return;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `pl-card pl-venue-card ${idx === selectedVenueIdx ? 'is-selected' : ''}`;
      card.dataset.idx = idx;
      const tod = v.timeOfDay === 'sunset' ? t('Sunset') : v.timeOfDay === 'night' ? t('Night') : t('Day');
      const typeEn = v.type === 'indoor' ? t('Indoor') : v.type === 'beach' ? t('Beach') : v.type === 'rooftop' ? t('Rooftop') : t('Outdoor');
      const surfColor = v.surface.includes('blue') ? '#2f6fb5' : v.surface.includes('green') ? '#2e7d32' : '#c85a17';
      card.innerHTML = `
        <div class="pl-thumb-box pl-venue-box shimmer">
          <img class="pl-thumb-img" alt="${v.name}" />
        </div>
        <div class="pl-venue-body">
          <div class="pl-card-title" lang="en">${v.name}</div>
          <div class="pl-venue-loc">${countryFlag(v.countryCode)} ${v.city} · ${typeEn}</div>
          <div class="pl-venue-chips">
            <span class="pl-mini-chip"><i class="pl-surf-dot" style="background:${surfColor}"></i>${v.surfaceSpeed}x</span>
            <span class="pl-mini-chip">${tod}</span>
          </div>
        </div>
        <span class="pl-check">✓</span>
      `;

      const box = card.querySelector('.pl-thumb-box');
      const img = card.querySelector('.pl-thumb-img');
      getVenueThumb(v, (url) => {
        img.src = url;
        img.onload = () => { box.classList.remove('shimmer'); };
      }, idx === selectedVenueIdx);

      card.onclick = () => {
        selectedVenueIdx = idx;
        if ($('venue')) { $('venue').value = idx; $('venue').dispatchEvent(new Event('change')); }
        shell.querySelectorAll('.pl-venue-card').forEach(c => c.classList.remove('is-selected'));
        card.classList.add('is-selected');
        updateSummary();
      };
      grid.appendChild(card);
    });
  }

  // Populate Racket Cards
  function populateRacketGrid() {
    const grid = shell.querySelector('#pl-racket-grid');
    if (!grid) return;
    grid.innerHTML = '';
    rackets.forEach((rk, idx) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `pl-card pl-racket-card ${idx === selectedRacketIdx ? 'is-selected' : ''}`;
      card.dataset.idx = idx;
      const shName = rk.shape === 'round' ? t('Round') : rk.shape === 'teardrop' ? t('Teardrop') : t('Diamond');
      card.innerHTML = `
        <div class="pl-racket-top">
          <div class="pl-thumb-box pl-racket-box shimmer">
            <img class="pl-thumb-img" alt="${rk.name}" />
          </div>
          <div class="pl-racket-head-info">
            <div class="pl-card-title" lang="en">${rk.name}</div>
            <div class="pl-racket-tags">
              <span class="pl-mini-chip" style="border-color:${rk.color}">${shName}</span>
              <span class="pl-mini-chip">${rk.weightG}g</span>
            </div>
          </div>
        </div>
        <div class="pl-racket-stats">
          <div class="pl-rstat"><span>${t('Power')}</span><div class="pl-bar"><i style="width:${rk.stats.power * 10}%"></i></div><b>${rk.stats.power}</b></div>
          <div class="pl-rstat"><span>${t('Control')}</span><div class="pl-bar"><i style="width:${rk.stats.control * 10}%"></i></div><b>${rk.stats.control}</b></div>
          <div class="pl-rstat"><span>${t('Spin')}</span><div class="pl-bar"><i style="width:${rk.stats.spin * 10}%"></i></div><b>${rk.stats.spin}</b></div>
          <div class="pl-rstat"><span>${t('Sweet Spot')}</span><div class="pl-bar"><i style="width:${rk.stats.sweetSpot * 10}%"></i></div><b>${rk.stats.sweetSpot}</b></div>
        </div>
        <span class="pl-check">✓</span>
      `;

      const box = card.querySelector('.pl-thumb-box');
      const img = card.querySelector('.pl-thumb-img');
      getRacketThumb(rk, (url) => {
        img.src = url;
        img.onload = () => { box.classList.remove('shimmer'); };
      }, idx === selectedRacketIdx);

      card.onclick = () => {
        selectedRacketIdx = idx;
        if ($('racket')) { $('racket').value = idx; $('racket').dispatchEvent(new Event('change')); }
        shell.querySelectorAll('.pl-racket-card').forEach(c => c.classList.remove('is-selected'));
        card.classList.add('is-selected');
        updateAvatarPreview(selectedCharIdx, idx);
        updateSummary();
      };
      grid.appendChild(card);
    });
  }

  // Tab switching
  function switchStep(idx) {
    curStep = Math.max(0, Math.min(4, idx));
    shell.querySelectorAll('.pl-tab').forEach((b, i) => b.classList.toggle('is-active', i === curStep));
    shell.querySelectorAll('.pl-step').forEach((p, i) => {
      p.hidden = i !== curStep;
    });
    const nextBtn = shell.querySelector('#pl-next-btn');
    if (nextBtn) nextBtn.textContent = curStep === 4 ? t('FIRST TAB ↺') : t('NEXT →');
  }

  shell.querySelectorAll('.pl-tab').forEach(btn => {
    btn.onclick = () => switchStep(parseInt(btn.dataset.step));
  });

  shell.querySelector('#pl-next-btn').onclick = () => switchStep((curStep + 1) % 5);

  // Step 0 Mode & Control
  shell.querySelectorAll('.pl-mode-card').forEach(card => {
    card.onclick = () => {
      const mode = card.dataset.mode;
      if ($('mode')) { $('mode').value = mode; $('mode').dispatchEvent(new Event('change')); }
      shell.querySelectorAll('.pl-mode-card').forEach(c => c.classList.remove('is-selected'));
      card.classList.add('is-selected');
      // In singles mode, disable 3 and 4 players
      const btn3 = shell.querySelector('#pl-humans-seg [data-val="3"]');
      const btn4 = shell.querySelector('#pl-humans-seg [data-val="4"]');
      if (btn3 && btn4) {
        btn3.disabled = mode === '2';
        btn4.disabled = mode === '2';
        if (mode === '2' && parseInt($('humans')?.value) > 2) {
          $('humans').value = '1';
          $('humans').dispatchEvent(new Event('change'));
          shell.querySelectorAll('#pl-humans-seg .pl-seg-btn').forEach(b => b.classList.toggle('is-selected', b.dataset.val === '1'));
        }
      }
      syncSides();
      updateSummary();
    };
  });

  shell.querySelectorAll('#pl-humans-seg .pl-seg-btn').forEach(btn => {
    btn.onclick = () => {
      const val = btn.dataset.val;
      if ($('humans')) { $('humans').value = val; $('humans').dispatchEvent(new Event('change')); }
      shell.querySelectorAll('#pl-humans-seg .pl-seg-btn').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      syncSides();
    };
  });

  // two humans in doubles: play against each other or side by side
  const syncSides = () => { shell.querySelector('#pl-sides-wrap').hidden = !($('mode')?.value === '4' && $('humans')?.value === '2'); };
  shell.querySelectorAll('#pl-sides-seg .pl-seg-btn').forEach(btn => {
    btn.onclick = () => {
      if ($('sides')) $('sides').value = btn.dataset.val;
      shell.querySelectorAll('#pl-sides-seg .pl-seg-btn').forEach(b => b.classList.toggle('is-selected', b === btn));
    };
  });

  shell.querySelectorAll('.pl-ctrl-card').forEach(card => {
    card.onclick = () => {
      const val = card.dataset.ctrl;
      if ($('control')) { $('control').value = val; $('control').dispatchEvent(new Event('change')); }
      shell.querySelectorAll('.pl-ctrl-card').forEach(c => c.classList.remove('is-selected'));
      card.classList.add('is-selected');
      saveSettings({ control: val });
    };
  });

  // Where to play & Online Room
  let selectedWhere = 'local';
  let currentRoomCode = '';

  function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
    return c;
  }

  function updateRoomDisplay(code) {
    currentRoomCode = (code || '').toUpperCase().slice(0, 6);
    const codeEl = shell.querySelector('#pl-room-code-val');
    const linkInput = shell.querySelector('#pl-room-link-input');
    const joinInput = shell.querySelector('#pl-join-room-input');
    if (codeEl) codeEl.textContent = currentRoomCode || '------';
    if (linkInput) {
      linkInput.value = currentRoomCode ? `${location.origin}${location.pathname}?room=${currentRoomCode}` : '';
    }
    if (joinInput && code) joinInput.value = currentRoomCode;
    if ($('room')) $('room').value = currentRoomCode;
  }

  let roomJoined = false;  // typed / invited code (join) vs the generated one (create), for analytics
  function setWhere(where, code) {
    selectedWhere = where;
    if (code) roomJoined = true;  // arrived with a ?room= invite
    shell.querySelectorAll('.pl-where-card').forEach(c => c.classList.toggle('is-selected', c.dataset.where === where));
    const onlineSec = shell.querySelector('#pl-online-section');
    if (onlineSec) onlineSec.hidden = (where !== 'online');
    if (where === 'online') {
      if (code) {
        updateRoomDisplay(code);
      } else if (!currentRoomCode) {
        updateRoomDisplay(generateRoomCode());
      }
    }
  }

  shell.querySelectorAll('.pl-where-card').forEach(card => {
    card.onclick = () => setWhere(card.dataset.where);
  });

  const copyBtn = shell.querySelector('#pl-copy-link-btn');
  const copyStatus = shell.querySelector('#pl-copy-status');
  if (copyBtn) {
    copyBtn.onclick = async () => {
      const linkInput = shell.querySelector('#pl-room-link-input');
      const textToCopy = linkInput ? linkInput.value : '';
      if (!textToCopy) return;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          linkInput.select();
          document.execCommand('copy');
        }
        if (copyStatus) {
          copyStatus.textContent = t('✓ Copied!');
          setTimeout(() => { if (copyStatus) copyStatus.textContent = ''; }, 2200);
        }
      } catch {
        if (copyStatus) copyStatus.textContent = t('Failed to copy');
      }
    };
  }

  const joinInput = shell.querySelector('#pl-join-room-input');
  const setRoomBtn = shell.querySelector('#pl-set-room-btn');
  if (setRoomBtn && joinInput) {
    const applyJoin = () => {
      const val = joinInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (val) {
        roomJoined = true;
        updateRoomDisplay(val);
        const lobbyStatus = shell.querySelector('#pl-online-lobby-status');
        if (lobbyStatus) lobbyStatus.innerHTML = t('Room code set to <b>{code}</b>. Click START MATCH to connect!', { code: val });
      }
    };
    setRoomBtn.onclick = applyJoin;
    joinInput.onkeydown = (e) => { if (e.key === 'Enter') applyJoin(); };
  }

  setWizardWhereFn = (where, room) => setWhere(where, room);

  // Home & Fullscreen buttons
  const homeBtn = shell.querySelector('#pl-home-btn');
  if (homeBtn) homeBtn.onclick = () => { location.hash = '#home'; };
  const fsBtn = shell.querySelector('#pl-fs-btn');
  if (fsBtn) fsBtn.onclick = () => toggleFullscreen();

  // Settings Synchronization
  function syncSettingsFromStore() {
    const s = loadSettings();
    if ($('control')) { $('control').value = s.control; $('control').dispatchEvent(new Event('change')); }
    if ($('speed')) { $('speed').value = String(s.speed); $('speed').dispatchEvent(new Event('change')); }
    shell.querySelectorAll('.pl-ctrl-card').forEach(c => c.classList.toggle('is-selected', c.dataset.ctrl === s.control));
    shell.querySelectorAll('#pl-speed-seg .pl-seg-btn').forEach(b => b.classList.toggle('is-selected', b.dataset.val === String(s.speed)));
  }
  syncSettingsFromStore();

  const onSettingsChange = () => syncSettingsFromStore();
  window.addEventListener('padel-settings-changed', onSettingsChange);

  // Step 1 & 2 Filters
  shell.querySelectorAll('#pl-char-filter-row .pl-chip').forEach(chip => {
    chip.onclick = () => {
      shell.querySelectorAll('#pl-char-filter-row .pl-chip').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      populateCharGrid(chip.dataset.filter);
    };
  });

  shell.querySelectorAll('#pl-venue-filter-row .pl-chip').forEach(chip => {
    chip.onclick = () => {
      shell.querySelectorAll('#pl-venue-filter-row .pl-chip').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      populateVenueGrid(chip.dataset.filter);
    };
  });

  // Step 4 Segments
  function bindSegment(containerId, inputId) {
    shell.querySelectorAll(`#${containerId} .pl-seg-btn`).forEach(btn => {
      btn.onclick = () => {
        const val = btn.dataset.val;
        if ($(inputId)) { $(inputId).value = val; $(inputId).dispatchEvent(new Event('change')); }
        shell.querySelectorAll(`#${containerId} .pl-seg-btn`).forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        if (inputId === 'speed') saveSettings({ speed: parseFloat(val) });
        updateSummary();
      };
    });
  }
  bindSegment('pl-sets-seg', 'sets');
  bindSegment('pl-golden-seg', 'golden');
  bindSegment('pl-ai-seg', 'ai');
  bindSegment('pl-speed-seg', 'speed');

  // Forward match start
  const startBtn = shell.querySelector('#pl-start-btn');
  if (startBtn) {
    startBtn.onclick = () => {
      if (selectedWhere === 'online') {
        track(roomJoined ? 'online-join' : 'online-create');
        if (!currentRoomCode) updateRoomDisplay(generateRoomCode());
        if ($('room')) $('room').value = currentRoomCode;
        if ($('online')) $('online').click();
      } else {
        cleanUp();
        if ($('start')) $('start').click();
      }
    };
  }

  // Keyboard navigation & Escape back to HOME
  const onKeyDown = (e) => {
    if (menuEl.hidden || location.hash === '#career') return;  // the career panel handles its own Esc
    if (e.key === 'Escape') {
      if (curStep > 0) switchStep(curStep - 1);
      else location.hash = '#home';
    }
  };
  window.addEventListener('keydown', onKeyDown);

  // Initial population
  populateCharGrid('all');
  populateVenueGrid('all');
  populateRacketGrid();
  updateAvatarPreview(selectedCharIdx, selectedRacketIdx);
  updateSummary();

  // Xbox / PlayStation Gamepad Polling & Navigation
  let gpTimer = null;
  let careerPadHandler = null;
  let lastPadA = false, lastPadB = false, lastPadLB = false, lastPadRB = false, lastPadStart = false;
  let lastStickX = 0, lastStickY = 0;

  previewApi = {
    setCustomPreview,
    restoreQuickMatch() {
      const badge = shell.querySelector('.pl-preview-badge');
      if (badge) badge.textContent = t('LIVE PREVIEW');
      delete previewCanvas.parentElement.dataset.custom;
      updateAvatarPreview(selectedCharIdx, selectedRacketIdx, true);
    },
    setPadHandler(fn) {
      careerPadHandler = fn;
      lastPadA = true; lastPadB = true; lastPadLB = true; lastPadRB = true; lastPadStart = true;
    },
  };

  function pollGamepads() {
    if (menuEl.hidden) {  // HOME / career-free screens: keep polling, and swallow a button still held from HOME
      lastPadA = lastPadB = lastPadLB = lastPadRB = lastPadStart = true;
      gpTimer = requestAnimationFrame(pollGamepads);
      return;
    }
    const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    const statusText = gps.length > 0
      ? t('🎮 {n} controller(s): {id}… · {hints}', { n: gps.length, id: gps[0].id.slice(0, 20), hints: padText(t('A Select · LB/RB Tabs · Start Play · B / Esc: HOME')) })
      : t('🎮 No controller detected');

    const padHint = shell.querySelector('#pl-pad-status');
    const liveHint = shell.querySelector('#pl-gp-live');
    if (padHint) padHint.textContent = statusText;
    if (liveHint) liveHint.textContent = gps.length > 0 ? padText(t('🎮 {n} controller(s) connected · A to choose', { n: gps.length })) : t('🎮 Checking controller…');

    if (careerPadHandler) {
      if (gps.length > 0) careerPadHandler(gps[0]);
      gpTimer = requestAnimationFrame(pollGamepads);
      return;
    }

    if (gps.length > 0) {
      const pad = gps[0];
      const a = pad.buttons[0]?.pressed;
      const b = pad.buttons[1]?.pressed;
      const lb = pad.buttons[4]?.pressed;
      const rb = pad.buttons[5]?.pressed;
      const start = pad.buttons[9]?.pressed;

      if (start && !lastPadStart) { cleanUp(); startBtn?.click(); }
      const prevStep = curStep;
      if (lb && !lastPadLB) switchStep(curStep - 1);
      if (rb && !lastPadRB) switchStep(curStep + 1);
      if (b && !lastPadB) {
        if (curStep > 0) switchStep(curStep - 1);
        else location.hash = '#home';
      }
      if (curStep !== prevStep) spatialFocus(shell.querySelector(`.pl-step[data-step="${curStep}"]`), 0, 0);

      const [sx, sy] = padDir(pad);

      if (Math.abs(sx) > 0.6 && Math.abs(lastStickX) <= 0.6) {
        navigateFocus(Math.sign(sx), 0);
      }
      if (Math.abs(sy) > 0.6 && Math.abs(lastStickY) <= 0.6) {
        navigateFocus(0, Math.sign(sy));
      }

      if (a && !lastPadA) {
        const focused = document.activeElement;
        if (focused && focused.click) focused.click();
      }

      lastPadA = !!a; lastPadB = !!b; lastPadLB = !!lb; lastPadRB = !!rb; lastPadStart = !!start;
      lastStickX = sx; lastStickY = sy;
    }

    gpTimer = requestAnimationFrame(pollGamepads);
  }
  gpTimer = requestAnimationFrame(pollGamepads);

  const onGamepadEvent = () => {};
  window.addEventListener('gamepadconnected', onGamepadEvent);
  window.addEventListener('gamepaddisconnected', onGamepadEvent);

  // whole visible menu (tabs, current step, footer with Start): nearest control in that direction
  function navigateFocus(dx, dy) { spatialFocus(shell, dx, dy); }

  // free the preview's WebGL context and thumbnails when a match starts (main.js setupScene); hiding the menu for
  // HOME must not, or the wizard comes back without its preview, Esc and controller polling
  disposeFn = cleanUp;

  function cleanUp() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (gpTimer) cancelAnimationFrame(gpTimer);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('padel-settings-changed', onSettingsChange);
    window.removeEventListener('gamepadconnected', onGamepadEvent);
    window.removeEventListener('gamepaddisconnected', onGamepadEvent);
    if (previewRenderer) {
      previewRenderer.dispose();
      previewRenderer.forceContextLoss();
      previewRenderer = null;
    }
    disposeThumbs();
  }
}
