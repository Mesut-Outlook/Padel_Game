// Career mode UI screens: Template picker, Character Creator, Career Hub, Career Play, Training, Shop, Locker, Match Reward, Profile.
// Reuses the menu's single 3D preview canvas (Intel HD 620 friendly) and routes all storage through src/career.js.
import characters from '../data/characters.json';
import venues from '../data/venues.json';
import rackets from '../data/rackets.json';
import eco from '../data/economy.json';
import shop from '../data/shop.json';
import {
  PROFILE_KEY,
  newProfile,
  loadProfile,
  saveProfile,
  exportProfile,
  importProfile,
  matchReward,
  applyReward,
  trainCost,
  buyTraining,
  tierOf,
  buyItem,
  equip,
} from './career.js';
import {
  countryFlag,
  setCareerPreview,
  restoreQuickMatchPreview,
  setCareerGamepadHandler,
} from './menu.js';
import { getPortraitThumb, getVenueThumb, getRacketThumb } from './thumbs.js';

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

const TRAINING_STATS = [
  { key: 'speed', label: 'Speed', desc: 'Speed: court movement and sprint pace across the turf.' },
  { key: 'power', label: 'Power', desc: 'Power: ball speed on groundstrokes and serves.' },
  { key: 'control', label: 'Control', desc: 'Control: shot placement accuracy toward your target.' },
  { key: 'volley', label: 'Volley', desc: 'Volley: accuracy on balls taken before the bounce.' },
  { key: 'smash', label: 'Smash', desc: 'Smash: speed and accuracy on smashes, bandejas and víboras.' },
  { key: 'stamina', label: 'Stamina', desc: 'Stamina: reduces accuracy loss during long rallies (8+ shots).' },
];

const SHOP_TABS = [
  { id: 'racket', label: 'Rackets' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'ball', label: 'Balls' },
  { id: 'kit', label: 'Kit' },
  { id: 'headwear', label: 'Headwear' },
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
let curScreen = 'hub'; // 'templates' | 'creator' | 'hub' | 'play' | 'training' | 'shop' | 'locker' | 'reward' | 'profile'

let profile = null;
let memProfile = null;
let storageBlocked = false;
let corruptState = false;
let flashMsg = null; // { type: 'error'|'ok', text: string }
let deleteConfirmOpen = false;
let templateFilter = 'all';
let shopTab = 'racket';
let shopErrors = {}; // { [itemId]: string }

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

function capitalize(s) {
  const str = String(s || '');
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function equippedRacket(p = profile) {
  const id = p?.equipped?.racket || 'r01';
  return rackets.find(r => r.id === id) || rackets[0];
}

function equippedShoes(p = profile) {
  const id = p?.equipped?.shoes || 'shoe_starter';
  return shop.items.find(i => i.type === 'shoes' && i.id === id) || shop.items.find(i => i.id === 'shoe_starter');
}

function equippedBall(p = profile) {
  const id = p?.equipped?.ball || 'ball_standard';
  return shop.items.find(i => i.type === 'ball' && i.id === id) || shop.items.find(i => i.id === 'ball_standard');
}

function equippedKit(p = profile) {
  const id = p?.equipped?.kit || 'kit_starter';
  return shop.items.find(i => i.type === 'kit' && i.id === id) || shop.items.find(i => i.id === 'kit_starter');
}

function equippedHeadwearItem(p = profile) {
  const id = p?.equipped?.headwear;
  if (!id) return null;
  return shop.items.find(i => i.type === 'headwear' && i.id === id) || null;
}

function buildEquippedPlayer(p = profile) {
  if (!p) return null;
  const kit = equippedKit(p);
  const shoeItem = equippedShoes(p);
  const hwItem = equippedHeadwearItem(p);
  return {
    ...p.player,
    stats: { ...p.stats },
    outfit: {
      shirt: kit ? kit.shirt : (p.player.outfit?.shirt || '#FFFFFF'),
      shorts: kit ? kit.shorts : (p.player.outfit?.shorts || '#1D3557'),
      shoes: shoeItem ? shoeItem.color : (kit?.shoes || p.player.outfit?.shoes || '#1B1B1E'),
    },
    headwear: hwItem ? hwItem.headwear : p.player.headwear,
  };
}

function renderTopCreditsHtml(p = profile) {
  if (!p) return '';
  const curTier = capitalize(tierOf(p.rankingPoints, shop));
  return `
    <div class="cr-top-currencies" aria-label="Player currencies">
      <div class="cr-top-curr"><span>Credits</span><b class="tabular">${p.credits}</b></div>
      <div class="cr-top-curr is-rp"><span>Ranking pts</span><b class="tabular">${p.rankingPoints}</b></div>
      <div class="cr-top-curr is-tier"><span>Tier</span><b>${escapeHtml(curTier)}</b></div>
    </div>
  `;
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
  if (screen !== 'shop') shopErrors = {};
  renderCurrentScreen();
}

function renderCurrentScreen() {
  if (!careerPanel) return;
  if (curScreen === 'templates') renderTemplatesScreen();
  else if (curScreen === 'creator') renderCreatorScreen();
  else if (curScreen === 'reward') renderRewardScreen();
  else if (curScreen === 'play') renderPlayScreen();
  else if (curScreen === 'training') renderTrainingScreen();
  else if (curScreen === 'shop') renderShopScreen();
  else if (curScreen === 'locker') renderLockerScreen();
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

  const pl = buildEquippedPlayer(profile);
  const rk = equippedRacket(profile);
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), 'CAREER HUB');

  const h = profile.history || { played: 0, won: 0, pointsWon: 0 };
  const curTier = capitalize(tierOf(profile.rankingPoints, shop));

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-profile-banner">
      <div class="cr-prof-id">
        <span class="cr-prof-flag">${countryFlag(pl.countryCode)}</span>
        <div>
          <div class="cr-prof-name" lang="en">${escapeHtml(pl.name)}</div>
          <div class="cr-prof-rank">World rank: — · Tier: ${escapeHtml(curTier)} · Record: ${h.won}W – ${Math.max(0, h.played - h.won)}L (${h.played} played)</div>
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

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-training">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">💪 Training</div>
            <span class="pl-meta-pill">6 Stats · Max 10</span>
          </div>
          <div class="pl-card-sub">Spend Credits to upgrade your 6 player attributes.</div>
        </button>

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-shop">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">🛒 Shop</div>
            <span class="pl-meta-pill">${escapeHtml(curTier)} Tier</span>
          </div>
          <div class="pl-card-sub">Unlock pro rackets, shoes, kits, headwear & match balls.</div>
        </button>

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-locker">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">🎒 Locker</div>
            <span class="pl-meta-pill">${profile.inventory.length} Owned</span>
          </div>
          <div class="pl-card-sub">Equip your owned rackets, shoes, kit, headwear and ball.</div>
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
  careerPanel.querySelector('#cr-hub-training').onclick = () => { flashMsg = null; showScreen('training'); };
  careerPanel.querySelector('#cr-hub-shop').onclick = () => { flashMsg = null; shopErrors = {}; showScreen('shop'); };
  careerPanel.querySelector('#cr-hub-locker').onclick = () => { flashMsg = null; showScreen('locker'); };
  careerPanel.querySelector('#cr-hub-profile').onclick = () => { flashMsg = null; showScreen('profile'); };
  careerPanel.querySelector('#cr-hub-back').onclick = () => closeCareer();
}

// 4. Career Play Screen
function renderPlayScreen() {
  if (!profile) { showScreen('templates'); return; }
  const pl = buildEquippedPlayer(profile);
  const rk = equippedRacket(profile);
  const shoeItem = equippedShoes(profile);
  const ballItem = equippedBall(profile);
  const kitItem = equippedKit(profile);
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), 'CAREER MATCH');

  const curVenue = venues[playState.venueIdx] || venues[0];
  const curPartner = characters[playState.partnerIdx] || characters[0];
  const mult = eco.mult[playState.ai] ?? 1;

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">CAREER · <span>PLAY MATCH</span></h2>
        <div class="cr-sub">Format: 1 Set (to 6 games) · Golden Point · Equipped: ${escapeHtml(rk.name)} · ${escapeHtml(shoeItem.name)} · ${escapeHtml(ballItem.name)} · ${escapeHtml(kitItem.name)}</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-play-locker">🎒 Locker</button>
        <button type="button" class="cr-btn" id="cr-play-back">← Back to Hub</button>
      </div>
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
  careerPanel.querySelector('#cr-play-locker').onclick = () => showScreen('locker');

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
  const myRacket = rackets.find(r => r.id === profile.equipped?.racket) || rackets[0];
  const kit = equippedKit(profile);
  const shoeItem = equippedShoes(profile);
  const ballItem = equippedBall(profile);
  const hwItem = equippedHeadwearItem(profile);

  const me = {
    ...profile.player,
    stats: { ...profile.stats },
    outfit: {
      shirt: kit.shirt,
      shorts: kit.shorts,
      shoes: shoeItem.color,
    },
    headwear: hwItem ? hwItem.headwear : profile.player.headwear,
  };

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
    shoes: { 0: { speed: shoeItem.speed, agility: shoeItem.agility } },
    ball: { speed: ballItem.speed, bounce: ballItem.bounce },
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

// 5. Training Screen
function renderTrainingScreen() {
  if (!profile) { showScreen('templates'); return; }
  const pl = buildEquippedPlayer(profile);
  const rk = equippedRacket(profile);
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), 'TRAINING');

  const maxLevel = eco.training.max;

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">CAREER · <span>TRAINING</span></h2>
        <div class="cr-sub">Upgrade your 6 player attributes with Credits. Each level raises on-court performance.</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-train-back">← Back to Hub</button>
      </div>
    </div>

    <div class="cr-body">
      <div class="cr-train-list" id="cr-train-list">
        ${TRAINING_STATS.map(st => {
          const level = profile.stats[st.key] ?? 4;
          const isMax = level >= maxLevel;
          const cost = isMax ? 0 : trainCost(level, eco);
          const deficit = Math.max(0, cost - profile.credits);
          const canBuy = !isMax && deficit === 0;
          const pct = Math.min(100, (level / maxLevel) * 100);
          const reasonText = isMax ? 'Maxed' : deficit > 0 ? `Need ${deficit} more Credits` : '';

          return `
            <div class="cr-train-card" data-stat-card="${st.key}">
              <div class="cr-train-top">
                <div class="cr-train-title-group">
                  <span class="cr-train-name">${escapeHtml(st.label)}</span>
                  <span class="cr-train-lvl tabular">${level}/${maxLevel}</span>
                </div>
                <div class="cr-train-actions">
                  <span class="cr-train-cost tabular">${isMax ? 'Maxed' : `Next: ${cost} Credits`}</span>
                  ${reasonText ? `<span class="cr-train-reason">${escapeHtml(reasonText)}</span>` : ''}
                  <button type="button" class="cr-btn cr-btn-acc cr-train-buy" data-train="${st.key}" ${canBuy ? '' : 'disabled'}>Buy</button>
                </div>
              </div>
              <div class="pl-stat-track cr-train-track">
                <div class="pl-stat-fill" style="width:${pct}%"></div>
              </div>
              <div class="cr-train-desc">${escapeHtml(st.desc)}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  wireBannerButtons();
  careerPanel.querySelector('#cr-train-back').onclick = () => {
    flashMsg = null;
    showScreen('hub');
  };

  careerPanel.querySelectorAll('[data-train]').forEach(btn => {
    btn.onclick = () => {
      const statKey = btn.dataset.train;
      const st = TRAINING_STATS.find(x => x.key === statKey);
      const res = buyTraining(profile, statKey, eco);
      if (res.ok) {
        persistProfile(res.profile);
        flashMsg = { type: 'ok', text: `${st ? st.label : statKey} upgraded to ${res.profile.stats[statKey]}/${maxLevel}!` };
        renderTrainingScreen();
      } else {
        const level = profile.stats[statKey] ?? 4;
        const cost = level >= maxLevel ? 0 : trainCost(level, eco);
        const msg = res.reason === 'max'
          ? 'Maxed'
          : res.reason === 'credits'
          ? `Need ${Math.max(1, cost - profile.credits)} more Credits`
          : 'Cannot train this stat.';
        flashMsg = { type: 'error', text: msg };
        renderTrainingScreen();
      }
    };
  });
}

// 6. Shop Screen
function renderShopItemSpecHtml(item, tabId) {
  if (tabId === 'racket') {
    return `
      <div class="cr-shop-spec">${escapeHtml(item.core)} · ${escapeHtml(item.face)} · ${escapeHtml(item.shape)} · ${item.weightG} g</div>
      <div class="pl-racket-stats">
        <div class="pl-rstat"><span>Power</span><div class="pl-bar"><i style="width:${item.stats.power * 10}%"></i></div><b>${item.stats.power}</b></div>
        <div class="pl-rstat"><span>Control</span><div class="pl-bar"><i style="width:${item.stats.control * 10}%"></i></div><b>${item.stats.control}</b></div>
        <div class="pl-rstat"><span>Spin</span><div class="pl-bar"><i style="width:${item.stats.spin * 10}%"></i></div><b>${item.stats.spin}</b></div>
        <div class="pl-rstat"><span>Sweet Spot</span><div class="pl-bar"><i style="width:${item.stats.sweetSpot * 10}%"></i></div><b>${item.stats.sweetSpot}</b></div>
      </div>
    `;
  }
  if (tabId === 'shoes') {
    const spdPct = Math.round((item.speed || 0) * 100);
    const agiVal = Math.round((item.agility || 0) * 100);
    return `
      <div class="cr-kit-swatches">
        <span class="cr-kit-chip"><i style="background:${item.color}"></i>Shoe color</span>
      </div>
      <div class="cr-shop-spec">+${spdPct}% speed · agility ${agiVal}</div>
    `;
  }
  if (tabId === 'ball') {
    return `
      <div class="cr-kit-swatches">
        <span class="cr-kit-chip"><i style="background:#d8f53a"></i>Match ball</span>
      </div>
      <div class="cr-shop-spec">Speed ×${item.speed} · Bounce ×${item.bounce}</div>
    `;
  }
  if (tabId === 'kit') {
    return `
      <div class="cr-kit-swatches">
        <span class="cr-kit-chip"><i style="background:${item.shirt}"></i>Shirt</span>
        <span class="cr-kit-chip"><i style="background:${item.shorts}"></i>Shorts</span>
        <span class="cr-kit-chip"><i style="background:${item.shoes}"></i>Shoes</span>
      </div>
    `;
  }
  if (tabId === 'headwear') {
    const hw = item.headwear || { type: 'headband', color: '#ffffff' };
    return `
      <div class="cr-kit-swatches">
        <span class="cr-kit-chip"><i style="background:${hw.color}"></i>${hw.type === 'visor' ? 'Visor' : 'Headband'}</span>
      </div>
      <div class="cr-shop-spec">${hw.type === 'visor' ? 'Sun Visor' : 'Sweat Headband'} · ${escapeHtml(hw.color)}</div>
    `;
  }
  return '';
}

function renderShopScreen() {
  if (!profile) { showScreen('templates'); return; }
  const pl = buildEquippedPlayer(profile);
  const rk = equippedRacket(profile);
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), 'PRO SHOP');

  const items = shopTab === 'racket'
    ? rackets
    : shop.items.filter(it => it.type === shopTab);

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">CAREER · <span>SHOP</span></h2>
        <div class="cr-sub">Unlock pro rackets, court shoes, match balls, kits and headwear.</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-shop-locker">🎒 Locker</button>
        <button type="button" class="cr-btn" id="cr-shop-back">← Back to Hub</button>
      </div>
    </div>

    <div class="pl-tabs cr-shop-tabs" id="cr-shop-tabs" role="tablist">
      ${SHOP_TABS.map(t => `
        <button type="button" class="pl-tab ${shopTab === t.id ? 'is-active' : ''}" data-shop-tab="${t.id}">
          ${escapeHtml(t.label)}
        </button>
      `).join('')}
    </div>

    <div class="cr-body">
      <div class="cr-shop-grid" id="cr-shop-grid"></div>
    </div>
  `;

  wireBannerButtons();
  careerPanel.querySelector('#cr-shop-back').onclick = () => {
    flashMsg = null;
    shopErrors = {};
    showScreen('hub');
  };
  careerPanel.querySelector('#cr-shop-locker').onclick = () => {
    flashMsg = null;
    shopErrors = {};
    showScreen('locker');
  };

  careerPanel.querySelectorAll('#cr-shop-tabs [data-shop-tab]').forEach(btn => {
    btn.onclick = () => {
      shopTab = btn.dataset.shopTab;
      shopErrors = {};
      flashMsg = null;
      renderShopScreen();
    };
  });

  const grid = careerPanel.querySelector('#cr-shop-grid');
  items.forEach((item, idx) => {
    const isOwned = profile.inventory.includes(item.id);
    const isEquipped = profile.equipped?.[shopTab] === item.id;
    const minRp = shop.tiers[item.tier] ?? 0;
    const tierName = capitalize(item.tier);
    const isTierLocked = profile.rankingPoints < minRp;
    const canAfford = profile.credits >= item.price;
    const errText = shopErrors[item.id] || '';

    const card = document.createElement('div');
    card.className = `pl-card cr-shop-card ${isEquipped ? 'is-selected' : ''} ${isTierLocked && !isOwned ? 'is-locked' : ''}`;
    card.dataset.shopItem = item.id;

    const thumbHtml = shopTab === 'racket'
      ? `<div class="pl-thumb-box pl-racket-box shimmer"><img class="pl-thumb-img" alt="${escapeHtml(item.name)}" /></div>`
      : '';

    card.innerHTML = `
      <div class="cr-shop-card-top">
        ${thumbHtml}
        <div class="cr-shop-card-head">
          <div class="cr-shop-title-row">
            <div class="pl-card-title" lang="en">${escapeHtml(item.name)}</div>
            <div class="cr-badges">
              ${isOwned ? '<span class="cr-badge is-owned">Owned</span>' : ''}
              ${isEquipped ? '<span class="cr-badge is-equipped">Equipped</span>' : ''}
            </div>
          </div>
          <div class="cr-shop-meta-row">
            <span class="cr-shop-price tabular">${item.price} Credits</span>
            <span class="cr-tier-pill ${isTierLocked ? 'is-locked' : ''}">
              ${minRp > 0 ? `Unlocks at ${escapeHtml(tierName)} — ${minRp} ranking pts` : 'Amateur — 0 ranking pts'}
            </span>
          </div>
        </div>
      </div>

      ${renderShopItemSpecHtml(item, shopTab)}

      ${errText ? `<div class="cr-card-error" role="alert">${escapeHtml(errText)}</div>` : ''}

      <div class="cr-shop-foot">
        <button type="button" class="cr-btn ${!isOwned && !isTierLocked && canAfford ? 'cr-btn-acc' : 'cr-btn-muted'} cr-shop-buy" data-buy="${item.id}">
          Buy
        </button>
        ${isOwned && !isEquipped ? `<button type="button" class="cr-btn cr-shop-equip" data-equip-shop="${item.id}">Equip</button>` : ''}
      </div>
    `;

    if (shopTab === 'racket') {
      const box = card.querySelector('.pl-thumb-box');
      const img = card.querySelector('.pl-thumb-img');
      getRacketThumb(item, (url) => {
        img.src = url;
        img.onload = () => box.classList.remove('shimmer');
      }, idx < 6);
    }

    const buyBtn = card.querySelector('[data-buy]');
    buyBtn.onclick = () => {
      const res = buyItem(profile, item, shop);
      if (res.ok) {
        delete shopErrors[item.id];
        persistProfile(res.profile);
        flashMsg = { type: 'ok', text: `Purchased ${item.name}!` };
        renderShopScreen();
      } else {
        let msg = 'Cannot purchase item.';
        if (res.reason === 'owned') {
          msg = 'Already owned (owned)';
        } else if (res.reason === 'tier') {
          msg = `Locked (tier): Unlocks at ${tierName} — ${minRp} ranking pts`;
        } else if (res.reason === 'credits') {
          msg = `Not enough Credits (credits): Need ${Math.max(1, item.price - profile.credits)} more Credits`;
        }
        shopErrors[item.id] = msg;
        renderShopScreen();
      }
    };

    const eqBtn = card.querySelector('[data-equip-shop]');
    if (eqBtn) {
      eqBtn.onclick = () => {
        const next = equip(profile, shopTab, item.id);
        persistProfile(next);
        flashMsg = { type: 'ok', text: `Equipped ${item.name}.` };
        renderShopScreen();
      };
    }

    grid.appendChild(card);
  });
}

// 7. Locker Screen
function renderLockerScreen() {
  if (!profile) { showScreen('templates'); return; }
  const pl = buildEquippedPlayer(profile);
  const rk = equippedRacket(profile);
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), 'LOCKER');

  const ownedRackets = rackets.filter(r => profile.inventory.includes(r.id));
  const ownedShoes = shop.items.filter(i => i.type === 'shoes' && profile.inventory.includes(i.id));
  const ownedBalls = shop.items.filter(i => i.type === 'ball' && profile.inventory.includes(i.id));
  const ownedKits = shop.items.filter(i => i.type === 'kit' && profile.inventory.includes(i.id));
  const ownedHeadwear = shop.items.filter(i => i.type === 'headwear' && profile.inventory.includes(i.id));

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">CAREER · <span>LOCKER</span></h2>
        <div class="cr-sub">Select from your owned equipment per slot. The 3D preview updates immediately.</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-locker-shop">🛒 Shop</button>
        <button type="button" class="cr-btn" id="cr-locker-back">← Back to Hub</button>
      </div>
    </div>

    <div class="cr-body">
      <div class="pl-section-label">RACKET (${ownedRackets.length} OWNED)</div>
      <div class="cr-locker-grid" id="cr-locker-racket">
        ${ownedRackets.map(r => {
          const isEq = profile.equipped?.racket === r.id;
          return `
            <button type="button" class="pl-card cr-locker-card ${isEq ? 'is-selected' : ''}" data-slot="racket" data-id="${r.id}">
              <div class="cr-locker-card-head">
                <span class="cr-swatch-dot" style="background:${r.color}"></span>
                <div class="pl-card-title" lang="en">${escapeHtml(r.name)}</div>
                ${isEq ? '<span class="cr-badge is-equipped">Equipped</span>' : '<span class="cr-badge is-owned">Owned</span>'}
              </div>
              <div class="cr-shop-spec">${escapeHtml(r.core)} · ${escapeHtml(r.face)} · ${escapeHtml(r.shape)} · ${r.weightG} g</div>
              <div class="pl-card-sub">P${r.stats.power} · C${r.stats.control} · Spin ${r.stats.spin} · Sweet ${r.stats.sweetSpot}</div>
              <span class="pl-check">✓</span>
            </button>
          `;
        }).join('')}
      </div>

      <div class="pl-section-label">SHOES (${ownedShoes.length} OWNED)</div>
      <div class="cr-locker-grid" id="cr-locker-shoes">
        ${ownedShoes.map(s => {
          const isEq = profile.equipped?.shoes === s.id;
          return `
            <button type="button" class="pl-card cr-locker-card ${isEq ? 'is-selected' : ''}" data-slot="shoes" data-id="${s.id}">
              <div class="cr-locker-card-head">
                <span class="cr-swatch-dot" style="background:${s.color}"></span>
                <div class="pl-card-title" lang="en">${escapeHtml(s.name)}</div>
                ${isEq ? '<span class="cr-badge is-equipped">Equipped</span>' : '<span class="cr-badge is-owned">Owned</span>'}
              </div>
              <div class="cr-shop-spec">+${Math.round(s.speed * 100)}% speed · agility ${Math.round(s.agility * 100)}</div>
              <span class="pl-check">✓</span>
            </button>
          `;
        }).join('')}
      </div>

      <div class="pl-section-label">MATCH BALL (${ownedBalls.length} OWNED)</div>
      <div class="cr-locker-grid" id="cr-locker-ball">
        ${ownedBalls.map(b => {
          const isEq = profile.equipped?.ball === b.id;
          return `
            <button type="button" class="pl-card cr-locker-card ${isEq ? 'is-selected' : ''}" data-slot="ball" data-id="${b.id}">
              <div class="cr-locker-card-head">
                <span class="cr-swatch-dot" style="background:#d8f53a"></span>
                <div class="pl-card-title" lang="en">${escapeHtml(b.name)}</div>
                ${isEq ? '<span class="cr-badge is-equipped">Equipped</span>' : '<span class="cr-badge is-owned">Owned</span>'}
              </div>
              <div class="cr-shop-spec">Speed ×${b.speed} · Bounce ×${b.bounce}</div>
              <span class="pl-check">✓</span>
            </button>
          `;
        }).join('')}
      </div>

      <div class="pl-section-label">KIT (${ownedKits.length} OWNED)</div>
      <div class="cr-locker-grid" id="cr-locker-kit">
        ${ownedKits.map(k => {
          const isEq = profile.equipped?.kit === k.id;
          return `
            <button type="button" class="pl-card cr-locker-card ${isEq ? 'is-selected' : ''}" data-slot="kit" data-id="${k.id}">
              <div class="cr-locker-card-head">
                <div class="pl-card-title" lang="en">${escapeHtml(k.name)}</div>
                ${isEq ? '<span class="cr-badge is-equipped">Equipped</span>' : '<span class="cr-badge is-owned">Owned</span>'}
              </div>
              <div class="cr-kit-swatches">
                <span class="cr-kit-chip"><i style="background:${k.shirt}"></i>Shirt</span>
                <span class="cr-kit-chip"><i style="background:${k.shorts}"></i>Shorts</span>
                <span class="cr-kit-chip"><i style="background:${k.shoes}"></i>Shoes</span>
              </div>
              <span class="pl-check">✓</span>
            </button>
          `;
        }).join('')}
      </div>

      <div class="pl-section-label">HEADWEAR (${ownedHeadwear.length} OWNED)</div>
      ${ownedHeadwear.length > 0 ? `
        <div class="cr-locker-grid" id="cr-locker-headwear">
          ${ownedHeadwear.map(h => {
            const isEq = profile.equipped?.headwear === h.id;
            return `
              <button type="button" class="pl-card cr-locker-card ${isEq ? 'is-selected' : ''}" data-slot="headwear" data-id="${h.id}">
                <div class="cr-locker-card-head">
                  <span class="cr-swatch-dot" style="background:${h.headwear.color}"></span>
                  <div class="pl-card-title" lang="en">${escapeHtml(h.name)}</div>
                  ${isEq ? '<span class="cr-badge is-equipped">Equipped</span>' : '<span class="cr-badge is-owned">Owned</span>'}
                </div>
                <div class="cr-shop-spec">${h.headwear.type === 'visor' ? 'Visor' : 'Headband'} · ${escapeHtml(h.headwear.color)}</div>
                <span class="pl-check">✓</span>
              </button>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="cr-empty-slot">
          <span>No headwear unlocked yet. Visit the Shop to unlock headbands and visors.</span>
          <button type="button" class="cr-btn" id="cr-locker-buy-hw">Shop Headwear →</button>
        </div>
      `}
    </div>
  `;

  wireBannerButtons();
  careerPanel.querySelector('#cr-locker-back').onclick = () => {
    flashMsg = null;
    showScreen('hub');
  };
  careerPanel.querySelector('#cr-locker-shop').onclick = () => {
    flashMsg = null;
    showScreen('shop');
  };
  const buyHwBtn = careerPanel.querySelector('#cr-locker-buy-hw');
  if (buyHwBtn) {
    buyHwBtn.onclick = () => {
      shopTab = 'headwear';
      flashMsg = null;
      showScreen('shop');
    };
  }

  careerPanel.querySelectorAll('[data-slot][data-id]').forEach(btn => {
    btn.onclick = () => {
      const slot = btn.dataset.slot;
      const id = btn.dataset.id;
      const next = equip(profile, slot, id);
      persistProfile(next);
      renderLockerScreen();
    };
  });
}

// 8. Reward Screen
function renderRewardScreen() {
  if (!profile || !profile.lastReward) {
    showScreen('hub');
    return;
  }
  const r = profile.lastReward;
  const pl = buildEquippedPlayer(profile);
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
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
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

// 9. Profile Screen
function renderProfileScreen() {
  if (!profile) { showScreen('templates'); return; }
  const pl = buildEquippedPlayer(profile);
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
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-prof-back">← Back to Hub</button>
      </div>
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
  if (
    curScreen === 'play' ||
    curScreen === 'profile' ||
    curScreen === 'training' ||
    curScreen === 'shop' ||
    curScreen === 'locker'
  ) {
    flashMsg = null;
    shopErrors = {};
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
  const cols = curScreen === 'templates' ? 4 : curScreen === 'training' ? 1 : 2;
  let nextIdx = idx + (dx !== 0 ? dx : dy * cols);
  nextIdx = Math.max(0, Math.min(focusables.length - 1, nextIdx));
  focusables[nextIdx]?.focus();
}

let padPrevA = false, padPrevB = false, padPrevLB = false, padPrevRB = false, padPrevX = 0, padPrevY = 0;
function handleCareerGamepad(pad) {
  if (!isOpen || !pad) return;
  const a = !!pad.buttons[0]?.pressed;
  const b = !!pad.buttons[1]?.pressed;
  const lb = !!pad.buttons[4]?.pressed;
  const rb = !!pad.buttons[5]?.pressed;
  const sx = pad.axes[0] || (pad.buttons[15]?.pressed ? 1 : pad.buttons[14]?.pressed ? -1 : 0);
  const sy = pad.axes[1] || (pad.buttons[13]?.pressed ? 1 : pad.buttons[12]?.pressed ? -1 : 0);

  if (curScreen === 'shop') {
    const curIdx = SHOP_TABS.findIndex(t => t.id === shopTab);
    if (lb && !padPrevLB && curIdx > 0) {
      shopTab = SHOP_TABS[curIdx - 1].id;
      shopErrors = {};
      renderShopScreen();
    } else if (rb && !padPrevRB && curIdx < SHOP_TABS.length - 1) {
      shopTab = SHOP_TABS[curIdx + 1].id;
      shopErrors = {};
      renderShopScreen();
    }
  }

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
  padPrevLB = lb;
  padPrevRB = rb;
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
