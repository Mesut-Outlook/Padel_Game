// Career mode UI screens: Template picker, Character Creator, Career Hub, Career Play, Training, Shop, Locker, Match Reward, Profile.
// Reuses the menu's single 3D preview canvas (Intel HD 620 friendly) and routes all storage through src/career.js.
import { serverUrl, NO_SERVER } from './serverurl.js';
import characters from '../data/characters.json';
import venues from '../data/venues.json';
import rackets from '../data/rackets.json';
import eco from '../data/economy.json';
import shop from '../data/shop.json';
import tournaments from '../data/tournaments.json';
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
  tournamentReward,
  canEnter,
  aiRankingTable,
  worldRanking,
} from './career.js';
import { listRooms } from './net.js';
import { padDir, spatialFocus } from './padnav.js';
import { createTournament, myMatch, reportResult, simulateOthers, simulateUntilMine, standings, isFinished, placement } from './tournament.js';
import {
  countryFlag,
  setCareerPreview,
  restoreQuickMatchPreview,
  setCareerGamepadHandler,
} from './menu.js';
import { getPortraitThumb, getVenueThumb, getRacketThumb } from './thumbs.js';

const STORAGE_NOTICE = 'Your progress is saved in this browser only. Clearing browser data deletes it. Accounts are coming later.';
const BLOCKED_BANNER = 'Storage is blocked in this browser — progress lasts only while this tab stays open. Use Profile → Export to keep it.';
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
let startOnlineFn = null;
let careerPanel = null;
let fileInputEl = null;
let isOpen = false;
let curScreen = 'hub'; // 'templates' | 'creator' | 'hub' | 'play' | 'training' | 'shop' | 'locker' | 'reward' | 'profile' | 'tournaments' | 'tpartner' | 'tournament' | 'tresult' | 'ranking' | 'online'

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
  const baseOutfit = p.player?.outfit || {};
  return {
    ...p.player,
    stats: { ...p.stats },
    outfit: {
      shirt: kit ? kit.shirt : (baseOutfit.shirt || '#FFFFFF'),
      shorts: kit ? kit.shorts : (baseOutfit.shorts || '#1D3557'),
      shoes: shoeItem ? shoeItem.color : (kit?.shoes || baseOutfit.shoes || '#1B1B1E'),
      style: kit?.style || baseOutfit.style || 'crew',
      pattern: kit?.pattern || baseOutfit.pattern || 'none',
      ...(kit?.accent || baseOutfit.accent ? { accent: kit?.accent || baseOutfit.accent } : {}),
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
        <div class="cr-left-curr wr"><span>World rank</span><b class="tabular">${p ? "#" + myWorldRank(p) : "—"}</b></div>
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

// When storage is blocked the profile also rides in history.state, which survives the reload at every match end (same tab).
function backupProfile(p) {
  try { history.replaceState({ ...(history.state || {}), career: p }, ''); } catch {}
}
function backedUpProfile() {
  try { return history.state?.career ? importProfile(JSON.stringify(history.state.career)) : null; } catch { return null; }
}

function persistProfile(nextProfile) {
  profile = nextProfile;
  memProfile = nextProfile;
  const ok = saveProfile(getStore(), nextProfile);
  if (!ok) storageBlocked = true;
  backupProfile(ok ? null : nextProfile);
  return ok;
}

function syncProfileFromStorage() {
  const res = loadProfile(getStore());
  // storage blocked (or empty because saving failed earlier): play on the in-memory / history copy
  if (res.status === 'unavailable' || (res.status === 'none' && (memProfile || backedUpProfile()))) {
    storageBlocked = true;
    corruptState = false;
    profile = memProfile || backedUpProfile();
    memProfile = profile;
    return 'unavailable';
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
  else if (curScreen === 'tournaments') renderTournamentsScreen();
  else if (curScreen === 'tpartner') renderTournamentPartnerScreen();
  else if (curScreen === 'tournament') renderTournamentScreen();
  else if (curScreen === 'tresult') renderTournamentResultScreen();
  else if (curScreen === 'ranking') renderRankingScreen();
  else if (curScreen === 'online') renderOnlineScreen();
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
  if (profile.tournamentResult) {
    showScreen('tresult');
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
          <div class="cr-prof-rank">World rank: #${myWorldRank(profile)} · Tier: ${escapeHtml(curTier)} · Record: ${h.won}W – ${Math.max(0, h.played - h.won)}L (${h.played} played)</div>
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
          <span class="cr-curr-label">World rank</span>
          <span class="cr-curr-val tabular">#${myWorldRank(profile)}</span>
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

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-tournaments">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">🏆 Tournaments</div>
            <span class="pl-meta-pill">${profile.tournament ? 'In progress' : 'Circuit'}</span>
          </div>
          <div class="pl-card-sub">Americano, Mexicano, Knockout & League ladder.</div>
        </button>

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-online">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">🌐 Play Online</div>
            <span class="pl-meta-pill">×${eco.mult.online ?? 1} Credits</span>
          </div>
          <div class="pl-card-sub">Join a public room, create one, or enter a room code.</div>
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

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-ranking">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">🌍 Ranking</div>
            <span class="pl-meta-pill">#${myWorldRank(profile)}</span>
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
  careerPanel.querySelector('#cr-hub-tournaments').onclick = () => { flashMsg = null; showScreen(profile.tournament ? 'tournament' : 'tournaments'); };
  careerPanel.querySelector('#cr-hub-ranking').onclick = () => { flashMsg = null; showScreen('ranking'); };
  careerPanel.querySelector('#cr-hub-online').onclick = () => { flashMsg = null; onlineState.status = ''; onlineState.lobby = null; showScreen('online'); };
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
    const styleName = { crew: 'Crew neck', polo: 'Polo', vneck: 'V-neck', tank: 'Tank top' }[item.style || 'crew'] || 'Crew neck';
    const patternName = { none: 'Solid', chest: 'Chest stripe', sash: 'Diagonal sash', side: 'Side panels' }[item.pattern || 'none'] || 'Solid';
    const label = `${styleName} · ${patternName.toLowerCase()}`;
    return `
      <div class="cr-kit-swatches">
        <span class="cr-kit-chip"><i style="background:${item.shirt}"></i>Shirt</span>
        <span class="cr-kit-chip"><i style="background:${item.shorts}"></i>Shorts</span>
        <span class="cr-kit-chip"><i style="background:${item.shoes}"></i>Shoes</span>
        ${item.accent ? `<span class="cr-kit-chip"><i style="background:${item.accent}"></i>Accent</span>` : ''}
      </div>
      <div class="cr-shop-spec">${escapeHtml(label)}</div>
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
          const kStyle = { crew: 'Crew neck', polo: 'Polo', vneck: 'V-neck', tank: 'Tank top' }[k.style || 'crew'] || 'Crew neck';
          const kPattern = ({ none: 'Solid', chest: 'Chest stripe', sash: 'Diagonal sash', side: 'Side panels' }[k.pattern || 'none'] || 'Solid').toLowerCase();
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
                ${k.accent ? `<span class="cr-kit-chip"><i style="background:${k.accent}"></i>Accent</span>` : ''}
              </div>
              <div class="cr-shop-spec">${escapeHtml(`${kStyle} · ${kPattern}`)}</div>
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
    showScreen(clean.tournamentResult ? 'tresult' : clean.tournament ? 'tournament' : 'hub');
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
            <div class="cr-prof-rank">${escapeHtml(pl.country || '')} · ${pl.hand === 'left' ? 'Left-handed' : 'Right-handed'} · World rank: #${myWorldRank(profile)}</div>
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
      backupProfile(null);
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

// 10. Tournaments, Tournament run, Tournament result, World ranking
const FORMAT_INFO = {
  americano: 'Partners rotate every round; every rally is a point, first to 16.',
  mexicano: 'Round 1 is random, then 1st+4th play 2nd+3rd by the table.',
  knockout: 'Lose once and you are out. One set to 6.',
  league: 'Everyone plays everyone; table by wins, then game difference.',
};
const AI_OFFSET = { rookie: -1.5, club: 0, pro: 1, legend: 2 };
const isPairFormat = (f) => f === 'knockout' || f === 'league';
const avgStats = (s) => Object.values(s).reduce((a, b) => a + b, 0) / Object.values(s).length;
const myRating = (p = profile) => avgStats(p.stats);
const aiRating = (c, entry) => avgStats(c.stats) + (AI_OFFSET[entry.ai] ?? 0);
const aiTable = aiRankingTable(characters);
const myWorldRank = (p = profile) => worldRanking(p, aiTable).findIndex(r => r.id === 'me') + 1;
const entryById = (id) => tournaments.circuit.find(e => e.id === id);
const charById = (id) => characters.find(c => c.id === id);

// tournament-screen state (not persisted): the entry waiting for a partner, the chosen partner
let tState = { entry: null, partnerId: null };

const totalRoundsOf = (T) => ({ americano: 7, mexicano: 5, knockout: Math.log2(T.entrants.length), league: T.entrants.length - (T.entrants.length % 2 ? 0 : 1) })[T.format];
const roundName = (T, r) => {
  if (T.format !== 'knockout') return `Round ${r + 1} / ${totalRoundsOf(T)}`;
  const left = totalRoundsOf(T) - r;
  return left === 1 ? 'Final' : left === 2 ? 'Semi-finals' : left === 3 ? 'Quarter-finals' : `Round of ${2 ** left}`;
};
const sideIds = (x) => [].concat(x);
const nameOfId = (T, id) => T.entrants.find(e => e.id === id)?.name || id;
const sideName = (T, x) => sideIds(x).map(id => nameOfId(T, id)).join(' / ');

function lockReason(entry, rank) {
  const c = canEnter(profile, entry, rank);
  if (c.ok) return '';
  if (c.reason === 'invite') return `Invitation: world top ${entry.inviteTop}`;
  if (c.reason === 'ranking') return `Needs ${entry.minRankingPoints} ranking pts`;
  return `Needs ${entry.entryFee} Credits`;
}

// pays the placement reward and clears the run once the tournament is over (called after every state change)
function settleTournament(p) {
  const tour = p.tournament;
  if (!tour || !isFinished(tour.T)) return p;
  const entry = entryById(tour.entryId);
  if (!entry) return { ...p, tournament: null };
  const place = placement(tour.T, 'me');
  const rw = tournamentReward(entry, place);
  const old = p.circuit?.[entry.id];
  return {
    ...p,
    credits: p.credits + rw.credits,
    rankingPoints: p.rankingPoints + rw.rankingPoints,
    circuit: { ...p.circuit, [entry.id]: old ? Math.min(old, place) : place },
    tournament: null,
    tournamentResult: { entryId: entry.id, name: entry.name, place, credits: rw.credits, rankingPoints: rw.rankingPoints },
  };
}

function renderTournamentsScreen() {
  if (!profile) { showScreen('templates'); return; }
  const pl = buildEquippedPlayer(profile);
  setCareerPreview(pl, equippedRacket(profile), buildLeftPanelHtml(pl, profile.stats, profile), 'TOURNAMENTS');
  const rank = myWorldRank();
  const best = (id) => profile.circuit?.[id] ? `Best: #${profile.circuit[id]}` : 'Best: —';

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">CAREER · <span>TOURNAMENTS</span></h2>
        <div class="cr-sub">Climb the circuit. Entry fees are paid in Credits; places pay Credits and ranking points. World rank: #${rank}</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-tour-back">← Back to Hub</button>
      </div>
    </div>
    <div class="cr-body">
      <div class="cr-tour-list">
        ${tournaments.circuit.map(e => {
          const lock = lockReason(e, rank);
          const rw = tournamentReward(e, 1);
          return `
            <div class="cr-tour-row ${lock ? 'is-locked' : ''}">
              <div class="cr-tour-main">
                <div class="cr-tour-name">${escapeHtml(e.name)} <span class="pl-meta-pill">${capitalize(e.format)} · ${e.drawSize} ${isPairFormat(e.format) ? 'pairs' : 'players'}</span> <span class="pl-meta-pill">${capitalize(e.ai)}</span></div>
                <div class="cr-tour-info">${escapeHtml(FORMAT_INFO[e.format])}</div>
                <div class="cr-tour-info">Entry ${e.entryFee} Credits · Champion +${rw.rankingPoints} pts, +${rw.credits} Credits · ${best(e.id)}</div>
                ${lock ? `<div class="cr-train-reason" style="align-self:flex-start">${escapeHtml(lock)}</div>` : ''}
              </div>
              <button type="button" class="cr-btn cr-btn-acc" data-enter="${e.id}" ${lock ? 'disabled' : ''}>Enter</button>
            </div>`;
        }).join('')}
      </div>
    </div>
  `;
  wireBannerButtons();
  careerPanel.querySelector('#cr-tour-back').onclick = () => showScreen('hub');
  careerPanel.querySelectorAll('[data-enter]').forEach(btn => {
    btn.onclick = () => {
      const entry = entryById(btn.dataset.enter);
      if (!canEnter(profile, entry, myWorldRank()).ok) return;
      if (isPairFormat(entry.format)) {
        // suggest the strongest roster character
        const best = characters.slice().sort((a, b) => avgStats(b.stats) - avgStats(a.stats))[0];
        tState = { entry, partnerId: best.id };
        showScreen('tpartner');
      } else {
        tState = { entry, partnerId: null };
        startTournament();
      }
    };
  });
}

function startTournament() {
  const { entry, partnerId } = tState;
  if (!entry || !canEnter(profile, entry, myWorldRank()).ok) { showScreen('tournaments'); return; }
  const pool = characters.filter(c => c.id !== partnerId).sort(() => Math.random() - 0.5);
  let entrants;
  if (!isPairFormat(entry.format)) {
    entrants = [{ id: 'me', name: profile.player.name, rating: myRating() },
      ...pool.slice(0, entry.drawSize - 1).map(c => ({ id: c.id, name: c.name, rating: aiRating(c, entry) }))];
  } else {
    const partner = charById(partnerId);
    entrants = [{ id: 'me', name: `${profile.player.name} / ${partner.name}`, rating: (myRating() + aiRating(partner, entry)) / 2, members: [partnerId] }];
    for (let i = 0; i < entry.drawSize - 1; i++) {  // ponytail: roster has 26 characters, a 16-pair draw reuses some AIs in several pairs
      const a = pool[(2 * i) % pool.length], b = pool[(2 * i + 1) % pool.length];
      entrants.push({ id: `p${i}`, name: `${a.name} / ${b.name}`, rating: (aiRating(a, entry) + aiRating(b, entry)) / 2, members: [a.id, b.id] });
    }
  }
  const T = createTournament({ format: entry.format, entrants });
  persistProfile({ ...profile, credits: profile.credits - entry.entryFee, tournament: { entryId: entry.id, T, partner: partnerId } });
  showScreen('tournament');
}

function renderTournamentPartnerScreen() {
  if (!profile || !tState.entry) { showScreen('tournaments'); return; }
  const entry = tState.entry;
  const pl = buildEquippedPlayer(profile);
  setCareerPreview(pl, equippedRacket(profile), buildLeftPanelHtml(pl, profile.stats, profile), 'CHOOSE PARTNER');
  const cur = charById(tState.partnerId) || characters[0];
  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${escapeHtml(entry.name.toUpperCase())} · <span>PARTNER</span></h2>
        <div class="cr-sub">${escapeHtml(FORMAT_INFO[entry.format])} Entry fee ${entry.entryFee} Credits.</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-tp-back">← Back</button>
      </div>
    </div>
    <div class="cr-body">
      <div class="pl-section-label">CHOOSE PARTNER (${countryFlag(cur.countryCode)} ${escapeHtml(cur.name)} · rating ${avgStats(cur.stats).toFixed(1)})</div>
      <div class="cr-partner-grid" id="cr-tp-grid">
        ${characters.map(c => `
          <button type="button" class="pl-card cr-partner-card ${c.id === tState.partnerId ? 'is-selected' : ''}" data-pid="${c.id}">
            <span>${countryFlag(c.countryCode)}</span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c.name)}</span>
            <span class="pl-check">✓</span>
          </button>`).join('')}
      </div>
    </div>
    <div class="cr-foot">
      <div class="cr-foot-row">
        <div class="pl-summary">${escapeHtml(entry.name)} · ${capitalize(entry.format)} · w/ ${escapeHtml(cur.name)}</div>
        <button type="button" class="pl-start-btn" id="cr-tp-go">PAY ${entry.entryFee} &amp; ENTER</button>
      </div>
    </div>
  `;
  wireBannerButtons();
  careerPanel.querySelector('#cr-tp-back').onclick = () => showScreen('tournaments');
  careerPanel.querySelector('#cr-tp-go').onclick = () => startTournament();
  careerPanel.querySelectorAll('[data-pid]').forEach(btn => {
    btn.onclick = () => { tState.partnerId = btn.dataset.pid; renderTournamentPartnerScreen(); };
  });
}

function standingsTableHtml(T) {
  const rows = standings(T);
  const key = T.format === 'league' ? 'Wins' : 'Points';
  return `
    <table class="cr-tour-table">
      <tr><th>#</th><th>Name</th><th>${key}</th><th>+/-</th></tr>
      ${rows.map((r, i) => `<tr class="${r.id === 'me' ? 'is-me' : ''}"><td>${i + 1}</td><td>${escapeHtml(nameOfId(T, r.id))}</td><td>${T.format === 'league' ? r.wins : r.points}</td><td>${r.diff > 0 ? '+' : ''}${r.diff}</td></tr>`).join('')}
    </table>`;
}

function matchRowHtml(T, m) {
  const mine = [...sideIds(m.a), ...sideIds(m.b)].includes('me');
  return `<div class="cr-tour-match ${mine ? 'is-me' : ''}">
    <span>${escapeHtml(sideName(T, m.a))}</span>
    <b class="tabular">${m.score ? `${m.score.a} – ${m.score.b}` : 'vs'}</b>
    <span>${escapeHtml(sideName(T, m.b))}</span>
  </div>`;
}

function bracketHtml(T) {
  return `<div class="cr-tour-bracket">${T.rounds.map((round, r) => `
    <div class="cr-tour-col"><div class="pl-section-label">${roundName(T, r)}</div>${round.map(m => matchRowHtml(T, m)).join('')}</div>`).join('')}</div>`;
}

function renderTournamentScreen() {
  const tour = profile?.tournament;
  if (!tour) { showScreen('tournaments'); return; }
  const T = tour.T, entry = entryById(tour.entryId);
  if (!entry || !T?.rounds) { persistProfile({ ...profile, tournament: null }); showScreen('tournaments'); return; }  // circuit entry removed in an update
  const pl = buildEquippedPlayer(profile);
  setCareerPreview(pl, equippedRacket(profile), buildLeftPanelHtml(pl, profile.stats, profile), 'TOURNAMENT');
  const mine = myMatch(T);
  const round = T.rounds[T.round];

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${escapeHtml(entry.name.toUpperCase())} · <span>${roundName(T, T.round).toUpperCase()}</span></h2>
        <div class="cr-sub">${capitalize(T.format)} · ${escapeHtml(FORMAT_INFO[T.format])} Progress saves automatically.</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-t-back">← Back to Hub</button>
      </div>
    </div>
    <div class="cr-body">
      ${T.format === 'knockout' ? bracketHtml(T) : `
        <div class="pl-section-label">${roundName(T, T.round).toUpperCase()}</div>
        <div class="cr-tour-matches">${round.map(m => matchRowHtml(T, m)).join('')}</div>
        <div class="pl-section-label">TABLE</div>
        ${standingsTableHtml(T)}`}
    </div>
    <div class="cr-foot">
      <div class="cr-foot-row">
        <div class="pl-summary">${mine ? `Your match: ${escapeHtml(sideName(T, mine.a))} vs ${escapeHtml(sideName(T, mine.b))}` : 'No match for you this round.'}</div>
        ${mine
          ? '<button type="button" class="pl-start-btn" id="cr-t-play">PLAY YOUR MATCH</button>'
          : '<button type="button" class="cr-btn" id="cr-t-end">Skip to my next match</button> <button type="button" class="pl-start-btn" id="cr-t-sim">SIMULATE ROUND</button>'}
      </div>
    </div>
  `;
  wireBannerButtons();
  careerPanel.querySelector('#cr-t-back').onclick = () => showScreen('hub');
  const sim = (all) => {
    const next = all ? simulateUntilMine(T) : simulateOthers(T);  // "skip ahead" stops at your next match or the end
    persistProfile(settleTournament({ ...profile, tournament: { ...tour, T: next } }));
    showScreen(profile.tournamentResult ? 'tresult' : 'tournament');
  };
  if (mine) careerPanel.querySelector('#cr-t-play').onclick = () => launchTournamentMatch(mine);
  else {
    careerPanel.querySelector('#cr-t-sim').onclick = () => sim(false);
    careerPanel.querySelector('#cr-t-end').onclick = () => sim(true);
  }
}

async function launchTournamentMatch(m) {
  if (!startMatchFn || !profile?.tournament) return;
  const tour = profile.tournament, T = tour.T, entry = entryById(tour.entryId);
  const swapped = sideIds(m.b).includes('me');  // the human is always team 0 in startMatch
  const mySide = swapped ? m.b : m.a, oppSide = swapped ? m.a : m.b;
  const members = (x) => sideIds(x).flatMap(id => id === 'me' ? [] : (T.entrants.find(e => e.id === id)?.members || [id]));
  // pair formats: your side is the pair 'me', so the partner comes from the entry choice; americano/mexicano: the other id on your side
  const partner = charById(sideIds(mySide).includes('me') && sideIds(mySide).length === 1 ? tour.partner : members(mySide)[0]) || characters[0];
  const [o1, o2] = members(oppSide).map(charById);

  const myRacket = rackets.find(r => r.id === profile.equipped?.racket) || rackets[0];
  const kit = equippedKit(profile), shoeItem = equippedShoes(profile), ballItem = equippedBall(profile), hwItem = equippedHeadwearItem(profile);
  const me = {
    ...profile.player, stats: { ...profile.stats },
    outfit: { shirt: kit.shirt, shorts: kit.shorts, shoes: shoeItem.color },
    headwear: hwItem ? hwItem.headwear : profile.player.headwear,
  };
  const rr = () => rackets[Math.floor(Math.random() * rackets.length)];
  const rally = T.format === 'americano' || T.format === 'mexicano';
  const quick = new URLSearchParams(location.search).has('quick');

  await startMatchFn({
    players: 4, humans: 1, ai: entry.ai,
    match: rally ? { pointsTo: quick ? 4 : 16 } : { sets: 1, goldenPoint: true, superTiebreak: false, starPoint: false },
    roster: { 0: me, 1: partner, 2: o1 || characters[0], 3: o2 || characters[1] },
    rackets: { 0: myRacket, 1: rr(), 2: rr(), 3: rr() },
    shoes: { 0: { speed: shoeItem.speed, agility: shoeItem.agility } },
    ball: { speed: ballItem.speed, bounce: ballItem.bounce },
    venue: venues.find(v => v.id === entry.venue) || venues[0],
    onEnd(result) {
      const reward = matchReward(result, eco);
      let updated = applyReward(profile, reward, result);
      const [t0, t1] = rally ? result.points : result.games;
      const fixed = result.won === (t0 > t1) ? [t0, t1] : result.won ? [t1 + 1, t1] : [t0, t0 + 1];  // guard against a tie
      const score = swapped ? { a: fixed[1], b: fixed[0] } : { a: fixed[0], b: fixed[1] };
      const next = simulateOthers(reportResult(T, m, score));
      updated.lastReward = {
        lines: reward.lines, mult: reward.mult, credits: reward.credits, won: result.won, ai: result.ai || entry.ai,
        score: rally ? `${t0}-${t1}` : (result.score?.sets || `${t0}-${t1}`),
      };
      updated = settleTournament({ ...updated, tournament: { ...tour, T: next } });
      persistProfile(updated);
    },
  });
}

function renderTournamentResultScreen() {
  const r = profile?.tournamentResult;
  if (!r) { showScreen('hub'); return; }
  const pl = buildEquippedPlayer(profile);
  setCareerPreview(pl, equippedRacket(profile), buildLeftPanelHtml(pl, profile.stats, profile), r.place === 1 ? 'CHAMPION' : 'TOURNAMENT OVER');
  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">TOURNAMENT <span>RESULT</span></h2>
        <div class="cr-sub">${escapeHtml(r.name)}</div>
      </div>
      <div class="cr-head-right">${renderTopCreditsHtml(profile)}</div>
    </div>
    <div class="cr-body">
      <div class="cr-reward-box">
        <div class="cr-reward-head">
          <div class="cr-reward-outcome ${r.place === 1 ? '' : 'is-loss'}">${r.place === 1 ? '🏆 CHAMPION' : `PLACE #${r.place}`}</div>
          <div class="cr-reward-score">${escapeHtml(r.name)}</div>
        </div>
        <div class="cr-reward-lines">
          <div class="cr-reward-row"><span>Credits</span><b class="tabular">+${r.credits}</b></div>
          <div class="cr-reward-row"><span>Ranking points</span><b class="tabular">+${r.rankingPoints}</b></div>
        </div>
        <div class="cr-reward-balance"><span>New world rank</span><b class="tabular">#${myWorldRank()}</b></div>
        <button type="button" class="pl-start-btn" id="cr-tr-continue" style="width:100%;margin-top:4px">Continue</button>
      </div>
    </div>
  `;
  wireBannerButtons();
  const btn = careerPanel.querySelector('#cr-tr-continue');
  btn.onclick = () => {
    const { tournamentResult: _x, ...clean } = profile;
    persistProfile(clean);
    showScreen('hub');
  };
  setTimeout(() => btn.focus(), 20);
}

function renderRankingScreen() {
  if (!profile) { showScreen('templates'); return; }
  const pl = buildEquippedPlayer(profile);
  setCareerPreview(pl, equippedRacket(profile), buildLeftPanelHtml(pl, profile.stats, profile), 'WORLD RANKING');
  const table = worldRanking(profile, aiTable);
  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">CAREER · <span>WORLD RANKING</span></h2>
        <div class="cr-sub">Your rank: #${myWorldRank()} of ${table.length}. Win tournaments to climb.</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-rank-back">← Back to Hub</button>
      </div>
    </div>
    <div class="cr-body">
      <table class="cr-tour-table">
        <tr><th>#</th><th>Name</th><th>Points</th></tr>
        ${table.map((r, i) => `<tr class="${r.id === 'me' ? 'is-me' : ''}" ${r.id === 'me' ? 'id="cr-rank-me"' : ''}><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${r.points}</td></tr>`).join('')}
      </table>
    </div>
  `;
  wireBannerButtons();
  careerPanel.querySelector('#cr-rank-back').onclick = () => showScreen('hub');
  careerPanel.querySelector('#cr-rank-me')?.scrollIntoView({ block: 'center' });
}

// 11. Play Online (room list, create, join by code). The match itself runs through main.js startOnline.
const onlineState = { rooms: null, busy: false, players: 4, isPublic: true, venueIdx: 0, ballId: 'ball_standard', code: '', status: '', lobby: null, net: null };

const onlineUrl = () => serverUrl(location);

function setOnlineStatus(text, lobby) {
  onlineState.status = text;
  if (lobby) onlineState.lobby = lobby;
  const el = careerPanel?.querySelector('#cr-on-status');
  if (el) { el.innerHTML = text; el.style.display = text ? '' : 'none'; }
  const go = careerPanel?.querySelector('#cr-on-start');
  if (go) go.hidden = !onlineState.lobby || onlineState.lobby.started;
}

function leaveOnline() {
  if (onlineState.net) {  // a joined room lives in main.js state: reload to drop it cleanly
    onlineState.net.ws.onclose = onlineState.net.ws.onerror = null;
    onlineState.net.ws.close();
    history.replaceState(history.state, '', '#career');  // keep history.state (storage-blocked backup)
    location.reload();
    return;
  }
  showScreen('hub');
}

async function refreshRooms() {
  const url = onlineUrl();
  if (!url) { onlineState.rooms = []; setOnlineStatus(NO_SERVER); return; }
  onlineState.busy = true;
  setOnlineStatus('Looking for rooms…');
  try { onlineState.rooms = await listRooms(url); onlineState.status = ''; }
  catch (e) { onlineState.rooms = []; onlineState.status = escapeHtml(e.message); }
  onlineState.busy = false;
  if (curScreen === 'online') renderOnlineScreen();
}

function joinOnlineRoom(code, create) {
  code = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (!code) { setOnlineStatus('Enter a room code first.'); return; }
  if (!profile || onlineState.net) return;
  const { stats: _s, ...look } = buildEquippedPlayer(profile);
  const shoeItem = equippedShoes(profile);
  const myRacket = rackets.find(r => r.id === profile.equipped?.racket) || rackets[0];
  const ballItem = shop.items.find(i => i.id === onlineState.ballId) || equippedBall(profile);
  const venue = venues[onlineState.venueIdx] || venues[0];
  const net = startOnlineFn({
    url: onlineUrl() || undefined, code, players: onlineState.players,
    venue: venues.indexOf(venue), ai: 'club',
    match: { sets: 1, goldenPoint: true, superTiebreak: false, starPoint: false },
    char: 0, stats: { ...profile.stats }, racket: { ...myRacket.stats },
    public: create && onlineState.isPublic, name: profile.player.name, look,
    shoes: { speed: shoeItem.speed, agility: shoeItem.agility },
    ball: create ? { speed: ballItem.speed, bounce: ballItem.bounce } : undefined,
    status: (t, l) => setOnlineStatus(t, l),
    onEnd(result) {
      const reward = matchReward(result, eco);
      const updated = applyReward(profile, reward, result);
      updated.lastReward = {
        lines: reward.lines, mult: reward.mult, credits: reward.credits, won: result.won, ai: 'online',
        score: result.score?.sets || '',
      };
      persistProfile(updated);
    },
  });
  onlineState.net = net;
}

function renderOnlineScreen() {
  if (!profile) { showScreen('templates'); return; }
  const pl = buildEquippedPlayer(profile);
  setCareerPreview(pl, equippedRacket(profile), buildLeftPanelHtml(pl, profile.stats, profile), 'PLAY ONLINE');
  if (onlineState.rooms === null && !onlineState.busy && !onlineState.net) refreshRooms();
  const joined = !!onlineState.net;
  const balls = shop.items.filter(i => i.type === 'ball' && profile.inventory.includes(i.id));
  if (!balls.some(b => b.id === onlineState.ballId)) onlineState.ballId = balls[0]?.id || 'ball_standard';
  const rooms = onlineState.rooms || [];

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">CAREER · <span>PLAY ONLINE</span></h2>
        <div class="cr-sub">1 Set · Golden Point · empty seats are filled by AI · Credits ×${eco.mult.online ?? 1}</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-on-back">← ${joined ? 'Leave room' : 'Back to Hub'}</button>
      </div>
    </div>
    <div class="cr-body">
      <div class="cr-msg cr-msg-ok" id="cr-on-status" style="${onlineState.status ? '' : 'display:none'}">${onlineState.status}</div>
      <button type="button" class="pl-start-btn" id="cr-on-start" ${onlineState.lobby && !onlineState.lobby.started ? '' : 'hidden'}>START MATCH</button>
      ${joined ? '' : `
      <div class="pl-section-label">PUBLIC ROOMS <button type="button" class="cr-btn" id="cr-on-refresh" ${onlineState.busy ? 'disabled' : ''}>Refresh</button></div>
      <div class="cr-tour-list">
        ${rooms.length ? rooms.map(r => `
          <div class="cr-tour-row">
            <div class="cr-tour-main">
              <div class="cr-tour-name">${escapeHtml(r.host || 'Player')}'s room <span class="pl-meta-pill">${r.players - r.free}/${r.players} players</span></div>
              <div class="cr-tour-info">${escapeHtml(venues[r.venue]?.name || '—')} · ${r.free} free seat${r.free === 1 ? '' : 's'} · ${escapeHtml(r.code)}</div>
            </div>
            <button type="button" class="cr-btn cr-btn-acc" data-join="${escapeHtml(r.code)}">Join</button>
          </div>`).join('') : `<div class="cr-tour-info">${onlineState.busy ? 'Loading…' : 'No public rooms right now.'}</div>`}
      </div>

      <div class="pl-section-label">CREATE ROOM</div>
      <div class="pl-seg-row" id="cr-on-mode">
        <button type="button" class="pl-seg-btn ${onlineState.players === 4 ? 'is-selected' : ''}" data-players="4">Doubles (2v2)</button>
        <button type="button" class="pl-seg-btn ${onlineState.players === 2 ? 'is-selected' : ''}" data-players="2">Singles (1v1)</button>
      </div>
      <div class="pl-seg-row" id="cr-on-vis">
        <button type="button" class="pl-seg-btn ${onlineState.isPublic ? 'is-selected' : ''}" data-public="1">Public</button>
        <button type="button" class="pl-seg-btn ${onlineState.isPublic ? '' : 'is-selected'}" data-public="0">Private</button>
      </div>
      <div class="cr-form-grid">
        <label class="cr-field"><span class="cr-field-head">Venue</span>
          <select class="cr-select" id="cr-on-venue">${venues.map((v, i) => `<option value="${i}" ${i === onlineState.venueIdx ? 'selected' : ''}>${escapeHtml(v.name)} — ${escapeHtml(v.city)}</option>`).join('')}</select></label>
        <label class="cr-field"><span class="cr-field-head">Match ball</span>
          <select class="cr-select" id="cr-on-ball">${balls.map(b => `<option value="${b.id}" ${b.id === onlineState.ballId ? 'selected' : ''}>${escapeHtml(b.name)}</option>`).join('')}</select></label>
      </div>
      <button type="button" class="cr-btn cr-btn-acc" id="cr-on-create">Create room</button>

      <div class="pl-section-label">JOIN BY CODE</div>
      <div class="cr-foot-row" style="justify-content:flex-start;gap:8px">
        <input type="text" class="cr-input" id="cr-on-code" maxlength="6" placeholder="ROOM CODE" value="${escapeHtml(onlineState.code)}" style="max-width:180px;text-transform:uppercase" />
        <button type="button" class="cr-btn cr-btn-acc" id="cr-on-join">Join</button>
      </div>`}
    </div>
  `;
  wireBannerButtons();
  const q = (sel) => careerPanel.querySelector(sel);
  q('#cr-on-back').onclick = () => leaveOnline();
  q('#cr-on-start').onclick = () => onlineState.net?.start();
  if (joined) return;
  q('#cr-on-refresh').onclick = () => refreshRooms();
  careerPanel.querySelectorAll('[data-join]').forEach(b => { b.onclick = () => joinOnlineRoom(b.dataset.join, false); });
  careerPanel.querySelectorAll('#cr-on-mode [data-players]').forEach(b => { b.onclick = () => { onlineState.players = +b.dataset.players; renderOnlineScreen(); }; });
  careerPanel.querySelectorAll('#cr-on-vis [data-public]').forEach(b => { b.onclick = () => { onlineState.isPublic = b.dataset.public === '1'; renderOnlineScreen(); }; });
  q('#cr-on-venue').onchange = (e) => { onlineState.venueIdx = +e.target.value; };
  q('#cr-on-ball').onchange = (e) => { onlineState.ballId = e.target.value; };
  q('#cr-on-code').oninput = (e) => { onlineState.code = e.target.value; };
  q('#cr-on-create').onclick = () => joinOnlineRoom(Math.random().toString(36).slice(2, 6).toUpperCase(), true);
  q('#cr-on-join').onclick = () => joinOnlineRoom(onlineState.code, false);
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
    curScreen === 'locker' ||
    curScreen === 'tournaments' ||
    curScreen === 'tournament' ||
    curScreen === 'ranking'
  ) {
    flashMsg = null;
    shopErrors = {};
    showScreen('hub');
    return;
  }
  if (curScreen === 'online') { leaveOnline(); return; }
  if (curScreen === 'tpartner') { showScreen('tournaments'); return; }
  if (curScreen === 'tresult') {
    careerPanel?.querySelector('#cr-tr-continue')?.click();
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
  const active = document.activeElement;
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
  spatialFocus(careerPanel, dx, dy);
}

let padPrevA = false, padPrevB = false, padPrevLB = false, padPrevRB = false, padPrevX = 0, padPrevY = 0;
function handleCareerGamepad(pad) {
  if (!isOpen || !pad) return;
  const a = !!pad.buttons[0]?.pressed;
  const b = !!pad.buttons[1]?.pressed;
  const lb = !!pad.buttons[4]?.pressed;
  const rb = !!pad.buttons[5]?.pressed;
  const [sx, sy] = padDir(pad);

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

// where a (re)opened career lands: pending reward first, then the tournament in progress
const startScreen = () => profile.lastReward ? 'reward' : profile.tournamentResult ? 'tresult' : profile.tournament ? 'tournament' : 'hub';

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
    showScreen(startScreen());
  } else if (status === 'unavailable' && profile) {
    showScreen(startScreen());
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
    history.replaceState(history.state, '', location.pathname + location.search);
  }
  restoreQuickMatchPreview();
}

export function initCareer({ startMatch, startOnline }) {
  startMatchFn = startMatch;
  startOnlineFn = startOnline;
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
