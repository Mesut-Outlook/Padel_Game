// Broadcast-quality visual menu for Padel Legends.
// Integrates with existing HTML form inputs (#mode, #char, #venue, #racket, etc.) as the single source of truth.
// Styles are authored in index.html under the .pl-* class hierarchy.
import * as THREE from 'three';
import characters from '../data/characters.json';
import venues from '../data/venues.json';
import rackets from '../data/rackets.json';
import { createAvatar } from './player.js';
import { getPortraitThumb, getVenueThumb, getRacketThumb, disposeThumbs } from './thumbs.js';
import { openCareer } from './careerui.js';

const $ = (id) => document.getElementById(id);

export function countryFlag(cc) {
  if (!cc || cc.length !== 2) return '';
  const codePoints = cc.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

let previewApi = null;
export function setCareerPreview(ch, rk, infoHtml, badgeText) {
  return previewApi?.setCustomPreview(ch, rk, infoHtml, badgeText);
}
export function restoreQuickMatchPreview() {
  return previewApi?.restoreQuickMatch();
}
export function setCareerGamepadHandler(fn) {
  return previewApi?.setPadHandler(fn);
}

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
        <button type="button" class="pl-career-top-btn" id="pl-career-btn">CAREER</button>
        <span class="pl-pad-hint" id="pl-pad-status">🎮 Checking controller…</span>
        <a class="pl-dev" href="kontroller.html" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;margin-right:14px">⌨ <b>Controls</b></a>
        <span class="pl-dev">Developer: <b>Mesut</b></span>
      </div>
    </header>

    <!-- Main 2-column layout (~38% / ~62%) -->
    <main class="pl-main">
      <!-- Left Panel: Live 3D Avatar Preview -->
      <section class="pl-left-panel">
        <div class="pl-preview-stage">
          <canvas id="pl-preview-canvas" class="pl-preview-canvas"></canvas>
          <div class="pl-preview-badge">LIVE PREVIEW</div>
          <div class="pl-preview-racket-pill" id="pl-preview-racket-pill">Starter Nova</div>
        </div>
        <div class="pl-char-info" id="pl-char-info">
          <!-- Populated dynamically -->
        </div>
      </section>

      <!-- Right Panel: Step Tabs + Step Body + Step Footer -->
      <section class="pl-right-panel">
        <nav class="pl-tabs" role="tablist">
          <button type="button" class="pl-tab is-active" data-step="0"><span class="pl-tab-num">1</span>Mode</button>
          <button type="button" class="pl-tab" data-step="1"><span class="pl-tab-num">2</span>Player</button>
          <button type="button" class="pl-tab" data-step="2"><span class="pl-tab-num">3</span>Venue</button>
          <button type="button" class="pl-tab" data-step="3"><span class="pl-tab-num">4</span>Racket</button>
          <button type="button" class="pl-tab" data-step="4"><span class="pl-tab-num">5</span>Match</button>
        </nav>

        <div class="pl-step-body">
          <!-- Step 0: Mode -->
          <div class="pl-step" data-step="0">
            <div class="pl-section-label">GAME MODE</div>
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
                  <div class="pl-card-title">DOUBLES (2v2)</div>
                  <div class="pl-card-sub">4 players · Classic padel team setup</div>
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
                  <div class="pl-card-title">SINGLES (1v1)</div>
                  <div class="pl-card-sub">2 players · Fast cross-court duel</div>
                </div>
                <span class="pl-check">✓</span>
              </button>
            </div>

            <div class="pl-section-label">HUMAN PLAYERS</div>
            <div class="pl-seg-row" id="pl-humans-seg">
              <button type="button" class="pl-seg-btn" data-val="0">0 (Watch)</button>
              <button type="button" class="pl-seg-btn is-selected" data-val="1">1</button>
              <button type="button" class="pl-seg-btn" data-val="2">2</button>
              <button type="button" class="pl-seg-btn" data-val="3">3</button>
              <button type="button" class="pl-seg-btn" data-val="4">4</button>
            </div>

            <div class="pl-section-label">CONTROLS (PLAYER 1)</div>
            <div class="pl-ctrl-grid">
              <button type="button" class="pl-card pl-ctrl-card is-selected" data-ctrl="auto">
                <div class="pl-ctrl-icons">⌨️ <span class="pl-ctrl-plus">+</span> 🎮</div>
                <div class="pl-card-title">Keyboard + Xbox</div>
                <div class="pl-card-sub">Auto-detect</div>
                <span class="pl-check">✓</span>
              </button>
              <button type="button" class="pl-card pl-ctrl-card" data-ctrl="kb">
                <div class="pl-ctrl-icons">⌨️</div>
                <div class="pl-card-title">Keyboard Only</div>
                <div class="pl-card-sub">WASD + Space</div>
                <span class="pl-check">✓</span>
              </button>
              <button type="button" class="pl-card pl-ctrl-card" data-ctrl="pad">
                <div class="pl-ctrl-icons">🎮</div>
                <div class="pl-card-title">Xbox Only</div>
                <div class="pl-card-sub">Left stick + Buttons</div>
                <span class="pl-check">✓</span>
              </button>
            </div>
            <div class="pl-gamepad-live" id="pl-gp-live">🎮 Checking controller…</div>
          </div>

          <!-- Step 1: Player -->
          <div class="pl-step" data-step="1" hidden>
            <div class="pl-filter-row" id="pl-char-filter-row">
              <button type="button" class="pl-chip is-active" data-filter="all">All</button>
              <button type="button" class="pl-chip" data-filter="f">Women</button>
              <button type="button" class="pl-chip" data-filter="m">Men</button>
            </div>
            <div class="pl-char-grid" id="pl-char-grid"></div>
          </div>

          <!-- Step 2: Venue -->
          <div class="pl-step" data-step="2" hidden>
            <div class="pl-filter-row" id="pl-venue-filter-row">
              <button type="button" class="pl-chip is-active" data-filter="all">All</button>
              <button type="button" class="pl-chip" data-filter="indoor">Indoor</button>
              <button type="button" class="pl-chip" data-filter="outdoor">Outdoor</button>
              <button type="button" class="pl-chip" data-filter="special">Beach / Rooftop</button>
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
              <div class="pl-section-label">SETS</div>
              <div class="pl-seg-row" id="pl-sets-seg">
                <button type="button" class="pl-seg-btn" data-val="1">1 SET</button>
                <button type="button" class="pl-seg-btn is-selected" data-val="3">3 SETS</button>
                <button type="button" class="pl-seg-btn" data-val="3s">2 SETS + SUPER TIE-BREAK</button>
              </div>

              <div class="pl-section-label">DEUCE FORMAT</div>
              <div class="pl-seg-row" id="pl-golden-seg">
                <button type="button" class="pl-seg-btn is-selected" data-val="1">GOLDEN POINT</button>
                <button type="button" class="pl-seg-btn" data-val="0">ADVANTAGE</button>
                <button type="button" class="pl-seg-btn" data-val="star">STAR POINT (FIP 2026)</button>
              </div>

              <div class="pl-section-label">AI DIFFICULTY</div>
              <div class="pl-seg-row" id="pl-ai-seg">
                <button type="button" class="pl-seg-btn" data-val="rookie">ROOKIE ★</button>
                <button type="button" class="pl-seg-btn is-selected" data-val="club">CLUB ★★</button>
                <button type="button" class="pl-seg-btn" data-val="pro">PRO ★★★</button>
                <button type="button" class="pl-seg-btn" data-val="legend">LEGEND ★★★★</button>
              </div>

              <div class="pl-section-label">GAME SPEED</div>
              <div class="pl-seg-row" id="pl-speed-seg">
                <button type="button" class="pl-seg-btn" data-val="0.7">SLOW (70%)</button>
                <button type="button" class="pl-seg-btn is-selected" data-val="0.85">NORMAL (85%)</button>
                <button type="button" class="pl-seg-btn" data-val="1">FAST (REAL)</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Step Footer: Online Collapsible + Next Button -->
        <div class="pl-step-footer">
          <div class="pl-online-wrap">
            <button type="button" class="pl-online-toggle" id="pl-online-toggle">
              <span>🌐 Play Online with Friends</span>
              <span id="pl-online-arrow">▼</span>
            </button>
            <div class="pl-online-drawer" id="pl-online-drawer" hidden>
              <div class="pl-online-controls">
                <input type="text" class="pl-room-input" id="pl-room-input" placeholder="ROOM CODE" maxlength="6">
                <button type="button" class="pl-online-btn" id="pl-online-btn">JOIN / CREATE ROOM</button>
              </div>
              <div class="pl-lobby-status" id="pl-lobby-status"></div>
            </div>
          </div>
          <button type="button" class="pl-next-btn" id="pl-next-btn">NEXT →</button>
        </div>
      </section>
    </main>

    <!-- Bottom Bar: Summary + START MATCH -->
    <footer class="pl-bottom-bar">
      <div class="pl-summary" id="pl-summary">
        Doubles · Lucia Varela · Madrid Indoor Arena · Starter Nova · 3 sets
      </div>
      <div class="pl-start-slot">
        <button type="button" class="pl-tutorial-btn" id="pl-tutorial-btn">🎓 TRAINING</button>
        <button type="button" class="pl-start-btn" id="pl-start-btn">START MATCH</button>
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

    function loop() {
      if (menuEl.hidden) return;
      animFrameId = requestAnimationFrame(loop);
      if (!isDragging) turntable += 0.006;
      if (previewAvatar?.holder) {
        previewAvatar.holder.rotation.y = turntable;
        previewAvatar.mixer.update(0.016);
      }
      previewRenderer.render(previewScene, previewCamera);
    }
    animFrameId = requestAnimationFrame(loop);
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

  async function setCustomPreview(ch, rk = rackets[0], infoHtml = null, badgeText = 'LIVE PREVIEW') {
    if (!previewScene) initPreview();
    const req = ++previewReqId;
    const badge = shell.querySelector('.pl-preview-badge');
    if (badge) badge.textContent = badgeText;
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
    const gText = ch.gender === 'f' ? 'FEMALE' : 'MALE';
    const hText = ch.hand === 'left' ? 'LEFT-HANDED' : 'RIGHT-HANDED';
    const s = ch.stats || {};
    info.innerHTML = `
      <div class="pl-char-header">
        <div class="pl-char-title-wrap">
          <span class="pl-char-flag">${flag}</span>
          <h2 class="pl-char-name" lang="en">${ch.name}</h2>
        </div>
        <div class="pl-char-tags">
          <span class="pl-meta-pill">${gText}</span>
          <span class="pl-meta-pill">${hText}</span>
        </div>
      </div>
      <div class="pl-stats-list">
        ${statRow('SPEED', s.speed || 6)}
        ${statRow('POWER', s.power || 6)}
        ${statRow('CONTROL', s.control || 6)}
        ${statRow('VOLLEY', s.volley || 6)}
        ${statRow('SMASH', s.smash || 6)}
      </div>
    `;
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
    const m = $('mode')?.value === '2' ? 'Singles' : 'Doubles';
    const ch = characters[selectedCharIdx]?.name || 'Player';
    const vn = venues[selectedVenueIdx]?.name || 'Venue';
    const rk = rackets[selectedRacketIdx]?.name || 'Racket';
    const stVal = $('sets')?.value;
    const st = stVal === '1' ? '1 set' : stVal === '3s' ? '2 sets + STB' : '3 sets';
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
      const tod = v.timeOfDay === 'sunset' ? 'Sunset' : v.timeOfDay === 'night' ? 'Night' : 'Day';
      const typeEn = v.type === 'indoor' ? 'Indoor' : v.type === 'beach' ? 'Beach' : v.type === 'rooftop' ? 'Rooftop' : 'Outdoor';
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
      const shName = rk.shape === 'round' ? 'Round' : rk.shape === 'teardrop' ? 'Teardrop' : 'Diamond';
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
          <div class="pl-rstat"><span>Power</span><div class="pl-bar"><i style="width:${rk.stats.power * 10}%"></i></div><b>${rk.stats.power}</b></div>
          <div class="pl-rstat"><span>Control</span><div class="pl-bar"><i style="width:${rk.stats.control * 10}%"></i></div><b>${rk.stats.control}</b></div>
          <div class="pl-rstat"><span>Spin</span><div class="pl-bar"><i style="width:${rk.stats.spin * 10}%"></i></div><b>${rk.stats.spin}</b></div>
          <div class="pl-rstat"><span>Sweet Spot</span><div class="pl-bar"><i style="width:${rk.stats.sweetSpot * 10}%"></i></div><b>${rk.stats.sweetSpot}</b></div>
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
    if (nextBtn) nextBtn.textContent = curStep === 4 ? 'FIRST TAB ↺' : 'NEXT →';
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
      updateSummary();
    };
  });

  shell.querySelectorAll('#pl-humans-seg .pl-seg-btn').forEach(btn => {
    btn.onclick = () => {
      const val = btn.dataset.val;
      if ($('humans')) { $('humans').value = val; $('humans').dispatchEvent(new Event('change')); }
      shell.querySelectorAll('#pl-humans-seg .pl-seg-btn').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
    };
  });

  shell.querySelectorAll('.pl-ctrl-card').forEach(card => {
    card.onclick = () => {
      const val = card.dataset.ctrl;
      if ($('control')) { $('control').value = val; $('control').dispatchEvent(new Event('change')); }
      shell.querySelectorAll('.pl-ctrl-card').forEach(c => c.classList.remove('is-selected'));
      card.classList.add('is-selected');
    };
  });

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
        updateSummary();
      };
    });
  }
  bindSegment('pl-sets-seg', 'sets');
  bindSegment('pl-golden-seg', 'golden');
  bindSegment('pl-ai-seg', 'ai');
  bindSegment('pl-speed-seg', 'speed');

  // Online Drawer
  const onlineToggle = shell.querySelector('#pl-online-toggle');
  const onlineDrawer = shell.querySelector('#pl-online-drawer');
  const onlineArrow = shell.querySelector('#pl-online-arrow');
  if (onlineToggle && onlineDrawer) {
    onlineToggle.onclick = () => {
      onlineDrawer.hidden = !onlineDrawer.hidden;
      if (onlineArrow) onlineArrow.textContent = onlineDrawer.hidden ? '▼' : '▲';
    };
  }

  const roomInput = shell.querySelector('#pl-room-input');
  const onlineBtn = shell.querySelector('#pl-online-btn');
  if (onlineBtn && $('online')) {
    onlineBtn.onclick = () => {
      if ($('room')) $('room').value = roomInput?.value || '';
      $('online').click();
    };
  }

  // Career mode entry
  const careerBtn = shell.querySelector('#pl-career-btn');
  if (careerBtn) careerBtn.onclick = () => openCareer();

  // Training mode: same start path, flagged for main.js
  const tutBtn = shell.querySelector('#pl-tutorial-btn');
  if (tutBtn && $('start')) tutBtn.onclick = () => { cleanUp(); $('start').dataset.tutorial = '1'; $('start').click(); };

  // Forward match start
  const startBtn = shell.querySelector('#pl-start-btn');
  if (startBtn && $('start')) {
    startBtn.onclick = () => {
      cleanUp();
      $('start').click();
    };
  }

  // Initial population
  populateCharGrid('all');
  populateVenueGrid('all');
  populateRacketGrid();
  updateAvatarPreview(selectedCharIdx, selectedRacketIdx);
  updateSummary();

  // Xbox Gamepad Polling & Keyboard Grid Navigation
  let gpTimer = null;
  let careerPadHandler = null;
  let lastPadA = false, lastPadB = false, lastPadLB = false, lastPadRB = false, lastPadStart = false;
  let lastStickX = 0, lastStickY = 0;

  previewApi = {
    setCustomPreview,
    restoreQuickMatch() {
      const badge = shell.querySelector('.pl-preview-badge');
      if (badge) badge.textContent = 'LIVE PREVIEW';
      updateAvatarPreview(selectedCharIdx, selectedRacketIdx, true);
    },
    setPadHandler(fn) {
      careerPadHandler = fn;
      lastPadA = true; lastPadB = true; lastPadLB = true; lastPadRB = true; lastPadStart = true;
    },
  };

  function pollGamepads() {
    if (menuEl.hidden) return;
    const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    const statusText = gps.length > 0
      ? `🎮 ${gps.length} controller(s): ${gps[0].id.slice(0, 24)}…`
      : '🎮 No controller detected';

    const padHint = shell.querySelector('#pl-pad-status');
    const liveHint = shell.querySelector('#pl-gp-live');
    if (padHint) padHint.textContent = statusText;
    if (liveHint) liveHint.textContent = statusText;

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

      if (start && !lastPadStart) { cleanUp(); $('start')?.click(); }
      if (lb && !lastPadLB) switchStep(curStep - 1);
      if (rb && !lastPadRB) switchStep(curStep + 1);
      if (b && !lastPadB && curStep > 0) switchStep(curStep - 1);

      const sx = pad.axes[0] || (pad.buttons[15]?.pressed ? 1 : pad.buttons[14]?.pressed ? -1 : 0);
      const sy = pad.axes[1] || (pad.buttons[13]?.pressed ? 1 : pad.buttons[12]?.pressed ? -1 : 0);

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

  function navigateFocus(dx, dy) {
    const curStepEl = shell.querySelector(`.pl-step[data-step="${curStep}"]`);
    if (!curStepEl) return;
    const focusables = Array.from(curStepEl.querySelectorAll('button, input')).filter(el => el.offsetParent != null && !el.disabled);
    if (!focusables.length) return;
    const curIdx = focusables.indexOf(document.activeElement);
    if (curIdx < 0) { focusables[0].focus(); return; }

    const cols = curStepEl.querySelector('.pl-char-grid') ? 4 : curStepEl.querySelector('.pl-venue-grid') || curStepEl.querySelector('.pl-racket-grid') ? 3 : 2;
    let nextIdx = curIdx;
    if (dx !== 0) nextIdx += dx;
    if (dy !== 0) nextIdx += dy * cols;
    if (nextIdx >= 0 && nextIdx < focusables.length) {
      focusables[nextIdx].focus();
    }
  }

  // free the preview's WebGL context and thumbnails as soon as the menu hides (offline start or online lobby start)
  new MutationObserver(() => { if (menuEl.hidden) cleanUp(); }).observe(menuEl, { attributes: true, attributeFilter: ['hidden'] });

  function cleanUp() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (gpTimer) cancelAnimationFrame(gpTimer);
    if (previewRenderer) {
      previewRenderer.dispose();
      previewRenderer.forceContextLoss();
      previewRenderer = null;
    }
    disposeThumbs();
  }
}
