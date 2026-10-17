// Career mode UI screens: Template picker, Character Creator, Career Hub, Career Play, Match Reward, Profile.
// Reuses the menu's single 3D preview canvas (Intel HD 620 friendly) and routes all storage through src/career.js.
import characters from '../data/characters.json';
import venues from '../data/venues.json';
import rackets from '../data/rackets.json';
import eco from '../data/economy.json';
import {
  PROFILE_KEY,
  newProfile,
  loadProfile,
  saveProfile,
  exportProfile,
  importProfile,
  matchReward,
  applyReward,
} from './career.js';
import {
  countryFlag,
  setCareerPreview,
  restoreQuickMatchPreview,
  setCareerGamepadHandler,
} from './menu.js';
import { getPortraitThumb, getVenueThumb } from './thumbs.js';

const STORAGE_NOTICE = 'Your progress is saved in this browser only. Clearing browser data deletes it. Accounts are coming later.';
const BLOCKED_BANNER = 'Storage is blocked in this browser — progress will be lost when the page reloads.';
const CORRUPT_BANNER = 'Your saved profile could not be read.';

const SKIN_PRESETS = [
  ['#F9DCC4', 'Porcelain'],
  ['#F3D2B3', 'Fair'],
  ['#F1C27D', 'Warm Sand'],
  ['#E0B58F', 'Honey'],
  ['#D9A679', 'Tan'],
  ['#C68642', 'Bronze'],
  ['#A5714B', 'Chestnut'],
  ['#8D5524', 'Espresso'],
];

// 8 hair/beard presets: black, dark brown, brown, chestnut, red/auburn, blonde, ash, grey
const HAIR_PRESETS = [
  ['#141414', 'Black'],
  ['#2b1d14', 'Dark Brown'],
  ['#4a2f1d', 'Brown'],
  ['#7a5230', 'Chestnut'],
  ['#8e3b1f', 'Red'],
  ['#d6b46a', 'Blonde'],
  ['#9e9a93', 'Ash'],
  ['#b5b5b5', 'Grey'],
];

const ACCENT_PRESETS = ['#1b1b1b', '#ffffff', '#e63946', '#2f6fb5', '#d8f53a', '#2ec4b6'];

const BODY_TYPES = [
  { id: 'slim', label: 'Slim', width: 0.9 },
  { id: 'athletic', label: 'Athletic', width: 1.0 },
  { id: 'muscular', label: 'Muscular', width: 1.12 },
  { id: 'stocky', label: 'Stocky', width: 1.15 },
  { id: 'tall', label: 'Tall', width: 0.97 },
  { id: 'petite', label: 'Petite', width: 0.92 },
];

const HAIR_STYLES = [
  { id: 'Hair_SimpleParted', label: 'Parted' },
  { id: 'Hair_Buzzed', label: 'Buzzed' },
  { id: 'Hair_BuzzedFemale', label: 'Short Crop' },
  { id: 'Hair_Long', label: 'Long' },
  { id: 'Hair_Buns', label: 'Buns' },
  { id: 'none', label: 'None / Bald' },
];

const BEARD_STYLES = [
  { id: 'none', label: 'None' },
  { id: 'stubble', label: 'Stubble' },
  { id: 'full', label: 'Full' },
  { id: 'goatee', label: 'Goatee' },
];

const AI_LEVELS = [
  { id: 'rookie', label: 'Rookie', stars: '★' },
  { id: 'club', label: 'Club', stars: '★★' },
  { id: 'pro', label: 'Pro', stars: '★★★' },
  { id: 'legend', label: 'Legend', stars: '★★★★' },
];

function buildCountriesList() {
  const map = new Map();
  for (const c of characters) {
    if (c.countryCode && c.country) map.set(c.countryCode, c.country);
  }
  for (const v of venues) {
    if (v.countryCode && v.country && !map.has(v.countryCode)) map.set(v.countryCode, v.country);
  }
  const extras = [
    ['FR', 'France'],
    ['PT', 'Portugal'],
    ['BR', 'Brazil'],
    ['GB', 'United Kingdom'],
    ['DE', 'Germany'],
    ['US', 'United States'],
  ];
  for (const [code, name] of extras) {
    if (!map.has(code)) map.set(code, name);
  }
  return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
}

const COUNTRIES = buildCountriesList();

const throwingStore = {
  getItem() { throw new Error('localStorage unavailable'); },
  setItem() { throw new Error('localStorage unavailable'); },
  removeItem() {},
};

function getStore() {
  try {
    return window.localStorage || throwingStore;
  } catch {
    return throwingStore;
  }
}

let startMatchFn = null;
let careerPanel = null;
let fileInputEl = null;
let isOpen = false;
let curScreen = 'hub'; // 'templates' | 'creator' | 'hub' | 'play' | 'reward' | 'profile'

let profile = null;
let memProfile = null;
let storageBlocked = false;
let corruptState = false;
let flashMsg = null; // { type: 'error'|'ok', text: string }
let deleteConfirmOpen = false;
let templateFilter = 'all';

// Creator state
let creatorMode = 'create'; // 'create' | 'edit'
let creatorTemplate = characters[0];
let creatorState = null;
let previewDebounceTimer = null;

// Play state
const playState = {
  players: 4,
  ai: 'club',
  venueIdx: 0,
  partnerIdx: 0,
};

function equippedRacket(p = profile) {
  const id = p?.equipped?.racket || 'r01';
  return rackets.find(r => r.id === id) || rackets[0];
}

function statBarHtml(name, val) {
  const pct = Math.min(100, (val / 10) * 100);
  return `
    <div class="pl-stat-row">
      <span class="pl-stat-name">${name}</span>
      <div class="pl-stat-track"><div class="pl-stat-fill" style="width:${pct}%"></div></div>
      <span class="pl-stat-val">${val}</span>
    </div>
  `;
}

function buildLeftPanelHtml(ch, stats, p = null) {
  const flag = countryFlag(ch.countryCode);
  const gText = ch.gender === 'f' ? 'FEMALE' : 'MALE';
  const hText = ch.hand === 'left' ? 'LEFT-HANDED' : 'RIGHT-HANDED';
  const s = stats || ch.stats || { speed: 4, power: 4, control: 4, volley: 4, smash: 4, stamina: 4 };
  const currencyRow = p
    ? `
      <div class="cr-left-currencies">
        <div class="cr-left-curr"><span>Credits</span><b class="tabular">${p.credits}</b></div>
        <div class="cr-left-curr rp"><span>Ranking points</span><b class="tabular">${p.rankingPoints}</b></div>
        <div class="cr-left-curr wr"><span>World rank</span><b>—</b></div>
      </div>
    `
    : '';
  return `
    <div class="pl-char-header">
      <div class="pl-char-title-wrap">
        <span class="pl-char-flag">${flag}</span>
        <h2 class="pl-char-name" lang="en">${escapeHtml(ch.name || 'Player')}</h2>
      </div>
      <div class="pl-char-tags">
        <span class="pl-meta-pill">${gText}</span>
        <span class="pl-meta-pill">${hText}</span>
      </div>
    </div>
    ${currencyRow}
    <div class="pl-stats-list">
      ${statBarHtml('SPEED', s.speed ?? 4)}
      ${statBarHtml('POWER', s.power ?? 4)}
      ${statBarHtml('CONTROL', s.control ?? 4)}
      ${statBarHtml('VOLLEY', s.volley ?? 4)}
      ${statBarHtml('SMASH', s.smash ?? 4)}
      ${statBarHtml('STAMINA', s.stamina ?? 4)}
    </div>
  `;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeHex(hex, fallback = '#2b1d14') {
  if (typeof hex !== 'string') return fallback;
  const m = hex.trim().match(/^#[0-9a-fA-F]{6}$/);
  return m ? hex.toLowerCase() : fallback;
}

function initCreatorStateFrom(ch) {
  const bType = ch.body?.type || 'athletic';
  const bHeight = Number(ch.body?.height ?? 1.0);
  const fWidth = Number(ch.face?.width ?? 1.0);
  const hairModel = Array.isArray(ch.hair) ? (ch.hair[0] || 'Hair_SimpleParted') : (ch.hair || (ch.gender === 'f' ? 'Hair_Long' : 'Hair_SimpleParted'));
  const hasBobCut = hairModel === 'Hair_Long' && typeof ch.hairCut === 'number';
  const glassesColor = ch.glasses ? (ch.glasses === true ? '#1b1b1b' : normalizeHex(ch.glasses, '#1b1b1b')) : null;
  const hwType = ch.headwear?.type || 'none';
  const hwColor = normalizeHex(ch.headwear?.color, '#e63946');

  creatorState = {
    name: (ch.name || 'Player').slice(0, 16),
    countryCode: ch.countryCode || 'TR',
    country: ch.country || 'Türkiye',
    gender: ch.gender === 'f' ? 'f' : 'm',
    hand: ch.hand === 'left' ? 'left' : 'right',
    skinTone: normalizeHex(ch.skinTone, '#D9A679'),
    bodyType: BODY_TYPES.some(t => t.id === bType) ? bType : 'athletic',
    bodyHeight: Math.max(0.9, Math.min(1.1, bHeight)),
    faceWidth: Math.max(0.9, Math.min(1.12, fWidth)),
    hair: HAIR_STYLES.some(h => h.id === hairModel) ? hairModel : 'Hair_SimpleParted',
    hairCutEnabled: hasBobCut,
    hairCut: hasBobCut ? Math.max(1.48, Math.min(1.62, ch.hairCut)) : 1.56,
    ponytail: !!ch.ponytail,
    topknot: !!ch.topknot,
    hairColor: normalizeHex(ch.hairColor, '#2b1d14'),
    beard: BEARD_STYLES.some(b => b.id === ch.beard) ? ch.beard : 'none',
    beardColor: normalizeHex(ch.beardColor || ch.hairColor, '#2b1d14'),
    glassesOn: !!ch.glasses,
    glassesColor: glassesColor || '#1b1b1b',
    makeup: !!ch.makeup,
    headwearType: hwType === 'headband' || hwType === 'visor' ? hwType : 'none',
    headwearColor: hwColor,
  };
}

function buildLookFromCreator() {
  const s = creatorState;
  const bSpec = BODY_TYPES.find(t => t.id === s.bodyType) || BODY_TYPES[1];
  return {
    name: s.name.trim().slice(0, 16),
    country: s.country,
    countryCode: s.countryCode,
    gender: s.gender,
    hand: s.hand,
    skinTone: s.skinTone,
    body: {
      type: bSpec.id,
      height: Number(s.bodyHeight.toFixed(2)),
      width: bSpec.width,
    },
    face: {
      width: Number(s.faceWidth.toFixed(2)),
    },
    hair: s.hair,
    hairCut: s.hair === 'Hair_Long' && s.hairCutEnabled ? Number(s.hairCut.toFixed(2)) : undefined,
    ponytail: s.ponytail,
    topknot: s.topknot,
    hairColor: s.hairColor,
    beard: s.beard === 'none' ? null : s.beard,
    beardColor: s.beardColor,
    glasses: s.glassesOn ? s.glassesColor : null,
    makeup: s.makeup,
    headwear: s.headwearType === 'none' ? null : { type: s.headwearType, color: s.headwearColor },
  };
}

function cleanCharacterLook(ch) {
  const out = { ...ch };
  if (!out.beard || out.beard === 'none') delete out.beard;
  if (out.hair !== 'Hair_Long' || out.hairCut == null) delete out.hairCut;
  if (!out.glasses) delete out.glasses;
  if (!out.headwear) delete out.headwear;
  if (!out.ponytail) delete out.ponytail;
  if (!out.topknot) delete out.topknot;
  if (!out.makeup) delete out.makeup;
  return out;
}

function scheduleCreatorPreview(immediate = false) {
  if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
  const run = () => {
    const look = buildLookFromCreator();
    const previewChar = cleanCharacterLook({
      ...creatorTemplate,
      ...look,
      id: 'me_preview_' + Date.now(),
    });
    const rk = equippedRacket(profile);
    const stats = creatorMode === 'edit' && profile ? profile.stats : { speed: 4, power: 4, control: 4, volley: 4, smash: 4, stamina: 4 };
    setCareerPreview(previewChar, rk, buildLeftPanelHtml(previewChar, stats, creatorMode === 'edit' ? profile : null), 'CAREER CREATOR');
  };
  if (immediate) run();
  else previewDebounceTimer = setTimeout(run, 150);
}

function persistProfile(nextProfile) {
  profile = nextProfile;
  memProfile = nextProfile;
  const ok = saveProfile(getStore(), nextProfile);
  if (!ok) storageBlocked = true;
  return ok;
}

function syncProfileFromStorage() {
  const res = loadProfile(getStore());
  if (res.status === 'unavailable') {
    storageBlocked = true;
    corruptState = false;
    profile = memProfile;
    return res.status;
  }
  if (res.status === 'corrupt') {
    corruptState = true;
    profile = null;
    return 'corrupt';
  }
  corruptState = false;
  if (res.status === 'ok') {
    profile = res.profile;
    memProfile = res.profile;
    return 'ok';
  }
  profile = null;
  return 'none';
}

function renderBannersHtml() {
  let html = '';
  if (storageBlocked) {
    html += `
      <div class="cr-banner cr-banner-warn" role="alert">
        <span>⚠️ ${BLOCKED_BANNER}</span>
      </div>
    `;
  }
  if (corruptState) {
    html += `
      <div class="cr-banner cr-banner-err" role="alert">
        <span>⚠️ ${CORRUPT_BANNER}</span>
        <div class="cr-banner-actions">
          <button type="button" class="cr-btn cr-btn-acc" id="cr-corrupt-new">Start new</button>
          <button type="button" class="cr-btn" id="cr-corrupt-import">Import</button>
        </div>
      </div>
    `;
  }
  if (flashMsg) {
    const cls = flashMsg.type === 'error' ? 'cr-msg-error' : 'cr-msg-ok';
    html += `<div class="cr-msg ${cls}" role="status">${escapeHtml(flashMsg.text)}</div>`;
  }
  return html;
}

function wireBannerButtons() {
  const startNewBtn = careerPanel.querySelector('#cr-corrupt-new');
  if (startNewBtn) {
    startNewBtn.onclick = () => {
      corruptState = false;
      flashMsg = null;
      try { getStore().removeItem?.(PROFILE_KEY); } catch {}
      showScreen('templates');
    };
  }
  const impBtn = careerPanel.querySelector('#cr-corrupt-import');
  if (impBtn) {
    impBtn.onclick = () => triggerImportFilePicker();
  }
}

function triggerImportFilePicker() {
  if (!fileInputEl) return;
  fileInputEl.value = '';
  fileInputEl.click();
}

function handleImportFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = importProfile(String(reader.result || ''));
      corruptState = false;
      flashMsg = { type: 'ok', text: 'Profile imported successfully.' };
      persistProfile(imported);
      showScreen(curScreen === 'profile' ? 'profile' : 'hub');
    } catch {
      flashMsg = { type: 'error', text: 'Invalid profile file — could not import.' };
      renderCurrentScreen();
    }
  };
  reader.onerror = () => {
    flashMsg = { type: 'error', text: 'Could not read the selected file.' };
    renderCurrentScreen();
  };
  reader.readAsText(file);
}

function showScreen(screen) {
  curScreen = screen;
  deleteConfirmOpen = false;
  renderCurrentScreen();
}

function renderCurrentScreen() {
  if (!careerPanel) return;
  if (curScreen === 'templates') renderTemplatesScreen();
  else if (curScreen === 'creator') renderCreatorScreen();
  else if (curScreen === 'reward') renderRewardScreen();
  else if (curScreen === 'play') renderPlayScreen();
  else if (curScreen === 'profile') renderProfileScreen();
  else renderHubScreen();
}

// 1. No Profile -> 26 Character Template Selection
function renderTemplatesScreen() {
  const previewCh = creatorTemplate || characters[0];
  setCareerPreview(
    previewCh,
    rackets[0],
    buildLeftPanelHtml(previewCh, { speed: 4, power: 4, control: 4, volley: 4, smash: 4, stamina: 4 }, null),
    'CHOOSE TEMPLATE'
  );

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">NEW CAREER · <span>CHOOSE A TEMPLATE</span></h2>
        <div class="cr-sub">Pick any of the 26 players as your starting template, then customize your look.</div>
      </div>
      <div class="cr-banner-actions">
        <button type="button" class="cr-btn" id="cr-tpl-import">Import Profile</button>
        <button type="button" class="cr-btn" id="cr-tpl-back">← Back to menu</button>
      </div>
    </div>
    <div class="pl-filter-row" id="cr-tpl-filters">
      <button type="button" class="pl-chip ${templateFilter === 'all' ? 'is-active' : ''}" data-filter="all">All (26)</button>
      <button type="button" class="pl-chip ${templateFilter === 'f' ? 'is-active' : ''}" data-filter="f">Women</button>
      <button type="button" class="pl-chip ${templateFilter === 'm' ? 'is-active' : ''}" data-filter="m">Men</button>
    </div>
    <div class="cr-body">
      <div class="pl-char-grid" id="cr-tpl-grid"></div>
    </div>
    <div class="cr-foot">
      <div class="cr-storage-note">${STORAGE_NOTICE}</div>
    </div>
  `;

  wireBannerButtons();
  careerPanel.querySelector('#cr-tpl-import').onclick = () => triggerImportFilePicker();
  careerPanel.querySelector('#cr-tpl-back').onclick = () => closeCareer();

  careerPanel.querySelectorAll('#cr-tpl-filters .pl-chip').forEach(chip => {
    chip.onclick = () => {
      templateFilter = chip.dataset.filter;
      renderTemplatesScreen();
    };
  });

  const grid = careerPanel.querySelector('#cr-tpl-grid');
  characters.forEach((ch, idx) => {
    if (templateFilter !== 'all' && ch.gender !== templateFilter) return;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `pl-card pl-char-card ${ch.id === creatorTemplate?.id ? 'is-selected' : ''}`;
    card.innerHTML = `
      <div class="pl-thumb-box pl-portrait-box shimmer">
        <span class="pl-gender-badge">${ch.gender === 'f' ? 'F' : 'M'}</span>
        <img class="pl-thumb-img" alt="${escapeHtml(ch.name)}" />
      </div>
      <div class="pl-char-card-meta">
        <span class="pl-char-card-flag">${countryFlag(ch.countryCode)}</span>
        <div class="pl-char-card-name" lang="en">${escapeHtml(ch.name)}</div>
      </div>
      <span class="pl-check">✓</span>
    `;
    const box = card.querySelector('.pl-thumb-box');
    const img = card.querySelector('.pl-thumb-img');
    getPortraitThumb(ch, (url) => {
      img.src = url;
      img.onload = () => box.classList.remove('shimmer');
    }, idx < 8);

    const previewThis = () => {
      creatorTemplate = ch;
      setCareerPreview(
        ch,
        rackets[0],
        buildLeftPanelHtml(ch, { speed: 4, power: 4, control: 4, volley: 4, smash: 4, stamina: 4 }, null),
        'CHOOSE TEMPLATE'
      );
    };
    card.onmouseenter = previewThis;
    card.onfocus = previewThis;
    card.onclick = () => {
      creatorTemplate = ch;
      creatorMode = 'create';
      initCreatorStateFrom(ch);
      flashMsg = null;
      showScreen('creator');
    };
    grid.appendChild(card);
  });
}

// 2. Character Creator (Create & Edit look)
function renderCreatorScreen() {
  if (!creatorState) initCreatorStateFrom(creatorTemplate || characters[0]);
  const s = creatorState;
  const isEdit = creatorMode === 'edit';
  const validName = s.name.trim().length >= 1 && s.name.trim().length <= 16;

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${isEdit ? 'PROFILE · <span>EDIT LOOK</span>' : 'CREATE <span>YOUR PLAYER</span>'}</h2>
        <div class="cr-sub">${isEdit ? 'Free appearance editor — stats and career progress are unaffected.' : 'Customize every detail. Starting career stats are all 4.'}</div>
      </div>
      <button type="button" class="cr-btn" id="cr-creator-back">${isEdit ? '← Back to Profile' : '← Templates'}</button>
    </div>

    <div class="cr-body">
      <div class="cr-form-grid">
        <!-- Name -->
        <div class="cr-field">
          <div class="cr-field-head"><span>Player Name (1–16)</span><b id="cr-name-len">${s.name.trim().length}/16</b></div>
          <input type="text" class="cr-input" id="cr-name-input" maxlength="16" value="${escapeHtml(s.name)}" placeholder="Enter player name" />
        </div>

        <!-- Country -->
        <div class="cr-field">
          <div class="cr-field-head"><span>Country</span><b>${countryFlag(s.countryCode)} ${escapeHtml(s.countryCode)}</b></div>
          <select class="cr-select" id="cr-country-select">
            ${COUNTRIES.map(c => `<option value="${c.code}" ${c.code === s.countryCode ? 'selected' : ''}>${countryFlag(c.code)} ${escapeHtml(c.name)} (${c.code})</option>`).join('')}
          </select>
        </div>

        <!-- Gender (from template, read-only) & Dominant Hand -->
        <div class="cr-field">
          <div class="cr-field-head"><span>Gender (Template)</span><b>${s.gender === 'f' ? 'FEMALE' : 'MALE'}</b></div>
          <div class="cr-opt-wrap">
            <span class="pl-meta-pill">Locked to template (${s.gender === 'f' ? 'Female' : 'Male'})</span>
          </div>
        </div>

        <div class="cr-field">
          <div class="cr-field-head"><span>Hand</span><b>${s.hand.toUpperCase()}</b></div>
          <div class="pl-seg-row" id="cr-hand-seg">
            <button type="button" class="pl-seg-btn ${s.hand === 'right' ? 'is-selected' : ''}" data-hand="right">Right-handed</button>
            <button type="button" class="pl-seg-btn ${s.hand === 'left' ? 'is-selected' : ''}" data-hand="left">Left-handed</button>
          </div>
        </div>

        <!-- Skin Tone -->
        <div class="cr-field is-full">
          <div class="cr-field-head"><span>Skin Tone</span><b>${s.skinTone.toUpperCase()}</b></div>
          <div class="cr-swatches" id="cr-skin-swatches">
            ${SKIN_PRESETS.map(([hex, label]) => `
              <button type="button" class="cr-swatch ${s.skinTone.toLowerCase() === hex.toLowerCase() ? 'is-selected' : ''}" style="background:${hex}" data-hex="${hex}" title="${label}"></button>
            `).join('')}
            <input type="color" class="cr-color-input" id="cr-skin-picker" value="${s.skinTone}" title="Custom skin tone" />
          </div>
        </div>

        <!-- Body Type -->
        <div class="cr-field is-full">
          <div class="cr-field-head"><span>Body Type</span><b>${s.bodyType.toUpperCase()}</b></div>
          <div class="cr-opt-wrap" id="cr-body-types">
            ${BODY_TYPES.map(t => `
              <button type="button" class="cr-opt-btn ${s.bodyType === t.id ? 'is-selected' : ''}" data-btype="${t.id}">${t.label}</button>
            `).join('')}
          </div>
        </div>

        <!-- Body Height & Face Width -->
        <div class="cr-field">
          <div class="cr-field-head"><span>Body Height</span><b id="cr-height-val">${s.bodyHeight.toFixed(2)}×</b></div>
          <input type="range" class="cr-range" id="cr-height-range" min="0.9" max="1.1" step="0.01" value="${s.bodyHeight}" />
        </div>

        <div class="cr-field">
          <div class="cr-field-head"><span>Face Width</span><b id="cr-face-val">${s.faceWidth.toFixed(2)}×</b></div>
          <input type="range" class="cr-range" id="cr-face-range" min="0.9" max="1.12" step="0.01" value="${s.faceWidth}" />
        </div>

        <!-- Hair Style -->
        <div class="cr-field is-full">
          <div class="cr-field-head"><span>Hair Style</span><b>${HAIR_STYLES.find(h => h.id === s.hair)?.label || s.hair}</b></div>
          <div class="cr-opt-wrap" id="cr-hair-styles">
            ${HAIR_STYLES.map(h => `
              <button type="button" class="cr-opt-btn ${s.hair === h.id ? 'is-selected' : ''}" data-hair="${h.id}">${h.label}</button>
            `).join('')}
            <button type="button" class="cr-opt-btn ${s.ponytail ? 'is-selected' : ''}" id="cr-ponytail-btn">Ponytail: ${s.ponytail ? 'ON' : 'OFF'}</button>
            <button type="button" class="cr-opt-btn ${s.topknot ? 'is-selected' : ''}" id="cr-topknot-btn">Topknot: ${s.topknot ? 'ON' : 'OFF'}</button>
          </div>
          ${s.hair === 'Hair_Long' ? `
            <div style="display:flex;align-items:center;gap:10px;margin-top:6px;flex-wrap:wrap">
              <button type="button" class="cr-opt-btn ${!s.hairCutEnabled ? 'is-selected' : ''}" id="cr-haircut-full">Full Long</button>
              <button type="button" class="cr-opt-btn ${s.hairCutEnabled ? 'is-selected' : ''}" id="cr-haircut-bob">Bob Cut</button>
              <input type="range" class="cr-range" id="cr-haircut-range" min="1.47" max="1.62" step="0.01" value="${s.hairCutEnabled ? s.hairCut : 1.47}" style="flex:1;min-width:120px" />
              <span class="pl-meta-pill" id="cr-haircut-val">${s.hairCutEnabled ? `Cut ${s.hairCut.toFixed(2)}m` : 'Full Long'}</span>
            </div>
          ` : ''}
        </div>

        <!-- Hair Color -->
        <div class="cr-field">
          <div class="cr-field-head"><span>Hair Color</span><b>${s.hairColor.toUpperCase()}</b></div>
          <div class="cr-swatches" id="cr-hair-swatches">
            ${HAIR_PRESETS.map(([hex, label]) => `
              <button type="button" class="cr-swatch ${s.hairColor.toLowerCase() === hex.toLowerCase() ? 'is-selected' : ''}" style="background:${hex}" data-hex="${hex}" title="${label}"></button>
            `).join('')}
            <input type="color" class="cr-color-input" id="cr-hair-picker" value="${s.hairColor}" title="Custom hair color" />
          </div>
        </div>

        <!-- Beard & Beard Color -->
        <div class="cr-field">
          <div class="cr-field-head"><span>Beard</span><b>${s.beard.toUpperCase()}</b></div>
          <div class="cr-opt-wrap" id="cr-beard-styles">
            ${BEARD_STYLES.map(b => `
              <button type="button" class="cr-opt-btn ${s.beard === b.id ? 'is-selected' : ''}" data-beard="${b.id}">${b.label}</button>
            `).join('')}
          </div>
          <div class="cr-swatches" id="cr-beard-swatches" style="margin-top:4px">
            ${HAIR_PRESETS.map(([hex, label]) => `
              <button type="button" class="cr-swatch ${s.beardColor.toLowerCase() === hex.toLowerCase() ? 'is-selected' : ''}" style="background:${hex}" data-hex="${hex}" title="${label}"></button>
            `).join('')}
            <input type="color" class="cr-color-input" id="cr-beard-picker" value="${s.beardColor}" title="Custom beard color" />
          </div>
        </div>

        <!-- Glasses & Makeup -->
        <div class="cr-field">
          <div class="cr-field-head"><span>Glasses & Makeup</span></div>
          <div class="cr-opt-wrap">
            <button type="button" class="cr-opt-btn ${!s.glassesOn ? 'is-selected' : ''}" id="cr-glasses-off">No Glasses</button>
            <button type="button" class="cr-opt-btn ${s.glassesOn ? 'is-selected' : ''}" id="cr-glasses-on">Glasses</button>
            <button type="button" class="cr-opt-btn ${s.makeup ? 'is-selected' : ''}" id="cr-makeup-btn">Makeup: ${s.makeup ? 'ON' : 'OFF'}</button>
          </div>
          ${s.glassesOn ? `
            <div class="cr-swatches" id="cr-glasses-swatches" style="margin-top:4px">
              ${ACCENT_PRESETS.map(hex => `
                <button type="button" class="cr-swatch ${s.glassesColor.toLowerCase() === hex.toLowerCase() ? 'is-selected' : ''}" style="background:${hex}" data-hex="${hex}"></button>
              `).join('')}
              <input type="color" class="cr-color-input" id="cr-glasses-picker" value="${s.glassesColor}" title="Glasses frame color" />
            </div>
          ` : ''}
        </div>

        <!-- Headwear -->
        <div class="cr-field">
          <div class="cr-field-head"><span>Headwear</span><b>${s.headwearType.toUpperCase()}</b></div>
          <div class="cr-opt-wrap" id="cr-hw-types">
            <button type="button" class="cr-opt-btn ${s.headwearType === 'none' ? 'is-selected' : ''}" data-hw="none">None</button>
            <button type="button" class="cr-opt-btn ${s.headwearType === 'headband' ? 'is-selected' : ''}" data-hw="headband">Headband</button>
            <button type="button" class="cr-opt-btn ${s.headwearType === 'visor' ? 'is-selected' : ''}" data-hw="visor">Visor</button>
          </div>
          ${s.headwearType !== 'none' ? `
            <div class="cr-swatches" id="cr-hw-swatches" style="margin-top:4px">
              ${ACCENT_PRESETS.map(hex => `
                <button type="button" class="cr-swatch ${s.headwearColor.toLowerCase() === hex.toLowerCase() ? 'is-selected' : ''}" style="background:${hex}" data-hex="${hex}"></button>
              `).join('')}
              <input type="color" class="cr-color-input" id="cr-hw-picker" value="${s.headwearColor}" title="Headwear color" />
            </div>
          ` : ''}
        </div>
      </div>
    </div>

    <div class="cr-foot">
      <div class="cr-foot-row">
        <span class="cr-sub">${isEdit ? 'Look edits are free and never alter your stats.' : 'Template: ' + escapeHtml(creatorTemplate?.name || '')}</span>
        <button type="button" class="cr-btn cr-btn-acc" id="cr-create-submit" ${validName ? '' : 'disabled'}>${isEdit ? 'Save Look' : 'Create'}</button>
      </div>
      <div class="cr-storage-note">${STORAGE_NOTICE}</div>
    </div>
  `;

  wireBannerButtons();
  scheduleCreatorPreview(true);

  careerPanel.querySelector('#cr-creator-back').onclick = () => {
    showScreen(isEdit ? 'profile' : 'templates');
  };

  const nameInput = careerPanel.querySelector('#cr-name-input');
  const submitBtn = careerPanel.querySelector('#cr-create-submit');
  const nameLen = careerPanel.querySelector('#cr-name-len');
  nameInput.oninput = () => {
    s.name = nameInput.value.slice(0, 16);
    const len = s.name.trim().length;
    if (nameLen) nameLen.textContent = `${len}/16`;
    if (submitBtn) submitBtn.disabled = len < 1 || len > 16;
    scheduleCreatorPreview(false);
  };

  const countrySel = careerPanel.querySelector('#cr-country-select');
  countrySel.onchange = () => {
    const found = COUNTRIES.find(c => c.code === countrySel.value);
    if (found) {
      s.countryCode = found.code;
      s.country = found.name;
      renderCreatorScreen();
    }
  };

  careerPanel.querySelectorAll('#cr-hand-seg [data-hand]').forEach(btn => {
    btn.onclick = () => {
      s.hand = btn.dataset.hand;
      renderCreatorScreen();
    };
  });

  careerPanel.querySelectorAll('#cr-skin-swatches [data-hex]').forEach(btn => {
    btn.onclick = () => {
      s.skinTone = btn.dataset.hex;
      renderCreatorScreen();
    };
  });
  const skinPicker = careerPanel.querySelector('#cr-skin-picker');
  if (skinPicker) {
    skinPicker.oninput = () => {
      s.skinTone = skinPicker.value;
      scheduleCreatorPreview(false);
    };
  }

  careerPanel.querySelectorAll('#cr-body-types [data-btype]').forEach(btn => {
    btn.onclick = () => {
      s.bodyType = btn.dataset.btype;
      renderCreatorScreen();
    };
  });

  const heightRange = careerPanel.querySelector('#cr-height-range');
  const heightVal = careerPanel.querySelector('#cr-height-val');
  heightRange.oninput = () => {
    s.bodyHeight = parseFloat(heightRange.value);
    if (heightVal) heightVal.textContent = `${s.bodyHeight.toFixed(2)}×`;
    scheduleCreatorPreview(false);
  };

  const faceRange = careerPanel.querySelector('#cr-face-range');
  const faceVal = careerPanel.querySelector('#cr-face-val');
  faceRange.oninput = () => {
    s.faceWidth = parseFloat(faceRange.value);
    if (faceVal) faceVal.textContent = `${s.faceWidth.toFixed(2)}×`;
    scheduleCreatorPreview(false);
  };

  careerPanel.querySelectorAll('#cr-hair-styles [data-hair]').forEach(btn => {
    btn.onclick = () => {
      s.hair = btn.dataset.hair;
      renderCreatorScreen();
    };
  });

  const ponytailBtn = careerPanel.querySelector('#cr-ponytail-btn');
  if (ponytailBtn) ponytailBtn.onclick = () => { s.ponytail = !s.ponytail; renderCreatorScreen(); };
  const topknotBtn = careerPanel.querySelector('#cr-topknot-btn');
  if (topknotBtn) topknotBtn.onclick = () => { s.topknot = !s.topknot; renderCreatorScreen(); };

  const hairFullBtn = careerPanel.querySelector('#cr-haircut-full');
  if (hairFullBtn) hairFullBtn.onclick = () => { s.hairCutEnabled = false; renderCreatorScreen(); };
  const hairBobBtn = careerPanel.querySelector('#cr-haircut-bob');
  if (hairBobBtn) hairBobBtn.onclick = () => { s.hairCutEnabled = true; renderCreatorScreen(); };
  const hairCutRange = careerPanel.querySelector('#cr-haircut-range');
  const hairCutVal = careerPanel.querySelector('#cr-haircut-val');
  if (hairCutRange) {
    hairCutRange.oninput = () => {
      const v = parseFloat(hairCutRange.value);
      if (v <= 1.47) {
        s.hairCutEnabled = false;
        if (hairCutVal) hairCutVal.textContent = 'Full Long';
      } else {
        s.hairCutEnabled = true;
        s.hairCut = v;
        if (hairCutVal) hairCutVal.textContent = `Cut ${s.hairCut.toFixed(2)}m`;
      }
      if (hairFullBtn) hairFullBtn.classList.toggle('is-selected', !s.hairCutEnabled);
      if (hairBobBtn) hairBobBtn.classList.toggle('is-selected', s.hairCutEnabled);
      scheduleCreatorPreview(false);
    };
  }

  careerPanel.querySelectorAll('#cr-hair-swatches [data-hex]').forEach(btn => {
    btn.onclick = () => { s.hairColor = btn.dataset.hex; renderCreatorScreen(); };
  });
  const hairPicker = careerPanel.querySelector('#cr-hair-picker');
  if (hairPicker) {
    hairPicker.oninput = () => { s.hairColor = hairPicker.value; scheduleCreatorPreview(false); };
  }

  careerPanel.querySelectorAll('#cr-beard-styles [data-beard]').forEach(btn => {
    btn.onclick = () => { s.beard = btn.dataset.beard; renderCreatorScreen(); };
  });
  careerPanel.querySelectorAll('#cr-beard-swatches [data-hex]').forEach(btn => {
    btn.onclick = () => { s.beardColor = btn.dataset.hex; renderCreatorScreen(); };
  });
  const beardPicker = careerPanel.querySelector('#cr-beard-picker');
  if (beardPicker) {
    beardPicker.oninput = () => { s.beardColor = beardPicker.value; scheduleCreatorPreview(false); };
  }

  const glOff = careerPanel.querySelector('#cr-glasses-off');
  if (glOff) glOff.onclick = () => { s.glassesOn = false; renderCreatorScreen(); };
  const glOn = careerPanel.querySelector('#cr-glasses-on');
  if (glOn) glOn.onclick = () => { s.glassesOn = true; renderCreatorScreen(); };
  const mkBtn = careerPanel.querySelector('#cr-makeup-btn');
  if (mkBtn) mkBtn.onclick = () => { s.makeup = !s.makeup; renderCreatorScreen(); };

  careerPanel.querySelectorAll('#cr-glasses-swatches [data-hex]').forEach(btn => {
    btn.onclick = () => { s.glassesColor = btn.dataset.hex; renderCreatorScreen(); };
  });
  const glPicker = careerPanel.querySelector('#cr-glasses-picker');
  if (glPicker) {
    glPicker.oninput = () => { s.glassesColor = glPicker.value; scheduleCreatorPreview(false); };
  }

  careerPanel.querySelectorAll('#cr-hw-types [data-hw]').forEach(btn => {
    btn.onclick = () => { s.headwearType = btn.dataset.hw; renderCreatorScreen(); };
  });
  careerPanel.querySelectorAll('#cr-hw-swatches [data-hex]').forEach(btn => {
    btn.onclick = () => { s.headwearColor = btn.dataset.hex; renderCreatorScreen(); };
  });
  const hwPicker = careerPanel.querySelector('#cr-hw-picker');
  if (hwPicker) {
    hwPicker.oninput = () => { s.headwearColor = hwPicker.value; scheduleCreatorPreview(false); };
  }

  submitBtn.onclick = () => {
    const trimmed = s.name.trim().slice(0, 16);
    if (!trimmed) return;
    s.name = trimmed;
    const look = buildLookFromCreator();
    if (isEdit && profile) {
      const updatedPlayer = cleanCharacterLook({ ...profile.player, ...look, id: 'me' });
      persistProfile({ ...profile, player: updatedPlayer });
      flashMsg = { type: 'ok', text: 'Appearance updated.' };
      showScreen('profile');
    } else {
      const created = newProfile(creatorTemplate || characters[0], look);
      created.player = cleanCharacterLook(created.player);
      persistProfile(created);
      flashMsg = null;
      showScreen('hub');
    }
  };
}

// 3. Career Hub
function renderHubScreen() {
  if (!profile) {
    showScreen('templates');
    return;
  }
  if (profile.lastReward) {
    showScreen('reward');
    return;
  }

  const pl = profile.player;
  const rk = equippedRacket(profile);
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), 'CAREER HUB');

  const h = profile.history || { played: 0, won: 0, pointsWon: 0 };

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-profile-banner">
      <div class="cr-prof-id">
        <span class="cr-prof-flag">${countryFlag(pl.countryCode)}</span>
        <div>
          <div class="cr-prof-name" lang="en">${escapeHtml(pl.name)}</div>
          <div class="cr-prof-rank">World rank: — · Record: ${h.won}W – ${Math.max(0, h.played - h.won)}L (${h.played} played)</div>
        </div>
      </div>
      <div class="cr-currencies">
        <div class="cr-curr-box">
          <span class="cr-curr-label">Credits</span>
          <span class="cr-curr-val tabular">${profile.credits}</span>
        </div>
        <div class="cr-curr-box is-rp">
          <span class="cr-curr-label">Ranking points</span>
          <span class="cr-curr-val tabular">${profile.rankingPoints}</span>
        </div>
        <div class="cr-curr-box is-wr">
          <span class="cr-curr-label">World rank: —</span>
          <span class="cr-curr-val">—</span>
        </div>
      </div>
    </div>

    <div class="cr-body">
      <div class="cr-hub-grid">
        <button type="button" class="pl-card cr-hub-card is-primary" id="cr-hub-play">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">🎾 Play</div>
            <span class="pl-meta-pill" style="color:var(--acc);border-color:var(--acc)">1 Set · Career</span>
          </div>
          <div class="pl-card-sub">Play Singles or Doubles against AI to earn Credits.</div>
        </button>

        <button type="button" class="pl-card cr-hub-card is-disabled" disabled>
          <div class="cr-hub-card-top">
            <div class="pl-card-title">🏆 Tournaments</div>
            <span class="cr-soon-pill">Coming soon</span>
          </div>
          <div class="pl-card-sub">Americano, Mexicano, Knockout & League ladder.</div>
        </button>

        <button type="button" class="pl-card cr-hub-card is-disabled" disabled>
          <div class="cr-hub-card-top">
            <div class="pl-card-title">💪 Training</div>
            <span class="cr-soon-pill">Coming soon</span>
          </div>
          <div class="pl-card-sub">Spend Credits to upgrade your 6 player attributes.</div>
        </button>

        <button type="button" class="pl-card cr-hub-card is-disabled" disabled>
          <div class="cr-hub-card-top">
            <div class="pl-card-title">🛒 Shop</div>
            <span class="cr-soon-pill">Coming soon</span>
          </div>
          <div class="pl-card-sub">Unlock pro rackets, shoes, kits & match balls.</div>
        </button>

        <button type="button" class="pl-card cr-hub-card is-disabled" disabled>
          <div class="cr-hub-card-top">
            <div class="pl-card-title">🎒 Locker</div>
            <span class="cr-soon-pill">Coming soon</span>
          </div>
          <div class="pl-card-sub">Equip your owned rackets, shoes, kit and ball.</div>
        </button>

        <button type="button" class="pl-card cr-hub-card is-disabled" disabled>
          <div class="cr-hub-card-top">
            <div class="pl-card-title">🌍 Ranking</div>
            <span class="cr-soon-pill">Coming soon</span>
          </div>
          <div class="pl-card-sub">World Padel Tour standings and tier milestones.</div>
        </button>

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-profile">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">👤 Profile</div>
            <span class="pl-meta-pill">Look & Save</span>
          </div>
          <div class="pl-card-sub">Edit appearance for free, export/import backup, or reset.</div>
        </button>

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-back">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">← Back to menu</div>
          </div>
          <div class="pl-card-sub">Exit Career and return to Quick Match menu.</div>
        </button>
      </div>
    </div>
  `;

  wireBannerButtons();
  careerPanel.querySelector('#cr-hub-play').onclick = () => { flashMsg = null; showScreen('play'); };
  careerPanel.querySelector('#cr-hub-profile').onclick = () => { flashMsg = null; showScreen('profile'); };
  careerPanel.querySelector('#cr-hub-back').onclick = () => closeCareer();
}

// 4. Career Play Screen
function renderPlayScreen() {
  if (!profile) { showScreen('templates'); return; }
  const pl = profile.player;
  const rk = equippedRacket(profile);
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), 'CAREER MATCH');

  const curVenue = venues[playState.venueIdx] || venues[0];
  const curPartner = characters[playState.partnerIdx] || characters[0];
  const mult = eco.mult[playState.ai] ?? 1;

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">CAREER · <span>PLAY MATCH</span></h2>
        <div class="cr-sub">Format: 1 Set (to 6 games) · Golden Point · Equipped: ${escapeHtml(rk.name)}</div>
      </div>
      <button type="button" class="cr-btn" id="cr-play-back">← Back to Hub</button>
    </div>

    <div class="cr-body">
      <div class="pl-section-label">MATCH MODE</div>
      <div class="pl-seg-row" id="cr-play-mode">
        <button type="button" class="pl-seg-btn ${playState.players === 4 ? 'is-selected' : ''}" data-players="4">Doubles (2v2)</button>
        <button type="button" class="pl-seg-btn ${playState.players === 2 ? 'is-selected' : ''}" data-players="2">Singles (1v1)</button>
      </div>

      <div class="pl-section-label">AI LEVEL & REWARD MULTIPLIER</div>
      <div class="pl-seg-row" id="cr-play-ai">
        ${AI_LEVELS.map(lv => `
          <button type="button" class="pl-seg-btn ${playState.ai === lv.id ? 'is-selected' : ''}" data-ai="${lv.id}">
            ${lv.label} ${lv.stars} (×${eco.mult[lv.id]})
          </button>
        `).join('')}
      </div>

      ${playState.players === 4 ? `
        <div class="pl-section-label">CHOOSE PARTNER (${countryFlag(curPartner.countryCode)} ${escapeHtml(curPartner.name)})</div>
        <div class="cr-partner-grid" id="cr-partner-grid">
          ${characters.map((c, idx) => `
            <button type="button" class="pl-card cr-partner-card ${idx === playState.partnerIdx ? 'is-selected' : ''}" data-pidx="${idx}">
              <span>${countryFlag(c.countryCode)}</span>
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c.name)}</span>
              <span class="pl-check">✓</span>
            </button>
          `).join('')}
        </div>
      ` : ''}

      <div class="pl-section-label">VENUE (${escapeHtml(curVenue.name)})</div>
      <div class="pl-venue-grid" id="cr-play-venues"></div>
    </div>

    <div class="cr-foot">
      <div class="cr-foot-row">
        <div class="pl-summary">
          ${playState.players === 2 ? 'Singles' : `Doubles (w/ ${curPartner.name})`} · AI: ${playState.ai.toUpperCase()} (×${mult}) · ${curVenue.name} · 1 Set · Golden Point
        </div>
        <button type="button" class="pl-start-btn" id="cr-play-start">START MATCH</button>
      </div>
    </div>
  `;

  wireBannerButtons();
  careerPanel.querySelector('#cr-play-back').onclick = () => showScreen('hub');

  careerPanel.querySelectorAll('#cr-play-mode [data-players]').forEach(btn => {
    btn.onclick = () => {
      playState.players = parseInt(btn.dataset.players, 10);
      renderPlayScreen();
    };
  });

  careerPanel.querySelectorAll('#cr-play-ai [data-ai]').forEach(btn => {
    btn.onclick = () => {
      playState.ai = btn.dataset.ai;
      renderPlayScreen();
    };
  });

  careerPanel.querySelectorAll('#cr-partner-grid [data-pidx]').forEach(btn => {
    btn.onclick = () => {
      playState.partnerIdx = parseInt(btn.dataset.pidx, 10);
      renderPlayScreen();
    };
  });

  const vGrid = careerPanel.querySelector('#cr-play-venues');
  venues.forEach((v, idx) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `pl-card pl-venue-card ${idx === playState.venueIdx ? 'is-selected' : ''}`;
    const tod = v.timeOfDay === 'sunset' ? 'Sunset' : v.timeOfDay === 'night' ? 'Night' : 'Day';
    const surfColor = v.surface.includes('blue') ? '#2f6fb5' : v.surface.includes('green') ? '#2e7d32' : '#c85a17';
    card.innerHTML = `
      <div class="pl-thumb-box pl-venue-box shimmer">
        <img class="pl-thumb-img" alt="${escapeHtml(v.name)}" />
      </div>
      <div class="pl-venue-body">
        <div class="pl-card-title" lang="en">${escapeHtml(v.name)}</div>
        <div class="pl-venue-loc">${countryFlag(v.countryCode)} ${escapeHtml(v.city)}</div>
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
      img.onload = () => box.classList.remove('shimmer');
    }, idx === playState.venueIdx);

    card.onclick = () => {
      playState.venueIdx = idx;
      renderPlayScreen();
    };
    vGrid.appendChild(card);
  });

  careerPanel.querySelector('#cr-play-start').onclick = () => launchCareerMatch();
}

async function launchCareerMatch() {
  if (!startMatchFn || !profile) return;
  const players = playState.players;
  const me = { ...profile.player, stats: { ...profile.stats } };
  const myRacket = equippedRacket(profile);
  const partner = characters[playState.partnerIdx] || characters[0];
  const oppPool = characters.filter(c => (players === 4 ? c !== partner : true)).slice().sort(() => Math.random() - 0.5);

  const roster = {};
  const rk = {};
  roster[0] = me;
  rk[0] = myRacket;

  if (players === 2) {
    roster[2] = oppPool[0] || characters[0];
    rk[2] = rackets[Math.floor(Math.random() * rackets.length)];
  } else {
    roster[1] = partner;
    rk[1] = rackets[Math.floor(Math.random() * rackets.length)];
    roster[2] = oppPool[0] || characters[0];
    rk[2] = rackets[Math.floor(Math.random() * rackets.length)];
    roster[3] = oppPool[1] || characters[1] || characters[0];
    rk[3] = rackets[Math.floor(Math.random() * rackets.length)];
  }

  const venue = venues[playState.venueIdx] || venues[0];
  const ai = playState.ai;

  await startMatchFn({
    players,
    humans: 1,
    ai,
    match: { sets: 1, superTiebreak: false, goldenPoint: true, starPoint: false },
    roster,
    rackets: rk,
    venue,
    onEnd(result) {
      const reward = matchReward(result, eco);
      const updated = applyReward(profile, reward, result);
      updated.lastReward = {
        lines: reward.lines,
        mult: reward.mult,
        credits: reward.credits,
        won: result.won,
        ai: result.ai || ai,
        score: result.score?.sets || '',
      };
      persistProfile(updated);
    },
  });
}

// 5. Reward Screen
function renderRewardScreen() {
  if (!profile || !profile.lastReward) {
    showScreen('hub');
    return;
  }
  const r = profile.lastReward;
  const pl = profile.player;
  const rk = equippedRacket(profile);
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), r.won ? 'VICTORY' : 'MATCH COMPLETE');

  const aiKey = r.ai || playState.ai || 'club';
  const aiName = aiKey.charAt(0).toUpperCase() + aiKey.slice(1);
  const multVal = r.mult ?? (eco.mult[aiKey] ?? 1);

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">MATCH <span>REWARDS</span></h2>
        <div class="cr-sub">Career match summary and Credits breakdown</div>
      </div>
    </div>

    <div class="cr-body">
      <div class="cr-reward-box">
        <div class="cr-reward-head">
          <div class="cr-reward-outcome ${r.won ? '' : 'is-loss'}">${r.won ? '🏆 WIN' : 'LOSS'}</div>
          <div class="cr-reward-score">Score: ${escapeHtml(r.score || '—')}</div>
        </div>

        <div class="cr-reward-lines">
          ${(r.lines || []).map(line => `
            <div class="cr-reward-row">
              <span>${escapeHtml(line.label)}</span>
              <b class="tabular">+${line.credits}</b>
            </div>
          `).join('')}
          <div class="cr-reward-row is-mult">
            <span>${escapeHtml(aiName)} ×${multVal}</span>
            <b class="tabular">×${multVal}</b>
          </div>
        </div>

        <div class="cr-reward-total">
          <span>Total Reward</span>
          <b class="tabular">+${r.credits} Credits</b>
        </div>

        <div class="cr-reward-balance">
          <span>New Balance</span>
          <b class="tabular">${profile.credits} Credits</b>
        </div>

        <button type="button" class="pl-start-btn" id="cr-reward-continue" style="width:100%;margin-top:4px">Continue</button>
      </div>
    </div>
  `;

  wireBannerButtons();
  const contBtn = careerPanel.querySelector('#cr-reward-continue');
  contBtn.onclick = () => {
    const { lastReward: _removed, ...clean } = profile;
    persistProfile(clean);
    showScreen('hub');
  };
  setTimeout(() => contBtn.focus(), 20);
}

// 6. Profile Screen
function renderProfileScreen() {
  if (!profile) { showScreen('templates'); return; }
  const pl = profile.player;
  const rk = equippedRacket(profile);
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), 'PLAYER PROFILE');
  const h = profile.history || { played: 0, won: 0, pointsWon: 0 };

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">CAREER · <span>PROFILE</span></h2>
        <div class="cr-sub">Manage appearance, backup save file, or reset career</div>
      </div>
      <button type="button" class="cr-btn" id="cr-prof-back">← Back to Hub</button>
    </div>

    <div class="cr-body">
      <div class="cr-profile-banner">
        <div class="cr-prof-id">
          <span class="cr-prof-flag">${countryFlag(pl.countryCode)}</span>
          <div>
            <div class="cr-prof-name" lang="en">${escapeHtml(pl.name)}</div>
            <div class="cr-prof-rank">${escapeHtml(pl.country || '')} · ${pl.hand === 'left' ? 'Left-handed' : 'Right-handed'} · World rank: —</div>
          </div>
        </div>
        <div class="cr-currencies">
          <div class="cr-curr-box">
            <span class="cr-curr-label">Credits</span>
            <span class="cr-curr-val tabular">${profile.credits}</span>
          </div>
          <div class="cr-curr-box is-rp">
            <span class="cr-curr-label">Ranking points</span>
            <span class="cr-curr-val tabular">${profile.rankingPoints}</span>
          </div>
        </div>
      </div>

      <div class="cr-form-grid">
        <div class="cr-field">
          <div class="cr-field-head"><span>Matches Played</span><b>${h.played}</b></div>
          <div class="cr-field-head"><span>Matches Won</span><b>${h.won}</b></div>
          <div class="cr-field-head"><span>Total Points Won</span><b>${h.pointsWon}</b></div>
        </div>

        <div class="cr-field">
          <div class="cr-field-head"><span>Appearance</span><b>Free</b></div>
          <div class="pl-card-sub">Customize hair, beard, skin tone, body, glasses and headwear anytime.</div>
          <button type="button" class="cr-btn cr-btn-acc" id="cr-prof-edit" style="margin-top:4px">Edit look</button>
        </div>

        <div class="cr-field is-full">
          <div class="cr-field-head"><span>Backup & Transfer Save</span><b>padel-career.json</b></div>
          <div class="pl-card-sub">Export your career to a JSON file or restore a previously exported profile.</div>
          <div class="cr-banner-actions" style="margin-top:4px">
            <button type="button" class="cr-btn" id="cr-prof-export">Export</button>
            <button type="button" class="cr-btn" id="cr-prof-import">Import</button>
          </div>
        </div>

        <div class="cr-field is-full">
          <div class="cr-field-head"><span>Danger Zone</span></div>
          ${!deleteConfirmOpen ? `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
              <span class="pl-card-sub">Permanently delete this profile from this browser and start fresh.</span>
              <button type="button" class="cr-btn cr-btn-danger" id="cr-prof-delete">Delete profile</button>
            </div>
          ` : `
            <div class="cr-delete-box">
              <span>Are you sure you want to permanently delete <b>${escapeHtml(pl.name)}</b>?</span>
              <div class="cr-banner-actions">
                <button type="button" class="cr-btn cr-btn-danger" id="cr-prof-delete-confirm">Confirm delete</button>
                <button type="button" class="cr-btn" id="cr-prof-delete-cancel">Cancel</button>
              </div>
            </div>
          `}
        </div>
      </div>
    </div>

    <div class="cr-foot">
      <div class="cr-storage-note">${STORAGE_NOTICE}</div>
    </div>
  `;

  wireBannerButtons();
  careerPanel.querySelector('#cr-prof-back').onclick = () => { flashMsg = null; showScreen('hub'); };
  careerPanel.querySelector('#cr-prof-edit').onclick = () => {
    flashMsg = null;
    creatorMode = 'edit';
    creatorTemplate = profile.player;
    initCreatorStateFrom(profile.player);
    showScreen('creator');
  };
  careerPanel.querySelector('#cr-prof-export').onclick = () => {
    const json = exportProfile(profile);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'padel-career.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  careerPanel.querySelector('#cr-prof-import').onclick = () => triggerImportFilePicker();

  const delBtn = careerPanel.querySelector('#cr-prof-delete');
  if (delBtn) {
    delBtn.onclick = () => {
      deleteConfirmOpen = true;
      renderProfileScreen();
    };
  }
  const delConfirm = careerPanel.querySelector('#cr-prof-delete-confirm');
  if (delConfirm) {
    delConfirm.onclick = () => {
      try { localStorage.removeItem(PROFILE_KEY); } catch {}
      try { getStore().removeItem?.(PROFILE_KEY); } catch {}
      profile = null;
      memProfile = null;
      deleteConfirmOpen = false;
      flashMsg = null;
      showScreen('templates');
    };
  }
  const delCancel = careerPanel.querySelector('#cr-prof-delete-cancel');
  if (delCancel) {
    delCancel.onclick = () => {
      deleteConfirmOpen = false;
      renderProfileScreen();
    };
  }
}

// Navigation: Back action & focus movement (Keyboard + Xbox Controller)
function goBack() {
  if (!isOpen) return;
  if (curScreen === 'reward') {
    const btn = careerPanel?.querySelector('#cr-reward-continue');
    if (btn) btn.click();
    return;
  }
  if (curScreen === 'play' || curScreen === 'profile') {
    flashMsg = null;
    showScreen('hub');
    return;
  }
  if (curScreen === 'creator') {
    showScreen(creatorMode === 'edit' ? 'profile' : 'templates');
    return;
  }
  closeCareer();
}

function moveCareerFocus(dx, dy) {
  if (!careerPanel || careerPanel.hidden) return;
  const focusables = Array.from(careerPanel.querySelectorAll('button, input:not([type="file"]), select'))
    .filter(el => el.offsetParent != null && !el.disabled);
  if (!focusables.length) return;
  const active = document.activeElement;
  const idx = focusables.indexOf(active);
  if (idx < 0) {
    focusables[0].focus();
    return;
  }
  // Allow range sliders to adjust with left/right
  if (active?.tagName === 'INPUT' && active.type === 'range' && dx !== 0 && dy === 0) {
    const step = parseFloat(active.step) || 0.01;
    const min = parseFloat(active.min) || 0;
    const max = parseFloat(active.max) || 1;
    const next = Math.max(min, Math.min(max, parseFloat(active.value) + dx * step));
    active.value = String(next);
    active.dispatchEvent(new Event('input'));
    return;
  }
  const cols = curScreen === 'templates' ? 4 : curScreen === 'hub' ? 2 : 2;
  let nextIdx = idx + (dx !== 0 ? dx : dy * cols);
  nextIdx = Math.max(0, Math.min(focusables.length - 1, nextIdx));
  focusables[nextIdx]?.focus();
}

let padPrevA = false, padPrevB = false, padPrevX = 0, padPrevY = 0;
function handleCareerGamepad(pad) {
  if (!isOpen || !pad) return;
  const a = !!pad.buttons[0]?.pressed;
  const b = !!pad.buttons[1]?.pressed;
  const sx = pad.axes[0] || (pad.buttons[15]?.pressed ? 1 : pad.buttons[14]?.pressed ? -1 : 0);
  const sy = pad.axes[1] || (pad.buttons[13]?.pressed ? 1 : pad.buttons[12]?.pressed ? -1 : 0);

  if (Math.abs(sx) > 0.6 && Math.abs(padPrevX) <= 0.6) moveCareerFocus(Math.sign(sx), 0);
  if (Math.abs(sy) > 0.6 && Math.abs(padPrevY) <= 0.6) moveCareerFocus(0, Math.sign(sy));
  if (a && !padPrevA) {
    const el = document.activeElement;
    if (el && careerPanel?.contains(el) && el.click) el.click();
    else moveCareerFocus(0, 0);
  }
  if (b && !padPrevB) goBack();

  padPrevA = a;
  padPrevB = b;
  padPrevX = sx;
  padPrevY = sy;
}

export function openCareer() {
  const menuEl = document.getElementById('menu');
  const shell = menuEl?.querySelector('.pl-shell');
  if (!shell || !careerPanel) return;

  isOpen = true;
  const qmRight = shell.querySelector('.pl-right-panel:not(.pl-career-panel)');
  const qmBottom = shell.querySelector('.pl-bottom-bar');
  const topBtn = shell.querySelector('#pl-career-btn');
  if (qmRight) qmRight.hidden = true;
  if (qmBottom) qmBottom.hidden = true;
  if (topBtn) topBtn.classList.add('is-active');
  careerPanel.hidden = false;

  padPrevA = true;
  padPrevB = true;
  setCareerGamepadHandler(handleCareerGamepad);

  flashMsg = null;
  const status = syncProfileFromStorage();
  if (status === 'ok' && profile) {
    showScreen(profile.lastReward ? 'reward' : 'hub');
  } else if (status === 'unavailable' && profile) {
    showScreen(profile.lastReward ? 'reward' : 'hub');
  } else {
    showScreen('templates');
  }
}

export function closeCareer() {
  const menuEl = document.getElementById('menu');
  const shell = menuEl?.querySelector('.pl-shell');
  if (!shell || !careerPanel) return;

  isOpen = false;
  if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
  careerPanel.hidden = true;

  const qmRight = shell.querySelector('.pl-right-panel:not(.pl-career-panel)');
  const qmBottom = shell.querySelector('.pl-bottom-bar');
  const topBtn = shell.querySelector('#pl-career-btn');
  if (qmRight) qmRight.hidden = false;
  if (qmBottom) qmBottom.hidden = false;
  if (topBtn) topBtn.classList.remove('is-active');

  setCareerGamepadHandler(null);
  if (location.hash === '#career') {
    history.replaceState(null, '', location.pathname + location.search);
  }
  restoreQuickMatchPreview();
}

export function initCareer({ startMatch }) {
  startMatchFn = startMatch;
  const menuEl = document.getElementById('menu');
  const shell = menuEl?.querySelector('.pl-shell');
  const mainEl = shell?.querySelector('.pl-main');
  if (!mainEl) return;

  const prev = mainEl.querySelector('#pl-career-panel');
  if (prev) prev.remove();

  careerPanel = document.createElement('section');
  careerPanel.id = 'pl-career-panel';
  careerPanel.className = 'pl-right-panel pl-career-panel';
  careerPanel.hidden = true;
  mainEl.appendChild(careerPanel);

  if (!fileInputEl) {
    fileInputEl = document.createElement('input');
    fileInputEl.type = 'file';
    fileInputEl.accept = '.json,application/json';
    fileInputEl.hidden = true;
    fileInputEl.onchange = () => {
      const f = fileInputEl.files?.[0];
      if (f) handleImportFile(f);
    };
    document.body.appendChild(fileInputEl);
  }

  const topBtn = shell.querySelector('#pl-career-btn');
  if (topBtn) {
    topBtn.onclick = () => {
      if (isOpen) showScreen(profile ? 'hub' : 'templates');
      else openCareer();
    };
  }

  window.addEventListener('keydown', (e) => {
    if (!isOpen || menuEl.hidden) return;
    const tag = document.activeElement?.tagName;
    const isText = tag === 'INPUT' && document.activeElement.type === 'text';
    if (e.key === 'Escape') {
      e.preventDefault();
      goBack();
    } else if (e.key === 'ArrowRight' && !isText) {
      e.preventDefault();
      moveCareerFocus(1, 0);
    } else if (e.key === 'ArrowLeft' && !isText) {
      e.preventDefault();
      moveCareerFocus(-1, 0);
    } else if (e.key === 'ArrowDown' && tag !== 'SELECT') {
      e.preventDefault();
      moveCareerFocus(0, 1);
    } else if (e.key === 'ArrowUp' && tag !== 'SELECT') {
      e.preventDefault();
      moveCareerFocus(0, -1);
    }
  });

  window.addEventListener('hashchange', () => {
    if (location.hash === '#career' && !isOpen) openCareer();
  });

  if (location.hash === '#career') {
    openCareer();
  }
}
