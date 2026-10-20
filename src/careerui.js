// Career mode UI screens: Template picker, Character Creator, Career Hub, Career Play, Training, Shop, Locker, Match Reward, Profile.
// Reuses the menu's single 3D preview canvas (Intel HD 620 friendly) and routes all storage through src/career.js.
import { serverUrl, NO_SERVER, allowServer, NOT_CONNECTED } from './serverurl.js';
import { track } from './track.js';
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
  trainCost,
  buyTraining,
  buyItem,
  bagLimit,
  bagRoom,
  equip,
  applyRating,
  settleMatch,
  statCap,
  coachTip,
  formNow,
  addPoints,
  expirePoints,
  expiringSoon,
  tournamentReward,
  canEnter,
  aiRankingTable,
  worldRanking,
} from './career.js';
import { listRooms } from './net.js';
import { TIERS, tierAt, scaleStats, aiLevel, questionnaireLevel, playtomicStart, startCredits } from './level.js';
import { padDir, spatialFocus } from './padnav.js';
import { createTournament, myMatch, reportResult, simulateOthers, simulateUntilMine, standings, isFinished, placement } from './tournament.js';
import {
  countryFlag,
  setCareerPreview,
  restoreQuickMatchPreview,
  setCareerGamepadHandler,
} from './menu.js';
import { getPortraitThumb, getVenueThumb, getRacketThumb } from './thumbs.js';
import { t, N_ } from './i18n.js';

const STORAGE_NOTICE = N_('Your progress is saved in this browser only. Clearing browser data deletes it. Accounts are coming later.');
const BLOCKED_BANNER = N_('Storage is blocked in this browser — progress lasts only while this tab stays open. Use Profile → Export to keep it.');
const CORRUPT_BANNER = N_('Your saved profile could not be read.');

const SKIN_PRESETS = [
  ['#F9DCC4', N_('Porcelain')],
  ['#F3D2B3', N_('Fair')],
  ['#F1C27D', N_('Warm Sand')],
  ['#E0B58F', N_('Honey')],
  ['#D9A679', N_('Tan')],
  ['#C68642', N_('Bronze')],
  ['#A5714B', N_('Chestnut')],
  ['#8D5524', N_('Espresso')],
];

// 8 hair/beard presets: black, dark brown, brown, chestnut, red/auburn, blonde, ash, grey
const HAIR_PRESETS = [
  ['#141414', N_('Black')],
  ['#2b1d14', N_('Dark Brown')],
  ['#4a2f1d', N_('Brown')],
  ['#7a5230', N_('Chestnut')],
  ['#8e3b1f', N_('Red')],
  ['#d6b46a', N_('Blonde')],
  ['#9e9a93', N_('Ash')],
  ['#b5b5b5', N_('Grey')],
];

const ACCENT_PRESETS = ['#1b1b1b', '#ffffff', '#e63946', '#2f6fb5', '#d8f53a', '#2ec4b6'];

const BODY_TYPES = [
  { id: 'slim', label: N_('Slim'), width: 0.9 },
  { id: 'athletic', label: N_('Athletic'), width: 1.0 },
  { id: 'muscular', label: N_('Muscular'), width: 1.12 },
  { id: 'stocky', label: N_('Stocky'), width: 1.15 },
  { id: 'tall', label: N_('Tall'), width: 0.97 },
  { id: 'petite', label: N_('Petite'), width: 0.92 },
];

const HAIR_STYLES = [
  { id: 'Hair_SimpleParted', label: N_('Parted') },
  { id: 'Hair_Buzzed', label: N_('Buzzed') },
  { id: 'Hair_BuzzedFemale', label: N_('Short Crop') },
  { id: 'Hair_Long', label: N_('Long') },
  { id: 'Hair_Buns', label: N_('Buns') },
  { id: 'none', label: N_('None / Bald') },
];

const BEARD_STYLES = [
  { id: 'none', label: N_('None') },
  { id: 'stubble', label: N_('Stubble') },
  { id: 'full', label: N_('Full') },
  { id: 'goatee', label: N_('Goatee') },
];

const AI_LEVELS = [
  { id: 'rookie', label: N_('Rookie'), stars: '★' },
  { id: 'club', label: N_('Club'), stars: '★★' },
  { id: 'pro', label: N_('Pro'), stars: '★★★' },
  { id: 'legend', label: N_('Legend'), stars: '★★★★' },
];

const TRAINING_STATS = [
  { key: 'speed', label: N_('Speed'), desc: N_('Speed: court movement and sprint pace across the turf.') },
  { key: 'power', label: N_('Power'), desc: N_('Power: ball speed on groundstrokes and serves.') },
  { key: 'control', label: N_('Control'), desc: N_('Control: shot placement accuracy toward your target.') },
  { key: 'volley', label: N_('Volley'), desc: N_('Volley: accuracy on balls taken before the bounce.') },
  { key: 'smash', label: N_('Smash'), desc: N_('Smash: speed and accuracy on smashes, bandejas and víboras.') },
  { key: 'stamina', label: N_('Stamina'), desc: N_('Stamina: reduces accuracy loss during long rallies (8+ shots).') },
];

const SHOP_TABS = [
  { id: 'racket', label: N_('Rackets') },
  { id: 'shoes', label: N_('Shoes') },
  { id: 'ball', label: N_('Balls') },
  { id: 'kit', label: N_('Kit') },
  { id: 'headwear', label: N_('Headwear') },
  { id: 'bag', label: N_('Bag') },
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
let creatorTemplate = characters[Math.floor(Math.random() * characters.length)];  // a different first pick on every visit
let creatorState = null;
let pendingLook = null; // look from the creator, waiting for the level step
let lvl = { mode: 'choose', answers: [null, null, null, null, null], input: '', error: '', start: null };
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

const levelVars = (p) => ({ level: (p.level ?? 1.5).toFixed(2), tier: t(tierAt(p.level ?? 1.5).name) });
const levelText = (p) => t('Level {level} · {tier}', levelVars(p));
const relPct = (p) => Math.round((p.reliability ?? 0.2) * 100);
const tierByIndex = (i) => TIERS.find(t => t.index === i) || TIERS[0];
const LEVEL_NOTE = N_('Padel Legends level — Playtomic-style, not synced');
const formText = (p) => { const f = formNow(p, eco); return f < 0 ? t('Rusty ({pct}%)', { pct: Math.round(f * 100) }) : t('Sharp'); };

function renderTopCreditsHtml(p = profile) {
  if (!p) return '';
  const tier = t(tierAt(p.level ?? 1.5).name);
  const num = (p.level ?? 1.5).toFixed(2);
  return `
    <div class="cr-top-currencies" aria-label="${t('Player currencies')}">
      <div class="cr-top-curr"><span>${t('Credits')}</span><b class="tabular">${p.credits}</b></div>
      <div class="cr-top-curr is-rp"><span>${t('Ranking pts')}</span><b class="tabular">${p.rankingPoints}</b></div>
      <div class="cr-top-curr is-tier"><span>${t('Level')}</span><b>${num} · ${escapeHtml(tier)} · ${relPct(p)}%</b></div>
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
  const gText = ch.gender === 'f' ? t('FEMALE') : t('MALE');
  const hText = ch.hand === 'left' ? t('LEFT-HANDED') : t('RIGHT-HANDED');
  const s = stats || ch.stats || START_STATS;
  const currencyRow = p
    ? `
      <div class="cr-left-currencies">
        <div class="cr-left-curr"><span>${t('Credits')}</span><b class="tabular">${p.credits}</b></div>
        <div class="cr-left-curr rp"><span>${t('Ranking points')}</span><b class="tabular">${p.rankingPoints}</b></div>
        <div class="cr-left-curr wr"><span>${t('World rank')}</span><b class="tabular">${p ? '#' + myWorldRank(p) : '—'}</b></div>
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
    ${p ? `<div class="cr-left-level"><b>${escapeHtml(levelText(p))} · ${relPct(p)}%</b><span>${t('Form: {form}', { form: formText(p) })}</span><span>${escapeHtml(t(LEVEL_NOTE))}</span></div>` : ''}
    <div class="pl-stats-list">
      ${statBarHtml(t('SPEED'), s.speed ?? 4)}
      ${statBarHtml(t('POWER'), s.power ?? 4)}
      ${statBarHtml(t('CONTROL'), s.control ?? 4)}
      ${statBarHtml(t('VOLLEY'), s.volley ?? 4)}
      ${statBarHtml(t('SMASH'), s.smash ?? 4)}
      ${statBarHtml(t('STAMINA'), s.stamina ?? 4)}
    </div>
  `;
}

// coach tip in the UI language: career.js gives [template, vars] pieces; stat / tier names are translated too
function coachLine(c) {
  if (!c.msg) return t(c.text);
  const tr = ([s, v = {}]) => t(s, { ...v, ...(v.stat && { stat: t(v.stat) }), ...(v.tier && { tier: t(v.tier) }) });
  return `${tr(c.msg.lead)} — ${tr(c.msg.rest)}${c.msg.alt ? ' ' + tr(c.msg.alt) : ''}`;
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
    const stats = creatorMode === 'edit' && profile ? profile.stats : START_STATS;
    setCareerPreview(previewChar, rk, buildLeftPanelHtml(previewChar, stats, creatorMode === 'edit' ? profile : null), t('CAREER CREATOR'));
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
  const res = loadProfile(getStore(), new Date(), eco);
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
        <span>⚠️ ${escapeHtml(t(BLOCKED_BANNER))}</span>
      </div>
    `;
  }
  if (corruptState) {
    html += `
      <div class="cr-banner cr-banner-err" role="alert">
        <span>⚠️ ${escapeHtml(t(CORRUPT_BANNER))}</span>
        <div class="cr-banner-actions">
          <button type="button" class="cr-btn cr-btn-acc" id="cr-corrupt-new">${t('Start new')}</button>
          <button type="button" class="cr-btn" id="cr-corrupt-import">${t('Import')}</button>
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
      flashMsg = { type: 'ok', text: t('Profile imported successfully.') };
      persistProfile(imported);
      showScreen(curScreen === 'profile' ? 'profile' : 'hub');
    } catch {
      flashMsg = { type: 'error', text: t('Invalid profile file — could not import.') };
      renderCurrentScreen();
    }
  };
  reader.onerror = () => {
    flashMsg = { type: 'error', text: t('Could not read the selected file.') };
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
  else if (curScreen === 'levelstart') renderLevelStartScreen();
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
    buildLeftPanelHtml(previewCh, START_STATS, null),
    t('CHOOSE TEMPLATE')
  );

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head cr-head-tpl">
      <div>
        <h2 class="cr-title">${t('NEW CAREER · <span>CHOOSE A TEMPLATE</span>')}</h2>
        <div class="cr-sub">${t('Pick any of the {n} players as your starting template, then customize your look.', { n: characters.length })}</div>
      </div>
      <div class="cr-banner-actions">
        <button type="button" class="cr-btn" id="cr-tpl-import">${t('Import Profile')}</button>
        <button type="button" class="cr-btn" id="cr-tpl-back">${t('← Back to menu')}</button>
      </div>
    </div>
    <div class="pl-filter-row" id="cr-tpl-filters">
      <button type="button" class="pl-chip ${templateFilter === 'all' ? 'is-active' : ''}" data-filter="all">${t('All ({n})', { n: characters.length })}</button>
      <button type="button" class="pl-chip ${templateFilter === 'f' ? 'is-active' : ''}" data-filter="f">${t('Women')}</button>
      <button type="button" class="pl-chip ${templateFilter === 'm' ? 'is-active' : ''}" data-filter="m">${t('Men')}</button>
    </div>
    <div class="cr-body">
      <div class="pl-char-grid" id="cr-tpl-grid"></div>
    </div>
    <div class="cr-foot">
      <div class="cr-storage-note">${escapeHtml(t(STORAGE_NOTICE))}</div>
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
        buildLeftPanelHtml(ch, START_STATS, null),
        t('CHOOSE TEMPLATE')
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
        <h2 class="cr-title">${isEdit ? t('PROFILE · <span>EDIT LOOK</span>') : t('CREATE <span>YOUR PLAYER</span>')}</h2>
        <div class="cr-sub">${isEdit ? t('Free appearance editor — stats and career progress are unaffected.') : t('Customize every detail. Starting career stats are all 4.')}</div>
      </div>
      <button type="button" class="cr-btn" id="cr-creator-back">${isEdit ? t('← Back to Profile') : t('← Templates')}</button>
    </div>

    <div class="cr-body">
      <div class="cr-form-grid">
        <!-- Name -->
        <div class="cr-field">
          <div class="cr-field-head"><span>${t('Player Name (1–16)')}</span><b id="cr-name-len">${s.name.trim().length}/16</b></div>
          <input type="text" class="cr-input" id="cr-name-input" maxlength="16" value="${escapeHtml(s.name)}" placeholder="${t('Enter player name')}" />
        </div>

        <!-- Country -->
        <div class="cr-field">
          <div class="cr-field-head"><span>${t('Country')}</span><b>${countryFlag(s.countryCode)} ${escapeHtml(s.countryCode)}</b></div>
          <select class="cr-select" id="cr-country-select">
            ${COUNTRIES.map(c => `<option value="${c.code}" ${c.code === s.countryCode ? 'selected' : ''}>${countryFlag(c.code)} ${escapeHtml(c.name)} (${c.code})</option>`).join('')}
          </select>
        </div>

        <!-- Gender (from template, read-only) & Dominant Hand -->
        <div class="cr-field">
          <div class="cr-field-head"><span>${t('Gender (Template)')}</span><b>${s.gender === 'f' ? t('FEMALE') : t('MALE')}</b></div>
          <div class="cr-opt-wrap">
            <span class="pl-meta-pill">${t('Locked to template ({gender})', { gender: s.gender === 'f' ? t('Female') : t('Male') })}</span>
          </div>
        </div>

        <div class="cr-field">
          <div class="cr-field-head"><span>${t('Hand')}</span><b>${s.hand === 'left' ? t('LEFT-HANDED') : t('RIGHT-HANDED')}</b></div>
          <div class="pl-seg-row" id="cr-hand-seg">
            <button type="button" class="pl-seg-btn ${s.hand === 'right' ? 'is-selected' : ''}" data-hand="right">${t('Right-handed')}</button>
            <button type="button" class="pl-seg-btn ${s.hand === 'left' ? 'is-selected' : ''}" data-hand="left">${t('Left-handed')}</button>
          </div>
        </div>

        <!-- Skin Tone -->
        <div class="cr-field is-full">
          <div class="cr-field-head"><span>${t('Skin Tone')}</span><b>${s.skinTone.toUpperCase()}</b></div>
          <div class="cr-swatches" id="cr-skin-swatches">
            ${SKIN_PRESETS.map(([hex, label]) => `
              <button type="button" class="cr-swatch ${s.skinTone.toLowerCase() === hex.toLowerCase() ? 'is-selected' : ''}" style="background:${hex}" data-hex="${hex}" title="${t(label)}"></button>
            `).join('')}
            <input type="color" class="cr-color-input" id="cr-skin-picker" value="${s.skinTone}" title="${t('Custom skin tone')}" />
          </div>
        </div>

        <!-- Body Type -->
        <div class="cr-field is-full">
          <div class="cr-field-head"><span>${t('Body Type')}</span><b>${t(BODY_TYPES.find(b => b.id === s.bodyType)?.label || s.bodyType).toUpperCase()}</b></div>
          <div class="cr-opt-wrap" id="cr-body-types">
            ${BODY_TYPES.map(tb => `
              <button type="button" class="cr-opt-btn ${s.bodyType === tb.id ? 'is-selected' : ''}" data-btype="${tb.id}">${t(tb.label)}</button>
            `).join('')}
          </div>
        </div>

        <!-- Body Height & Face Width -->
        <div class="cr-field">
          <div class="cr-field-head"><span>${t('Body Height')}</span><b id="cr-height-val">${s.bodyHeight.toFixed(2)}×</b></div>
          <input type="range" class="cr-range" id="cr-height-range" min="0.9" max="1.1" step="0.01" value="${s.bodyHeight}" />
        </div>

        <div class="cr-field">
          <div class="cr-field-head"><span>${t('Face Width')}</span><b id="cr-face-val">${s.faceWidth.toFixed(2)}×</b></div>
          <input type="range" class="cr-range" id="cr-face-range" min="0.9" max="1.12" step="0.01" value="${s.faceWidth}" />
        </div>

        <!-- Hair Style -->
        <div class="cr-field is-full">
          <div class="cr-field-head"><span>${t('Hair Style')}</span><b>${t(HAIR_STYLES.find(h => h.id === s.hair)?.label || s.hair)}</b></div>
          <div class="cr-opt-wrap" id="cr-hair-styles">
            ${HAIR_STYLES.map(h => `
              <button type="button" class="cr-opt-btn ${s.hair === h.id ? 'is-selected' : ''}" data-hair="${h.id}">${t(h.label)}</button>
            `).join('')}
            <button type="button" class="cr-opt-btn ${s.ponytail ? 'is-selected' : ''}" id="cr-ponytail-btn">${t('Ponytail: {state}', { state: s.ponytail ? t('ON') : t('OFF') })}</button>
            <button type="button" class="cr-opt-btn ${s.topknot ? 'is-selected' : ''}" id="cr-topknot-btn">${t('Topknot: {state}', { state: s.topknot ? t('ON') : t('OFF') })}</button>
          </div>
          ${s.hair === 'Hair_Long' ? `
            <div style="display:flex;align-items:center;gap:10px;margin-top:6px;flex-wrap:wrap">
              <button type="button" class="cr-opt-btn ${!s.hairCutEnabled ? 'is-selected' : ''}" id="cr-haircut-full">${t('Full Long')}</button>
              <button type="button" class="cr-opt-btn ${s.hairCutEnabled ? 'is-selected' : ''}" id="cr-haircut-bob">${t('Bob Cut')}</button>
              <input type="range" class="cr-range" id="cr-haircut-range" min="1.47" max="1.62" step="0.01" value="${s.hairCutEnabled ? s.hairCut : 1.47}" style="flex:1;min-width:120px" />
              <span class="pl-meta-pill" id="cr-haircut-val">${s.hairCutEnabled ? t('Cut {cut}m', { cut: s.hairCut.toFixed(2) }) : t('Full Long')}</span>
            </div>
          ` : ''}
        </div>

        <!-- Hair Color -->
        <div class="cr-field">
          <div class="cr-field-head"><span>${t('Hair Color')}</span><b>${s.hairColor.toUpperCase()}</b></div>
          <div class="cr-swatches" id="cr-hair-swatches">
            ${HAIR_PRESETS.map(([hex, label]) => `
              <button type="button" class="cr-swatch ${s.hairColor.toLowerCase() === hex.toLowerCase() ? 'is-selected' : ''}" style="background:${hex}" data-hex="${hex}" title="${t(label)}"></button>
            `).join('')}
            <input type="color" class="cr-color-input" id="cr-hair-picker" value="${s.hairColor}" title="${t('Custom hair color')}" />
          </div>
        </div>

        <!-- Beard & Beard Color -->
        <div class="cr-field">
          <div class="cr-field-head"><span>${t('Beard')}</span><b>${t(BEARD_STYLES.find(b => b.id === s.beard)?.label || s.beard).toUpperCase()}</b></div>
          <div class="cr-opt-wrap" id="cr-beard-styles">
            ${BEARD_STYLES.map(b => `
              <button type="button" class="cr-opt-btn ${s.beard === b.id ? 'is-selected' : ''}" data-beard="${b.id}">${t(b.label)}</button>
            `).join('')}
          </div>
          <div class="cr-swatches" id="cr-beard-swatches" style="margin-top:4px">
            ${HAIR_PRESETS.map(([hex, label]) => `
              <button type="button" class="cr-swatch ${s.beardColor.toLowerCase() === hex.toLowerCase() ? 'is-selected' : ''}" style="background:${hex}" data-hex="${hex}" title="${t(label)}"></button>
            `).join('')}
            <input type="color" class="cr-color-input" id="cr-beard-picker" value="${s.beardColor}" title="${t('Custom beard color')}" />
          </div>
        </div>

        <!-- Glasses & Makeup -->
        <div class="cr-field">
          <div class="cr-field-head"><span>${t('Glasses & Makeup')}</span></div>
          <div class="cr-opt-wrap">
            <button type="button" class="cr-opt-btn ${!s.glassesOn ? 'is-selected' : ''}" id="cr-glasses-off">${t('No Glasses')}</button>
            <button type="button" class="cr-opt-btn ${s.glassesOn ? 'is-selected' : ''}" id="cr-glasses-on">${t('Glasses')}</button>
            <button type="button" class="cr-opt-btn ${s.makeup ? 'is-selected' : ''}" id="cr-makeup-btn">${t('Makeup: {state}', { state: s.makeup ? t('ON') : t('OFF') })}</button>
          </div>
          ${s.glassesOn ? `
            <div class="cr-swatches" id="cr-glasses-swatches" style="margin-top:4px">
              ${ACCENT_PRESETS.map(hex => `
                <button type="button" class="cr-swatch ${s.glassesColor.toLowerCase() === hex.toLowerCase() ? 'is-selected' : ''}" style="background:${hex}" data-hex="${hex}"></button>
              `).join('')}
              <input type="color" class="cr-color-input" id="cr-glasses-picker" value="${s.glassesColor}" title="${t('Glasses frame color')}" />
            </div>
          ` : ''}
        </div>

        <!-- Headwear -->
        <div class="cr-field">
          <div class="cr-field-head"><span>${t('Headwear')}</span><b>${s.headwearType === 'none' ? t('NONE') : s.headwearType === 'headband' ? t('HEADBAND') : t('VISOR')}</b></div>
          <div class="cr-opt-wrap" id="cr-hw-types">
            <button type="button" class="cr-opt-btn ${s.headwearType === 'none' ? 'is-selected' : ''}" data-hw="none">${t('None')}</button>
            <button type="button" class="cr-opt-btn ${s.headwearType === 'headband' ? 'is-selected' : ''}" data-hw="headband">${t('Headband')}</button>
            <button type="button" class="cr-opt-btn ${s.headwearType === 'visor' ? 'is-selected' : ''}" data-hw="visor">${t('Visor')}</button>
          </div>
          ${s.headwearType !== 'none' ? `
            <div class="cr-swatches" id="cr-hw-swatches" style="margin-top:4px">
              ${ACCENT_PRESETS.map(hex => `
                <button type="button" class="cr-swatch ${s.headwearColor.toLowerCase() === hex.toLowerCase() ? 'is-selected' : ''}" style="background:${hex}" data-hex="${hex}"></button>
              `).join('')}
              <input type="color" class="cr-color-input" id="cr-hw-picker" value="${s.headwearColor}" title="${t('Headwear color')}" />
            </div>
          ` : ''}
        </div>
      </div>
    </div>

    <div class="cr-foot">
      <div class="cr-foot-row">
        <span class="cr-sub">${isEdit ? t('Look edits are free and never alter your stats.') : t('Template: {name}', { name: creatorTemplate?.name || '' })}</span>
        <button type="button" class="cr-btn cr-btn-acc" id="cr-create-submit" ${validName ? '' : 'disabled'}>${isEdit ? t('Save Look') : t('Create')}</button>
      </div>
      <div class="cr-storage-note">${escapeHtml(t(STORAGE_NOTICE))}</div>
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
        if (hairCutVal) hairCutVal.textContent = t('Full Long');
      } else {
        s.hairCutEnabled = true;
        s.hairCut = v;
        if (hairCutVal) hairCutVal.textContent = t('Cut {cut}m', { cut: s.hairCut.toFixed(2) });
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
      flashMsg = { type: 'ok', text: t('Appearance updated.') };
      showScreen('profile');
    } else {
      pendingLook = look;
      lvl = { mode: 'choose', answers: [null, null, null, null, null], input: '', error: '', start: null };
      flashMsg = null;
      showScreen('levelstart');
    }
  };
}

// 2b. Level start (new career only): questionnaire, Playtomic level or skip
const LEVEL_QUESTIONS = [
  [N_('How long have you played padel?'), [N_('Never / just started'), N_('Under a year'), N_('1 to 3 years'), N_('Over 3 years')]],
  [N_('How do you use the back glass?'), [N_('I avoid it'), N_('I let the ball bounce off it'), N_('I play most balls off the glass'), N_('I use it for tactics and attack')]],
  [N_('Bandeja and víbora?'), [N_('What are those?'), N_('I know them but rarely hit them'), N_('I hit them fairly often'), N_('Reliable weapons')]],
  [N_('Holding the net?'), [N_('I stay at the back'), N_('I go up when I can'), N_('I win the net most points'), N_('I dominate the net')]],
  [N_('Tournaments?'), [N_('Never'), N_('Friendly events'), N_('Club or local tournaments'), N_('Regional or national')]],
];

function renderLevelStartScreen() {
  if (!pendingLook) { showScreen('templates'); return; }
  const tpl = creatorTemplate || characters[0];
  const pl = { ...tpl, ...pendingLook, id: 'me' };
  setCareerPreview(pl, rackets[0], buildLeftPanelHtml(pl, START_STATS, null), t('YOUR LEVEL'));

  let body = '';
  if (lvl.mode === 'choose') {
    body = `
      <div class="cr-lvl-choices">
        <button type="button" class="pl-card cr-lvl-choice" id="cr-lvl-quiz"><div class="pl-card-title">${t('Answer 5 quick questions')}</div><div class="pl-card-sub">${t('We estimate your level (up to 4.00).')}</div></button>
        <button type="button" class="pl-card cr-lvl-choice" id="cr-lvl-ptm"><div class="pl-card-title">${t('I have a Playtomic level')}</div><div class="pl-card-sub">${t('Type the level shown in the app.')}</div></button>
        <button type="button" class="pl-card cr-lvl-choice" id="cr-lvl-skip"><div class="pl-card-title">${t('Skip — start at 1.50')}</div><div class="pl-card-sub">${t('Climb from Club level.')}</div></button>
      </div>`;
  } else if (lvl.mode === 'quiz') {
    body = LEVEL_QUESTIONS.map(([q, opts], qi) => `
      <div class="cr-lvl-q"><div class="pl-section-label">${qi + 1}. ${escapeHtml(t(q))}</div>
        <div class="pl-seg-row">${opts.map((o, oi) => `<button type="button" class="pl-seg-btn ${lvl.answers[qi] === oi ? 'is-selected' : ''}" data-q="${qi}" data-a="${oi}">${escapeHtml(t(o))}</button>`).join('')}</div>
      </div>`).join('') + `
      <div class="cr-lvl-actions"><button type="button" class="cr-btn cr-btn-acc" id="cr-lvl-quiz-go" ${lvl.answers.includes(null) ? 'disabled' : ''}>${t('See my level')}</button></div>`;
  } else if (lvl.mode === 'playtomic') {
    body = `
      <div class="cr-lvl-ptm">
        <div class="cr-sub">${t("We can't read your Playtomic account; type the level shown in the app.")}</div>
        <input type="text" inputmode="decimal" id="cr-lvl-input" class="cr-lvl-input" placeholder="${t('e.g. 2.75')}" maxlength="6" value="${escapeHtml(lvl.input)}" autocomplete="off" />
        ${lvl.error ? `<div class="cr-card-error" role="alert">${escapeHtml(lvl.error)}</div>` : ''}
        <div class="cr-lvl-actions"><button type="button" class="cr-btn cr-btn-acc" id="cr-lvl-ptm-go">${t('Use this level')}</button></div>
      </div>`;
  } else {
    const st = lvl.start, bonus = startCredits(st.level);
    body = `
      <div class="cr-lvl-result">
        <div class="cr-lvl-big">${t('Level {level} · {tier}', { level: st.level.toFixed(2), tier: t(tierAt(st.level).name) })}</div>
        ${bonus > 0 ? `<div class="cr-sub">${t('Starting bonus: {bonus} Credits', { bonus })}</div>` : ''}
        <div class="cr-sub">${escapeHtml(t(LEVEL_NOTE))}</div>
        <div class="cr-lvl-actions"><button type="button" class="cr-btn cr-btn-acc" id="cr-lvl-continue">${t('Continue')}</button></div>
      </div>`;
  }

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${t("NEW CAREER · <span>WHAT'S YOUR PADEL LEVEL?</span>")}</h2>
        <div class="cr-sub">${t('Sets your starting level, tier and bonus Credits. It keeps changing as you play.')}</div>
      </div>
      <div class="cr-banner-actions"><button type="button" class="cr-btn" id="cr-lvl-back">${t('← Back')}</button></div>
    </div>
    <div class="cr-body">${body}</div>
  `;
  wireBannerButtons();
  const q = (sel) => careerPanel.querySelector(sel);
  const go = (mode, start = null) => { lvl.mode = mode; lvl.start = start; lvl.error = ''; renderLevelStartScreen(); };
  q('#cr-lvl-back').onclick = goBack;
  if (q('#cr-lvl-quiz')) {
    q('#cr-lvl-quiz').onclick = () => go('quiz');
    q('#cr-lvl-ptm').onclick = () => go('playtomic');
    q('#cr-lvl-skip').onclick = () => go('result', { level: 1.5, reliability: 0.2 });
  }
  careerPanel.querySelectorAll('[data-q]').forEach(b => {
    b.onclick = () => { lvl.answers[+b.dataset.q] = +b.dataset.a; renderLevelStartScreen(); q(`[data-q="${b.dataset.q}"][data-a="${b.dataset.a}"]`)?.focus(); };
  });
  if (q('#cr-lvl-quiz-go')) q('#cr-lvl-quiz-go').onclick = () => go('result', { level: questionnaireLevel(lvl.answers), reliability: 0.25 });
  const input = q('#cr-lvl-input');
  if (input) {
    input.oninput = () => { lvl.input = input.value; };
    q('#cr-lvl-ptm-go').onclick = () => {
      const st = playtomicStart(lvl.input);
      if (st) go('result', st);
      else { lvl.error = t('Enter a level between 0.5 and 7, like 2.75.'); renderLevelStartScreen(); q('#cr-lvl-input')?.focus(); }
    };
  }
  if (q('#cr-lvl-continue')) q('#cr-lvl-continue').onclick = () => {
    const created = newProfile(creatorTemplate || characters[0], pendingLook, lvl.start);
    track('career-create');
    created.player = cleanCharacterLook(created.player);
    persistProfile(created);
    pendingLook = null;
    flashMsg = null;
    showScreen('hub');
  };
  (q('#cr-lvl-continue') || q('#cr-lvl-quiz') || q('.pl-seg-btn.is-selected') || q('.pl-seg-btn') || input)?.focus();
}

// 3. Career Hub
// soft nudges back to play: rusty form, tournament points about to drop out (spec §7)
function hubHintsHtml() {
  const f = formNow(profile, eco), soon = expiringSoon(profile, eco);
  return (f < 0 ? `<div class="cr-banner" role="status"><span>🏃 ${t('Form: {form} — play a match to shake off the rust.', { form: formText(profile) })}</span></div>` : '')
    + (soon > 0 ? `<div class="cr-banner" role="status"><span>⏳ ${t('Points expiring in 7 days: {soon} — play a tournament to keep your rank.', { soon })}</span></div>` : '')
    + (needsRestock(profile) ? `<div class="cr-banner" role="status"><span>🎒 ${t('Your bag is running low.')}</span>${restockBtn()}</div>` : '');
}

function renderHubScreen() {
  if (!profile) {
    showScreen('templates');
    return;
  }
  const fresh = expirePoints(profile, eco);  // a tab left open past the 90-day mark
  if (fresh !== profile) persistProfile(fresh);
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
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), t('CAREER HUB'));

  const h = profile.history || { played: 0, won: 0, pointsWon: 0 };

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    ${hubHintsHtml()}
    <div class="cr-profile-banner">
      <div class="cr-prof-id">
        <span class="cr-prof-flag">${countryFlag(pl.countryCode)}</span>
        <div>
          <div class="cr-prof-name" lang="en">${escapeHtml(pl.name)}</div>
          <div class="cr-prof-rank">${t('World rank: #{rank} · {level} · {rel}% reliability · Record: {won}W – {lost}L ({played} played)', { rank: myWorldRank(profile), level: levelText(profile), rel: relPct(profile), won: h.won, lost: Math.max(0, h.played - h.won), played: h.played })}</div>
        </div>
      </div>
      <div class="cr-currencies">
        <div class="cr-curr-box">
          <span class="cr-curr-label">${t('Credits')}</span>
          <span class="cr-curr-val tabular">${profile.credits}</span>
        </div>
        <div class="cr-curr-box is-rp">
          <span class="cr-curr-label">${t('Ranking points')}</span>
          <span class="cr-curr-val tabular">${profile.rankingPoints}</span>
        </div>
        <div class="cr-curr-box is-wr">
          <span class="cr-curr-label">${t('World rank')}</span>
          <span class="cr-curr-val tabular">#${myWorldRank(profile)}</span>
        </div>
      </div>
    </div>

    <div class="cr-body">
      <div class="cr-hub-grid">
        <button type="button" class="pl-card cr-hub-card is-primary" id="cr-hub-play">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">${t('🎾 Play')}</div>
            <span class="pl-meta-pill" style="color:var(--acc);border-color:var(--acc)">${t('1 Set · Career')}</span>
          </div>
          <div class="pl-card-sub">${t('Play Singles or Doubles against AI to earn Credits.')}</div>
        </button>

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-tournaments">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">${t('🏆 Tournaments')}</div>
            <span class="pl-meta-pill">${profile.tournament ? t('In progress') : t('Circuit')}</span>
          </div>
          <div class="pl-card-sub">${t('Americano, Mexicano, Knockout & League ladder.')}</div>
        </button>

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-online">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">${t('🌐 Play Online')}</div>
            <span class="pl-meta-pill">${t('×{mult} Credits', { mult: eco.mult.online ?? 1 })}</span>
          </div>
          <div class="pl-card-sub">${t('Join a public room, create one, or enter a room code.')}</div>
        </button>

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-training">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">${t('💪 Training')}</div>
            <span class="pl-meta-pill">${t('6 Stats · Max 10')}</span>
          </div>
          <div class="pl-card-sub">${t('Spend Credits to upgrade your 6 player attributes.')}</div>
        </button>

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-shop">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">${t('🛒 Shop')}</div>
            <span class="pl-meta-pill">${t('{tier} Tier', { tier: t(tierAt(profile.level).name) })}</span>
          </div>
          <div class="pl-card-sub">${t('Unlock pro rackets, shoes, kits, headwear & match balls.')}</div>
        </button>

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-locker">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">${t('🎒 Locker')}</div>
            <span class="pl-meta-pill">${t('{count} Owned', { count: profile.inventory.length })}</span>
          </div>
          <div class="pl-card-sub">${t('Equip your owned rackets, shoes, kit, headwear and ball.')}</div>
        </button>

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-ranking">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">${t('🌍 Ranking')}</div>
            <span class="pl-meta-pill">#${myWorldRank(profile)}</span>
          </div>
          <div class="pl-card-sub">${t('World Padel Tour standings and tier milestones.')}</div>
        </button>

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-profile">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">${t('👤 Profile')}</div>
            <span class="pl-meta-pill">${t('Look & Save')}</span>
          </div>
          <div class="pl-card-sub">${t('Edit appearance for free, export/import backup, or reset.')}</div>
        </button>

        <button type="button" class="pl-card cr-hub-card" id="cr-hub-back">
          <div class="cr-hub-card-top">
            <div class="pl-card-title">${t('← Back to menu')}</div>
          </div>
          <div class="pl-card-sub">${t('Exit Career and return to Quick Match menu.')}</div>
        </button>
      </div>
    </div>
  `;

  wireBannerButtons();
  careerPanel.querySelector('#cr-hub-play').onclick = () => { flashMsg = null; showScreen('play'); };
  careerPanel.querySelector('#cr-hub-tournaments').onclick = () => { flashMsg = null; showScreen(profile.tournament ? 'tournament' : 'tournaments'); };
  careerPanel.querySelector('#cr-hub-ranking').onclick = () => { flashMsg = null; showScreen('ranking'); };
  careerPanel.querySelector('#cr-hub-online').onclick = () => { track('online-click'); flashMsg = null; onlineState.status = ''; onlineState.lobby = null; showScreen('online'); };
  careerPanel.querySelector('#cr-hub-training').onclick = () => { flashMsg = null; showScreen('training'); };
  wireRestock();
  careerPanel.querySelector('#cr-hub-shop').onclick = () => { flashMsg = null; shopErrors = {}; showScreen('shop'); };
  careerPanel.querySelector('#cr-hub-locker').onclick = () => { flashMsg = null; showScreen('locker'); };
  careerPanel.querySelector('#cr-hub-profile').onclick = () => { flashMsg = null; showScreen('profile'); };
  careerPanel.querySelector('#cr-hub-back').onclick = () => closeCareer();
}

// Filter out the player's template character and any AI with the same name so the player never partners or plays against a clone of themselves
function availablePartners(prof = profile) {
  const tid = prof?.player?.templateId;
  const pname = prof?.player?.name;
  return characters.filter(c => (!tid || c.id !== tid) && (!pname || c.name !== pname));
}

// 4. Career Play Screen
function renderPlayScreen() {
  if (!profile) { showScreen('templates'); return; }
  const pl = buildEquippedPlayer(profile);
  const rk = equippedRacket(profile);
  const shoeItem = equippedShoes(profile);
  const ballItem = equippedBall(profile);
  const kitItem = equippedKit(profile);
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), t('CAREER MATCH'));

  const curVenue = venues[playState.venueIdx] || venues[0];
  const partnerList = availablePartners(profile);
  if (playState.partnerIdx >= partnerList.length) playState.partnerIdx = 0;
  const curPartner = partnerList[playState.partnerIdx] || partnerList[0] || characters[0];
  const mult = eco.mult[playState.ai] ?? 1;

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${t('CAREER · <span>PLAY MATCH</span>')}</h2>
        <div class="cr-sub">${t('Format: 1 Set (to 6 games) · Golden Point · Equipped: {racket} · {shoes} · {ball} · {kit}', { racket: rk.name, shoes: shoeItem.name, ball: ballItem.name, kit: kitItem.name })}</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-play-locker">🎒 ${t('Locker')}</button>
        <button type="button" class="cr-btn" id="cr-play-back">${t('← Back to Hub')}</button>
      </div>
    </div>

    <div class="cr-body">
      <div class="pl-section-label">${t('MATCH MODE')}</div>
      <div class="pl-seg-row" id="cr-play-mode">
        <button type="button" class="pl-seg-btn ${playState.players === 4 ? 'is-selected' : ''}" data-players="4">${t('Doubles (2v2)')}</button>
        <button type="button" class="pl-seg-btn ${playState.players === 2 ? 'is-selected' : ''}" data-players="2">${t('Singles (1v1)')}</button>
      </div>

      <div class="pl-section-label">${t('AI LEVEL & REWARD MULTIPLIER')}</div>
      <div class="pl-seg-row" id="cr-play-ai">
        ${AI_LEVELS.map(lv => `
          <button type="button" class="pl-seg-btn ${playState.ai === lv.id ? 'is-selected' : ''}" data-ai="${lv.id}">
            ${t(lv.label)} ${lv.stars} (×${eco.mult[lv.id]})${lv.id === tierAt(profile.level ?? 1.5).ai ? ` <span class="cr-rec">${t('Recommended')}</span>` : ''}
          </button>
        `).join('')}
      </div>

      ${playState.players === 4 ? `
        <div class="pl-section-label">${t('CHOOSE PARTNER')} (${countryFlag(curPartner.countryCode)} ${escapeHtml(curPartner.name)})</div>
        <div class="cr-partner-grid" id="cr-partner-grid">
          ${partnerList.map((c, idx) => `
            <button type="button" class="pl-card cr-partner-card ${idx === playState.partnerIdx ? 'is-selected' : ''}" data-pidx="${idx}">
              <span>${countryFlag(c.countryCode)}</span>
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c.name)}</span>
              <span class="pl-check">✓</span>
            </button>
          `).join('')}
        </div>
      ` : ''}

      <div class="pl-section-label">${t('VENUE')} (${escapeHtml(curVenue.name)})</div>
      <div class="pl-venue-grid" id="cr-play-venues"></div>
    </div>

    <div class="cr-foot">
      <div class="cr-foot-row">
        <div class="pl-summary">
          ${playState.players === 2 ? t('Singles') : t('Doubles (w/ {partner})', { partner: curPartner.name })} · ${t('AI: {ai} (×{mult})', { ai: playState.ai.toUpperCase(), mult })} · ${curVenue.name} · ${t('1 Set · Golden Point')}
        </div>
        <button type="button" class="pl-start-btn" id="cr-play-start">${t('START MATCH')}</button>
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
    const tod = v.timeOfDay === 'sunset' ? t('Sunset') : v.timeOfDay === 'night' ? t('Night') : t('Day');
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

// a new career's stats (career.js newProfile): shown on the template, creator and level screens
const START_STATS = { speed: 5, power: 5, control: 5, volley: 5, smash: 5, stamina: 5 };

// career AI opponents and partners play at their difficulty: same stat shape, average 5/6/7/8 (level.js scaleStats)
const scaledAI = (c, ai) => ({ ...c, stats: scaleStats(c.stats, ai) });

// rate the finished career match (spec §4.2): mates / opps = the other players' levels (null = unknown online player)
function withRating(p, result, mates, opps) {
  const avg = (ls) => ls.reduce((a, b) => a + (b ?? 2.5), 0) / ls.length;
  const r = applyRating(p, avg([p.level, ...mates]), avg(opps), result, new Date(), eco.tierUp, eco.tierUpBag);
  return { ...r.profile, lastReward: { ...p.lastReward, level: { from: p.level, to: r.profile.level, delta: r.delta, tierUp: r.tierUp?.name || null, bonus: r.bonus } } };
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

  const partnerList = availablePartners(profile);
  const partner = partnerList[playState.partnerIdx] || partnerList[0] || characters[0];
  const oppPool = partnerList.filter(c => (players === 4 ? c !== partner : true)).slice().sort(() => Math.random() - 0.5);

  const roster = {};
  const rk = {};
  roster[0] = me;
  rk[0] = myRacket;

  const ai = playState.ai;
  if (players === 2) {
    roster[2] = scaledAI(oppPool[0] || characters[0], ai);
    rk[2] = rackets[Math.floor(Math.random() * rackets.length)];
  } else {
    roster[1] = scaledAI(partner, ai);
    rk[1] = rackets[Math.floor(Math.random() * rackets.length)];
    roster[2] = scaledAI(oppPool[0] || characters[0], ai);
    rk[2] = rackets[Math.floor(Math.random() * rackets.length)];
    roster[3] = scaledAI(oppPool[1] || characters[1] || characters[0], ai);
    rk[3] = rackets[Math.floor(Math.random() * rackets.length)];
  }
  const lv = (id) => aiLevel(roster[id].stats, ai);
  const mates = players === 4 ? [lv(1)] : [], opps = players === 4 ? [lv(2), lv(3)] : [lv(2)];

  const venue = venues[playState.venueIdx] || venues[0];
  const startedAt = new Date();

  await startMatchFn({
    players,
    humans: 1,
    ai,
    match: { sets: 1, superTiebreak: false, goldenPoint: true, starPoint: false },
    roster,
    rackets: rk,
    shoes: { 0: { speed: shoeItem.speed, agility: shoeItem.agility } },
    ball: { speed: ballItem.speed, bounce: ballItem.bounce },
    bag: { 0: { ...profile.bag } },
    form: { 0: formNow(profile, eco) },
    venue,
    onEnd(result) {
      const { reward, profile: updated, ups } = settleMatch(profile, result, eco, startedAt);
      updated.lastReward = {
        ups, coach: result.tally && !result.forfeit ? coachTip(result.tally, updated, eco) : null,
        lines: reward.lines,
        mult: reward.mult,
        credits: reward.credits,
        won: result.won,
        ai: result.ai || ai,
        score: result.score?.sets || '',
      };
      persistProfile(withRating(updated, result, mates, opps));
    },
  });
}

// 5. Training Screen
function renderTrainingScreen() {
  if (!profile) { showScreen('templates'); return; }
  const pl = buildEquippedPlayer(profile);
  const rk = equippedRacket(profile);
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), t('TRAINING'));

  const maxLevel = eco.training.max;

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${t('CAREER · <span>TRAINING</span>')}</h2>
        <div class="cr-sub">${t('Upgrade your 6 player attributes with Credits. Each level raises on-court performance.')}</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-train-back">${t('← Back to Hub')}</button>
      </div>
    </div>

    <div class="cr-body">
      <div class="cr-train-list" id="cr-train-list">
        ${TRAINING_STATS.map(st => {
          const level = profile.stats[st.key] ?? 5, cap = statCap(profile);
          const isMax = level >= Math.min(cap, maxLevel), nextTier = TIERS.find(t => t.cap > cap);
          const cost = isMax ? 0 : trainCost(level, eco);
          const deficit = Math.max(0, cost - profile.credits);
          const canBuy = !isMax && deficit === 0;
          const pct = Math.min(100, (level / maxLevel) * 100);
          const reasonText = isMax ? (level >= maxLevel || !nextTier ? t('Maxed') : t('Reach {tier} to train beyond {cap}', { tier: t(nextTier.name), cap })) : deficit > 0 ? t('Need {deficit} more Credits', { deficit }) : '';

          return `
            <div class="cr-train-card" data-stat-card="${st.key}">
              <div class="cr-train-top">
                <div class="cr-train-title-group">
                  <span class="cr-train-name">${escapeHtml(t(st.label))}</span>
                  <span class="cr-train-lvl tabular">${level}/${Math.max(level, Math.min(cap, maxLevel))}</span>
                </div>
                <div class="cr-train-actions">
                  <span class="cr-train-cost tabular">${isMax ? (level >= maxLevel ? t('Maxed') : t('Tier cap')) : t('Next: {cost} Credits', { cost })}</span>
                  ${reasonText ? `<span class="cr-train-reason">${escapeHtml(reasonText)}</span>` : ''}
                  <button type="button" class="cr-btn cr-btn-acc cr-train-buy" data-train="${st.key}" ${canBuy ? '' : 'disabled'}>${t('Buy')}</button>
                </div>
              </div>
              <div class="pl-stat-track cr-train-track">
                <div class="pl-stat-fill" style="width:${pct}%"></div>
              </div>
              <div class="cr-train-desc">${escapeHtml(t(st.desc))}</div>
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
        track(`career-training/${statKey}`);
        persistProfile(res.profile);
        flashMsg = { type: 'ok', text: t('{stat} upgraded to {level}/{max}!', { stat: st ? t(st.label) : statKey, level: res.profile.stats[statKey], max: maxLevel }) };
        renderTrainingScreen();
      } else {
        const level = profile.stats[statKey] ?? 4;
        const cost = level >= maxLevel ? 0 : trainCost(level, eco);
        const msg = res.reason === 'max'
          ? t('Maxed')
          : res.reason === 'cap'
          ? t('Tier cap: reach {tier} to train beyond {cap}', { tier: t(TIERS.find(x => x.cap > statCap(profile))?.name || N_('the next tier')), cap: statCap(profile) })
          : res.reason === 'credits'
          ? t('Need {deficit} more Credits', { deficit: Math.max(1, cost - profile.credits) })
          : t('Cannot train this stat.');
        flashMsg = { type: 'error', text: msg };
        renderTrainingScreen();
      }
    };
  });
}

// 6. Shop Screen
// bag: drinks (water, isotonic) and food (banana, gel) each have their own limit
const DRINK_IDS = ['bag_water', 'bag_isotonic'], FOOD_IDS = ['bag_banana', 'bag_gel'];
const bagKind = (id) => DRINK_IDS.includes(id) ? 'drinks' : 'food';
const bagFill = (p, id) => {
  const ids = DRINK_IDS.includes(id) ? DRINK_IDS : FOOD_IDS;
  return `${ids.reduce((n, k) => n + (p.bag?.[k] || 0), 0)}/${bagLimit(p)}`;
};
const needsRestock = (p) => DRINK_IDS.reduce((n, k) => n + (p.bag?.[k] || 0), 0) <= 2 || FOOD_IDS.every(k => !p.bag?.[k]);
function bagSpecHtml(item) {
  return `
      <div class="cr-shop-spec">${item.upgrade ? t('Upgrade') : t('Pack of {pack} · {kind} {fill}', { pack: item.pack, kind: bagKind(item.id) === 'drinks' ? t('Drinks') : t('Food'), fill: bagFill(profile, item.id) })}</div>
      <div class="pl-card-sub">${escapeHtml(t(item.desc || ''))}</div>
    `;
}
const restockBtn = () => needsRestock(profile) ? `<button type="button" class="cr-btn cr-btn-acc" id="cr-restock">🎒 ${t('Restock')}</button>` : '';
const wireRestock = () => {
  const b = careerPanel.querySelector('#cr-restock');
  if (b) b.onclick = () => { shopTab = 'bag'; flashMsg = null; shopErrors = {}; showScreen('shop'); };
};

function renderShopItemSpecHtml(item, tabId) {
  if (tabId === 'racket') {
    return `
      <div class="cr-shop-spec">${escapeHtml(item.core)} · ${escapeHtml(item.face)} · ${escapeHtml(item.shape)} · ${item.weightG} g</div>
      <div class="pl-racket-stats">
        <div class="pl-rstat"><span>${t('Power')}</span><div class="pl-bar"><i style="width:${item.stats.power * 10}%"></i></div><b>${item.stats.power}</b></div>
        <div class="pl-rstat"><span>${t('Control')}</span><div class="pl-bar"><i style="width:${item.stats.control * 10}%"></i></div><b>${item.stats.control}</b></div>
        <div class="pl-rstat"><span>${t('Spin')}</span><div class="pl-bar"><i style="width:${item.stats.spin * 10}%"></i></div><b>${item.stats.spin}</b></div>
        <div class="pl-rstat"><span>${t('Sweet Spot')}</span><div class="pl-bar"><i style="width:${item.stats.sweetSpot * 10}%"></i></div><b>${item.stats.sweetSpot}</b></div>
      </div>
    `;
  }
  if (tabId === 'shoes') {
    const spdPct = Math.round((item.speed || 0) * 100);
    const agiVal = Math.round((item.agility || 0) * 100);
    return `
      <div class="cr-kit-swatches">
        <span class="cr-kit-chip"><i style="background:${item.color}"></i>${t('Shoe color')}</span>
      </div>
      <div class="cr-shop-spec">${t('+{spd}% speed · agility {agi}', { spd: spdPct, agi: agiVal })}</div>
    `;
  }
  if (tabId === 'ball') {
    return `
      <div class="cr-kit-swatches">
        <span class="cr-kit-chip"><i style="background:#d8f53a"></i>${t('Match ball')}</span>
      </div>
      <div class="cr-shop-spec">${t('Speed ×{speed} · Bounce ×{bounce}', { speed: item.speed, bounce: item.bounce })}</div>
    `;
  }
  if (tabId === 'kit') {
    const styleName = { crew: t('Crew neck'), polo: t('Polo'), vneck: t('V-neck'), tank: t('Tank top') }[item.style || 'crew'] || t('Crew neck');
    const patternName = { none: t('Solid'), chest: t('Chest stripe'), sash: t('Diagonal sash'), side: t('Side panels'), stripes: t('Vertical stripes'), split: t('Split halves') }[item.pattern || 'none'] || t('Solid');
    const label = t('{style} · {pattern}', { style: styleName, pattern: patternName.toLowerCase() });
    return `
      <div class="cr-kit-swatches">
        <span class="cr-kit-chip"><i style="background:${item.shirt}"></i>${t('Shirt')}</span>
        <span class="cr-kit-chip"><i style="background:${item.shorts}"></i>${t('Shorts')}</span>
        <span class="cr-kit-chip"><i style="background:${item.shoes}"></i>${t('Shoes')}</span>
        ${item.accent ? `<span class="cr-kit-chip"><i style="background:${item.accent}"></i>${t('Accent')}</span>` : ''}
      </div>
      <div class="cr-shop-spec">${escapeHtml(label)}</div>
    `;
  }
  if (tabId === 'bag') return bagSpecHtml(item);
  if (tabId === 'headwear') {
    const hw = item.headwear || { type: 'headband', color: '#ffffff' };
    return `
      <div class="cr-kit-swatches">
        <span class="cr-kit-chip"><i style="background:${hw.color}"></i>${hw.type === 'visor' ? t('Visor') : t('Headband')}</span>
      </div>
      <div class="cr-shop-spec">${t('{type} · {color}', { type: hw.type === 'visor' ? t('Sun Visor') : t('Sweat Headband'), color: hw.color })}</div>
    `;
  }
  return '';
}

function renderShopScreen() {
  if (!profile) { showScreen('templates'); return; }
  const pl = buildEquippedPlayer(profile);
  const rk = equippedRacket(profile);
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), t('PRO SHOP'));

  const items = shopTab === 'racket'
    ? rackets
    : shop.items.filter(it => it.type === shopTab);

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${t('CAREER · <span>SHOP</span>')}</h2>
        <div class="cr-sub">${t('Unlock pro rackets, court shoes, match balls, kits, headwear and energy products.')}</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-shop-locker">🎒 ${t('Locker')}</button>
        <button type="button" class="cr-btn" id="cr-shop-back">${t('← Back to Hub')}</button>
      </div>
    </div>

    <div class="pl-tabs cr-shop-tabs" id="cr-shop-tabs" role="tablist">
      ${SHOP_TABS.map(tab => `
        <button type="button" class="pl-tab ${shopTab === tab.id ? 'is-active' : ''}" data-shop-tab="${tab.id}">
          ${escapeHtml(t(tab.label))}
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
    const stack = item.type === 'bag' && !item.upgrade, left = stack ? (profile.bag?.[item.id] || 0) : 0;  // bag consumables stack
    const isOwned = stack ? left > 0 : profile.inventory.includes(item.id);
    const room = stack ? Math.min(item.pack, bagRoom(profile, item)) : 0;
    const price = stack && room ? Math.ceil(item.price * room / item.pack) : item.price;
    const isEquipped = profile.equipped?.[shopTab] === item.id;
    const minTier = shop.tiers[item.tier] ?? 0;
    const tierName = t(tierByIndex(minTier).name);
    const isTierLocked = (profile.bestTier || 1) < minTier;
    const canAfford = profile.credits >= price;
    const errText = shopErrors[item.id] || '';
    const itemName = shopTab === 'racket' ? item.name : t(item.name);

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
            <div class="pl-card-title" lang="en">${escapeHtml(itemName)}</div>
            <div class="cr-badges">
              ${isOwned ? `<span class="cr-badge is-owned">${stack ? t('In bag ×{left}', { left }) : t('Owned')}</span>` : ''}
              ${isEquipped ? `<span class="cr-badge is-equipped">${t('Equipped')}</span>` : ''}
            </div>
          </div>
          <div class="cr-shop-meta-row">
            <span class="cr-shop-price tabular">${item.price} ${t('Credits')}${stack ? ` / ${item.pack}` : ''}</span>
            <span class="cr-tier-pill ${isTierLocked ? 'is-locked' : ''}">
              ${minTier > 1 ? t('Unlocks at {tier}', { tier: tierName }) : t('Available to everyone')}
            </span>
          </div>
        </div>
      </div>

      ${renderShopItemSpecHtml(item, shopTab)}

      ${errText ? `<div class="cr-card-error" role="alert">${escapeHtml(errText)}</div>` : ''}

      <div class="cr-shop-foot">
        <button type="button" class="cr-btn ${(stack ? room : !isOwned) && !isTierLocked && canAfford ? 'cr-btn-acc' : 'cr-btn-muted'} cr-shop-buy" data-buy="${item.id}">
          ${stack ? (!room ? t('Bag full') : room < item.pack ? t('Buy {room} · {price} Credits', { room, price }) : t('Buy {pack}', { pack: item.pack })) : isOwned && item.upgrade ? t('Owned') : t('Buy')}
        </button>
        ${isOwned && !isEquipped && !item.type?.startsWith('bag') ? `<button type="button" class="cr-btn cr-shop-equip" data-equip-shop="${item.id}">${t('Equip')}</button>` : ''}
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
        track(`career-shop-buy/${item.type || 'racket'}`);
        delete shopErrors[item.id];
        persistProfile(res.profile);
        flashMsg = { type: 'ok', text: t('Purchased {name}!', { name: itemName }) };
        renderShopScreen();
      } else {
        let msg = t('Cannot purchase item.');
        if (res.reason === 'owned') {
          msg = t('Already owned.');
        } else if (res.reason === 'tier') {
          msg = t('Locked: Unlocks at {tier}', { tier: tierName });
        } else if (res.reason === 'credits') {
          msg = t('Not enough Credits: Need {deficit} more Credits', { deficit: Math.max(1, price - profile.credits) });
        } else if (res.reason === 'bagfull') {
          msg = t('Bag full: {fill} {kind}', { fill: bagFill(profile, item.id), kind: bagKind(item.id) === 'drinks' ? t('drinks') : t('food') });
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
        flashMsg = { type: 'ok', text: t('Equipped {name}.', { name: itemName }) };
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
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), t('LOCKER'));

  const ownedRackets = rackets.filter(r => profile.inventory.includes(r.id));
  const ownedShoes = shop.items.filter(i => i.type === 'shoes' && profile.inventory.includes(i.id));
  const ownedBalls = shop.items.filter(i => i.type === 'ball' && profile.inventory.includes(i.id));
  const ownedKits = shop.items.filter(i => i.type === 'kit' && profile.inventory.includes(i.id));
  const ownedHeadwear = shop.items.filter(i => i.type === 'headwear' && profile.inventory.includes(i.id));
  const bagItems = shop.items.filter(i => i.type === 'bag' && !i.upgrade);

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${t('CAREER · <span>LOCKER</span>')}</h2>
        <div class="cr-sub">${t('Select from your owned equipment per slot. The 3D preview updates immediately.')}</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-locker-shop">🎒 ${t('Shop')}</button>
        <button type="button" class="cr-btn" id="cr-locker-back">${t('← Back to Hub')}</button>
      </div>
    </div>

    <div class="cr-body">
      <div class="pl-section-label">${t('RACKET ({count} OWNED)', { count: ownedRackets.length })}</div>
      <div class="cr-locker-grid" id="cr-locker-racket">
        ${ownedRackets.map(r => {
          const isEq = profile.equipped?.racket === r.id;
          return `
            <button type="button" class="pl-card cr-locker-card ${isEq ? 'is-selected' : ''}" data-slot="racket" data-id="${r.id}">
              <div class="cr-locker-card-head">
                <span class="cr-swatch-dot" style="background:${r.color}"></span>
                <div class="pl-card-title" lang="en">${escapeHtml(r.name)}</div>
                ${isEq ? `<span class="cr-badge is-equipped">${t('Equipped')}</span>` : `<span class="cr-badge is-owned">${t('Owned')}</span>`}
              </div>
              <div class="cr-shop-spec">${escapeHtml(r.core)} · ${escapeHtml(r.face)} · ${escapeHtml(r.shape)} · ${r.weightG} g</div>
              <div class="pl-card-sub">P${r.stats.power} · C${r.stats.control} · Spin ${r.stats.spin} · Sweet ${r.stats.sweetSpot}</div>
              <span class="pl-check">✓</span>
            </button>
          `;
        }).join('')}
      </div>

      <div class="pl-section-label">${t('SHOES ({count} OWNED)', { count: ownedShoes.length })}</div>
      <div class="cr-locker-grid" id="cr-locker-shoes">
        ${ownedShoes.map(s => {
          const isEq = profile.equipped?.shoes === s.id;
          return `
            <button type="button" class="pl-card cr-locker-card ${isEq ? 'is-selected' : ''}" data-slot="shoes" data-id="${s.id}">
              <div class="cr-locker-card-head">
                <span class="cr-swatch-dot" style="background:${s.color}"></span>
                <div class="pl-card-title" lang="en">${escapeHtml(t(s.name))}</div>
                ${isEq ? `<span class="cr-badge is-equipped">${t('Equipped')}</span>` : `<span class="cr-badge is-owned">${t('Owned')}</span>`}
              </div>
              <div class="cr-shop-spec">${t('+{spd}% speed · agility {agi}', { spd: Math.round(s.speed * 100), agi: Math.round(s.agility * 100) })}</div>
              <span class="pl-check">✓</span>
            </button>
          `;
        }).join('')}
      </div>

      <div class="pl-section-label">${t('MATCH BALL ({count} OWNED)', { count: ownedBalls.length })}</div>
      <div class="cr-locker-grid" id="cr-locker-ball">
        ${ownedBalls.map(b => {
          const isEq = profile.equipped?.ball === b.id;
          return `
            <button type="button" class="pl-card cr-locker-card ${isEq ? 'is-selected' : ''}" data-slot="ball" data-id="${b.id}">
              <div class="cr-locker-card-head">
                <span class="cr-swatch-dot" style="background:#d8f53a"></span>
                <div class="pl-card-title" lang="en">${escapeHtml(t(b.name))}</div>
                ${isEq ? `<span class="cr-badge is-equipped">${t('Equipped')}</span>` : `<span class="cr-badge is-owned">${t('Owned')}</span>`}
              </div>
              <div class="cr-shop-spec">${t('Speed ×{speed} · Bounce ×{bounce}', { speed: b.speed, bounce: b.bounce })}</div>
              <span class="pl-check">✓</span>
            </button>
          `;
        }).join('')}
      </div>

      <div class="pl-section-label">${t('KIT ({count} OWNED)', { count: ownedKits.length })}</div>
      <div class="cr-locker-grid" id="cr-locker-kit">
        ${ownedKits.map(k => {
          const isEq = profile.equipped?.kit === k.id;
          const kStyle = { crew: t('Crew neck'), polo: t('Polo'), vneck: t('V-neck'), tank: t('Tank top') }[k.style || 'crew'] || t('Crew neck');
          const kPattern = ({ none: t('Solid'), chest: t('Chest stripe'), sash: t('Diagonal sash'), side: t('Side panels'), stripes: t('Vertical stripes'), split: t('Split halves') }[k.pattern || 'none'] || t('Solid')).toLowerCase();
          return `
            <button type="button" class="pl-card cr-locker-card ${isEq ? 'is-selected' : ''}" data-slot="kit" data-id="${k.id}">
              <div class="cr-locker-card-head">
                <div class="pl-card-title" lang="en">${escapeHtml(t(k.name))}</div>
                ${isEq ? `<span class="cr-badge is-equipped">${t('Equipped')}</span>` : `<span class="cr-badge is-owned">${t('Owned')}</span>`}
              </div>
              <div class="cr-kit-swatches">
                <span class="cr-kit-chip"><i style="background:${k.shirt}"></i>${t('Shirt')}</span>
                <span class="cr-kit-chip"><i style="background:${k.shorts}"></i>${t('Shorts')}</span>
                <span class="cr-kit-chip"><i style="background:${k.shoes}"></i>${t('Shoes')}</span>
                ${k.accent ? `<span class="cr-kit-chip"><i style="background:${k.accent}"></i>${t('Accent')}</span>` : ''}
              </div>
              <div class="cr-shop-spec">${escapeHtml(t('{style} · {pattern}', { style: kStyle, pattern: kPattern }))}</div>
              <span class="pl-check">✓</span>
            </button>
          `;
        }).join('')}
      </div>

      <div class="pl-section-label">${t('HEADWEAR ({count} OWNED)', { count: ownedHeadwear.length })}</div>
      ${ownedHeadwear.length > 0 ? `
        <div class="cr-locker-grid" id="cr-locker-headwear">
          ${ownedHeadwear.map(h => {
            const isEq = profile.equipped?.headwear === h.id;
            return `
              <button type="button" class="pl-card cr-locker-card ${isEq ? 'is-selected' : ''}" data-slot="headwear" data-id="${h.id}">
                <div class="cr-locker-card-head">
                  <span class="cr-swatch-dot" style="background:${h.headwear.color}"></span>
                  <div class="pl-card-title" lang="en">${escapeHtml(t(h.name))}</div>
                  ${isEq ? `<span class="cr-badge is-equipped">${t('Equipped')}</span>` : `<span class="cr-badge is-owned">${t('Owned')}</span>`}
                </div>
                <div class="cr-shop-spec">${t('{type} · {color}', { type: h.headwear.type === 'visor' ? t('Visor') : t('Headband'), color: h.headwear.color })}</div>
                <span class="pl-check">✓</span>
              </button>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="cr-empty-slot">
          <span>${t('No headwear unlocked yet. Visit the Shop to unlock headbands and visors.')}</span>
          <button type="button" class="cr-btn" id="cr-locker-buy-hw">${t('Shop Headwear →')}</button>
        </div>
      `}

      <div class="pl-section-label">${t('BAG · DRINKS {drinks} · FOOD {food}', { drinks: bagFill(profile, 'bag_water'), food: bagFill(profile, 'bag_banana') })}</div>
      <div class="cr-empty-slot">
        <span>${bagItems.map(i => `${escapeHtml(t(i.name))} ×${profile.bag?.[i.id] || 0}`).join(' · ')}</span>
        <button type="button" class="cr-btn" id="cr-restock">${t('Restock →')}</button>
      </div>
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

  wireRestock();

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
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), r.won ? t('VICTORY') : t('MATCH COMPLETE'));

  const aiKey = r.ai || playState.ai || 'club';
  const aiName = aiKey.charAt(0).toUpperCase() + aiKey.slice(1);
  const multVal = r.mult ?? (eco.mult[aiKey] ?? 1);

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${t('MATCH <span>REWARDS</span>')}</h2>
        <div class="cr-sub">${t('Career match summary and Credits breakdown')}</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
      </div>
    </div>

    <div class="cr-body">
      <div class="cr-reward-box">
        <div class="cr-reward-head">
          <div class="cr-reward-outcome ${r.won ? '' : 'is-loss'}">${r.won ? t('🏆 WIN') : t('LOSS')}</div>
          <div class="cr-reward-score">${t('Score: {score}', { score: r.score || '—' })}</div>
        </div>

        <div class="cr-reward-lines">
          ${(r.lines || []).map(line => `
            <div class="cr-reward-row">
              <span>${escapeHtml(line.msg ? t(...line.msg) : t(line.label))}</span>
              <b class="tabular">+${line.credits}</b>
            </div>
          `).join('')}
          <div class="cr-reward-row is-mult">
            <span>${escapeHtml(t(aiName))} ×${multVal}</span>
            <b class="tabular">×${multVal}</b>
          </div>
          ${r.level ? `<div class="cr-reward-row">
            <span>${t('Level {from} → {to}', { from: r.level.from.toFixed(2), to: r.level.to.toFixed(2) })}</span>
            <b class="tabular">${r.level.delta >= 0 ? '+' : ''}${r.level.delta.toFixed(2)}</b>
          </div>` : ''}
          ${r.level?.tierUp ? `<div class="cr-reward-row is-mult"><span>${t('TIER UP: {tier}', { tier: t(r.level.tierUp) })}</span><b>⬆</b></div>` : ''}
          ${r.level?.bonus ? `<div class="cr-reward-row"><span>${t('Tier up bonus')}</span><b class="tabular">+${r.level.bonus}</b></div>` : ''}
          ${(r.ups || []).map(([k, from, to]) => `<div class="cr-reward-row is-mult"><span>📈 ${escapeHtml(t('{stat} {from} → {to} (match play)', { stat: TRAINING_STATS.find(x => x.key === k)?.label ? t(TRAINING_STATS.find(x => x.key === k).label) : k, from, to }))}</span><b>⬆</b></div>`).join('')}
        </div>

        <div class="cr-reward-total">
          <span>${t('Total Reward')}</span>
          <b class="tabular">+${r.credits + (r.level?.bonus || 0)} ${t('Credits')}</b>
        </div>

        <div class="cr-reward-balance">
          <span>${t('New Balance')}</span>
          <b class="tabular">${profile.credits} ${t('Credits')}</b>
        </div>

        ${r.coach ? `<div class="cr-reward-balance"><span>💡 ${escapeHtml(coachLine(r.coach))}</span>${r.coach.action ? `<button type="button" class="cr-btn cr-btn-acc" id="cr-coach-go">${r.coach.action.train ? t('Train') : t('Restock')}</button>` : ''}</div>` : ''}
        ${needsRestock(profile) && !r.coach?.action?.restock ? '<div class="cr-reward-balance"><span>' + t('Bag running low') + '</span>' + restockBtn() + '</div>' : ''}
        <button type="button" class="pl-start-btn" id="cr-reward-continue" style="width:100%;margin-top:4px">${t('Continue')}</button>
      </div>
    </div>
  `;

  wireBannerButtons();
  wireRestock();
  const coachBtn = careerPanel.querySelector('#cr-coach-go');
  if (coachBtn) coachBtn.onclick = () => {  // leaves the reward screen like Continue, then goes where the tip points
    const { lastReward: _removed, ...clean } = profile;
    persistProfile(clean);
    flashMsg = null;
    if (r.coach.action.train) showScreen('training'); else { shopTab = 'bag'; shopErrors = {}; showScreen('shop'); }
  };
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
  setCareerPreview(pl, rk, buildLeftPanelHtml(pl, profile.stats, profile), t('PLAYER PROFILE'));
  const h = profile.history || { played: 0, won: 0, pointsWon: 0 };

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${t('CAREER · <span>PROFILE</span>')}</h2>
        <div class="cr-sub">${t('Manage appearance, backup save file, or reset career')}</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-prof-back">${t('← Back to Hub')}</button>
      </div>
    </div>

    <div class="cr-body">
      <div class="cr-profile-banner">
        <div class="cr-prof-id">
          <span class="cr-prof-flag">${countryFlag(pl.countryCode)}</span>
          <div>
            <div class="cr-prof-name" lang="en">${escapeHtml(pl.name)}</div>
            <div class="cr-prof-rank">${t('{country} · {hand} · World rank: #{rank}', { country: pl.country || '', hand: pl.hand === 'left' ? t('Left-handed') : t('Right-handed'), rank: myWorldRank(profile) })}</div>
            <div class="cr-prof-rank">${t('{level} · {rel}% reliability', { level: levelText(profile), rel: relPct(profile) })}</div>
            <div class="cr-prof-rank">${escapeHtml(t(LEVEL_NOTE))}</div>
          </div>
        </div>
        <div class="cr-currencies">
          <div class="cr-curr-box">
            <span class="cr-curr-label">${t('Credits')}</span>
            <span class="cr-curr-val tabular">${profile.credits}</span>
          </div>
          <div class="cr-curr-box is-rp">
            <span class="cr-curr-label">${t('Ranking points')}</span>
            <span class="cr-curr-val tabular">${profile.rankingPoints}</span>
          </div>
        </div>
      </div>

      <div class="cr-form-grid">
        <div class="cr-field">
          <div class="cr-field-head"><span>${t('Matches Played')}</span><b>${h.played}</b></div>
          <div class="cr-field-head"><span>${t('Matches Won')}</span><b>${h.won}</b></div>
          <div class="cr-field-head"><span>${t('Total Points Won')}</span><b>${h.pointsWon}</b></div>
        </div>

        <div class="cr-field">
          <div class="cr-field-head"><span>${t('Appearance')}</span><b>${t('Free')}</b></div>
          <div class="pl-card-sub">${t('Customize hair, beard, skin tone, body, glasses and headwear anytime.')}</div>
          <button type="button" class="cr-btn cr-btn-acc" id="cr-prof-edit" style="margin-top:4px">${t('Edit look')}</button>
        </div>

        <div class="cr-field is-full">
          <div class="cr-field-head"><span>${t('Backup & Transfer Save')}</span><b>padel-career.json</b></div>
          <div class="pl-card-sub">${t('Export your career to a JSON file or restore a previously exported profile.')}</div>
          <div class="cr-banner-actions" style="margin-top:4px">
            <button type="button" class="cr-btn" id="cr-prof-export">${t('Export')}</button>
            <button type="button" class="cr-btn" id="cr-prof-import">${t('Import')}</button>
          </div>
        </div>

        <div class="cr-field is-full">
          <div class="cr-field-head"><span>${t('Danger Zone')}</span></div>
          ${!deleteConfirmOpen ? `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
              <span class="pl-card-sub">${t('Permanently delete this profile from this browser and start fresh.')}</span>
              <button type="button" class="cr-btn cr-btn-danger" id="cr-prof-delete">${t('Delete profile')}</button>
            </div>
          ` : `
            <div class="cr-delete-box">
              <span>${t('Are you sure you want to permanently delete <b>{name}</b>?', { name: escapeHtml(pl.name) })}</span>
              <div class="cr-banner-actions">
                <button type="button" class="cr-btn cr-btn-danger" id="cr-prof-delete-confirm">${t('Confirm delete')}</button>
                <button type="button" class="cr-btn" id="cr-prof-delete-cancel">${t('Cancel')}</button>
              </div>
            </div>
          `}
        </div>
      </div>
    </div>

    <div class="cr-foot">
      <div class="cr-storage-note">${escapeHtml(t(STORAGE_NOTICE))}</div>
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
  americano: N_('Partners rotate every round; every rally is a point, first to 16.'),
  mexicano: N_('Round 1 is random, then 1st+4th play 2nd+3rd by the table.'),
  knockout: N_('Lose once and you are out. One set to 6.'),
  league: N_('Everyone plays everyone; table by wins, then game difference.'),
};
// t(e.format) / t(e.ai) in the tournament cards: the ids in data/tournaments.json
const FORMAT_AI_NAMES = [N_('americano'), N_('mexicano'), N_('knockout'), N_('league'), N_('rookie'), N_('club'), N_('pro'), N_('legend')];
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
  if (T.format !== 'knockout') return t('Round {r} / {total}', { r: r + 1, total: totalRoundsOf(T) });
  const left = totalRoundsOf(T) - r;
  return left === 1 ? t('Final') : left === 2 ? t('Semi-finals') : left === 3 ? t('Quarter-finals') : t('Round of {n}', { n: 2 ** left });
};
const sideIds = (x) => [].concat(x);
const nameOfId = (T, id) => T.entrants.find(e => e.id === id)?.name || id;
const sideName = (T, x) => sideIds(x).map(id => nameOfId(T, id)).join(' / ');

function lockReason(entry, rank) {
  const c = canEnter(profile, entry, rank);
  if (c.ok) return '';
  if (c.reason === 'invite') return t('Invitation: world top {top}', { top: entry.inviteTop });
  if (c.reason === 'tier') return t('Requires {tier}', { tier: t(tierByIndex(entry.minTier).name) });
  if (c.reason === 'ranking') return t('Needs {pts} ranking pts', { pts: entry.minRankingPoints });
  return t('Needs {fee} Credits', { fee: entry.entryFee });
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
    ...addPoints(p, rw.rankingPoints),
    credits: p.credits + rw.credits,
    circuit: { ...p.circuit, [entry.id]: old ? Math.min(old, place) : place },
    tournament: null,
    tournamentResult: { entryId: entry.id, name: entry.name, place, credits: rw.credits, rankingPoints: rw.rankingPoints },
  };
}

function renderTournamentsScreen() {
  if (!profile) { showScreen('templates'); return; }
  const pl = buildEquippedPlayer(profile);
  setCareerPreview(pl, equippedRacket(profile), buildLeftPanelHtml(pl, profile.stats, profile), t('TOURNAMENTS'));
  const rank = myWorldRank();
  const best = (id) => profile.circuit?.[id] ? t('Best: #{rank}', { rank: profile.circuit[id] }) : t('Best: —');

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${t('CAREER')} · <span>${t('TOURNAMENTS')}</span></h2>
        <div class="cr-sub">${t('Climb the circuit. Entry fees are paid in Credits; places pay Credits and ranking points. World rank: #{rank}', { rank })}</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-tour-back">← ${t('Back to Hub')}</button>
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
                <div class="cr-tour-name">${escapeHtml(t(e.name))} <span class="pl-meta-pill">${capitalize(t(e.format))} · ${e.drawSize} ${isPairFormat(e.format) ? t('pairs') : t('players')}</span> <span class="pl-meta-pill">${capitalize(t(e.ai))}</span></div>
                <div class="cr-tour-info">${escapeHtml(t(FORMAT_INFO[e.format]))}</div>
                <div class="cr-tour-info">${t('Entry {fee} Credits · Champion +{pts} pts, +{credits} Credits · {best}', { fee: e.entryFee, pts: rw.rankingPoints, credits: rw.credits, best: best(e.id) })}</div>
                ${lock ? `<div class="cr-train-reason" style="align-self:flex-start">${escapeHtml(lock)}</div>` : ''}
              </div>
              <button type="button" class="cr-btn cr-btn-acc" data-enter="${e.id}" ${lock ? 'disabled' : ''}>${t('Enter')}</button>
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
  const pool = availablePartners(profile).filter(c => c.id !== partnerId);
  let entrants, T;
  if (!isPairFormat(entry.format)) {
    const sortedPool = pool.slice().sort(() => Math.random() - 0.5);
    entrants = [{ id: 'me', name: profile.player.name, rating: myRating() },
      ...sortedPool.slice(0, entry.drawSize - 1).map(c => ({ id: c.id, name: c.name, rating: aiRating(c, entry) }))];
    T = createTournament({ format: entry.format, entrants });
  } else {
    const partner = charById(partnerId);
    let bestT = null, bestEntrants = null;
    for (let attempt = 0; attempt < 50; attempt++) {
      const p = pool.slice().sort(() => Math.random() - 0.5);
      const candEntrants = [{ id: 'me', name: `${profile.player.name} / ${partner.name}`, rating: (myRating() + aiRating(partner, entry)) / 2, members: [partnerId] }];
      for (let i = 0; i < entry.drawSize - 1; i++) {
        let a, b;
        if (i < 12 && 2 * i + 1 < p.length) {
          a = p[2 * i];
          b = p[2 * i + 1];
        } else {
          const offset = (i - 12) * 2;
          a = p[(offset + 5) % p.length];
          b = p[(offset + 17) % p.length];
        }
        candEntrants.push({ id: `p${i}`, name: `${a.name} / ${b.name}`, rating: (aiRating(a, entry) + aiRating(b, entry)) / 2, members: [a.id, b.id] });
      }
      const testT = createTournament({ format: entry.format, entrants: candEntrants });
      const hasClash = testT.rounds[0]?.some(m => {
        const e1 = candEntrants.find(e => e.id === m.a);
        const e2 = candEntrants.find(e => e.id === m.b);
        return (e1?.members || []).some(id => (e2?.members || []).includes(id));
      });
      if (!hasClash) {
        bestT = testT;
        bestEntrants = candEntrants;
        break;
      }
      if (!bestT) { bestT = testT; bestEntrants = candEntrants; }
    }
    entrants = bestEntrants;
    T = bestT;
  }
  track(`career-tournament/${entry.id}`);
  persistProfile({ ...profile, credits: profile.credits - entry.entryFee, tournament: { entryId: entry.id, T, partner: partnerId } });
  showScreen('tournament');
}

function renderTournamentPartnerScreen() {
  if (!profile || !tState.entry) { showScreen('tournaments'); return; }
  const entry = tState.entry;
  const pl = buildEquippedPlayer(profile);
  setCareerPreview(pl, equippedRacket(profile), buildLeftPanelHtml(pl, profile.stats, profile), t('CHOOSE PARTNER'));
  const partnerList = availablePartners(profile);
  if (!partnerList.some(c => c.id === tState.partnerId)) {
    tState.partnerId = partnerList[0]?.id || characters[0].id;
  }
  const cur = charById(tState.partnerId) || partnerList[0] || characters[0];
  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${escapeHtml(t(entry.name).toUpperCase())} · <span>${t('PARTNER')}</span></h2>
        <div class="cr-sub">${escapeHtml(t(FORMAT_INFO[entry.format]))} ${t('Entry fee {fee} Credits.', { fee: entry.entryFee })}</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-tp-back">← ${t('Back')}</button>
      </div>
    </div>
    <div class="cr-body">
      <div class="pl-section-label">${t('CHOOSE PARTNER')} (${countryFlag(cur.countryCode)} ${escapeHtml(cur.name)} · ${t('rating')} ${avgStats(cur.stats).toFixed(1)})</div>
      <div class="cr-partner-grid" id="cr-tp-grid">
        ${partnerList.map(c => `
          <button type="button" class="pl-card cr-partner-card ${c.id === tState.partnerId ? 'is-selected' : ''}" data-pid="${c.id}">
            <span>${countryFlag(c.countryCode)}</span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c.name)}</span>
            <span class="pl-check">✓</span>
          </button>`).join('')}
      </div>
    </div>
    <div class="cr-foot">
      <div class="cr-foot-row">
        <div class="pl-summary">${escapeHtml(t(entry.name))} · ${capitalize(t(entry.format))} · ${t('w/ {name}', { name: cur.name })}</div>
        <button type="button" class="pl-start-btn" id="cr-tp-go">${t('PAY {fee} &amp; ENTER', { fee: entry.entryFee })}</button>
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
  const key = T.format === 'league' ? t('Wins') : t('Points');
  return `
    <table class="cr-tour-table">
      <tr><th>#</th><th>${t('Name')}</th><th>${key}</th><th>+/-</th></tr>
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
  setCareerPreview(pl, equippedRacket(profile), buildLeftPanelHtml(pl, profile.stats, profile), t('TOURNAMENT'));
  const mine = myMatch(T);
  const round = T.rounds[T.round];

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${escapeHtml(t(entry.name).toUpperCase())} · <span>${roundName(T, T.round).toUpperCase()}</span></h2>
        <div class="cr-sub">${capitalize(t(T.format))} · ${escapeHtml(t(FORMAT_INFO[T.format]))} ${t('Progress saves automatically.')}</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-t-back">← ${t('Back to Hub')}</button>
      </div>
    </div>
    <div class="cr-body">
      ${T.format === 'knockout' ? bracketHtml(T) : `
        <div class="pl-section-label">${roundName(T, T.round).toUpperCase()}</div>
        <div class="cr-tour-matches">${round.map(m => matchRowHtml(T, m)).join('')}</div>
        <div class="pl-section-label">${t('TABLE')}</div>
        ${standingsTableHtml(T)}`}
    </div>
    <div class="cr-foot">
      <div class="cr-foot-row">
        <div class="pl-summary">${mine ? t('Your match: {a} vs {b}', { a: sideName(T, mine.a), b: sideName(T, mine.b) }) : t('No match for you this round.')}</div>
        ${mine
          ? `<button type="button" class="pl-start-btn" id="cr-t-play">${t('PLAY YOUR MATCH')}</button>`
          : `<button type="button" class="cr-btn" id="cr-t-end">${t('Skip to my next match')}</button> <button type="button" class="pl-start-btn" id="cr-t-sim">${t('SIMULATE ROUND')}</button>`}
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
  const startedAt = new Date();
  const tRoster = { 0: me, 1: scaledAI(partner, entry.ai), 2: scaledAI(o1 || characters[0], entry.ai), 3: scaledAI(o2 || characters[1], entry.ai) };
  const tLv = (id) => aiLevel(tRoster[id].stats, entry.ai);

  await startMatchFn({
    players: 4, humans: 1, ai: entry.ai,
    match: rally ? { pointsTo: quick ? 4 : 16 } : { sets: 1, goldenPoint: true, superTiebreak: false, starPoint: false },
    roster: tRoster,
    rackets: { 0: myRacket, 1: rr(), 2: rr(), 3: rr() },
    shoes: { 0: { speed: shoeItem.speed, agility: shoeItem.agility } },
    ball: { speed: ballItem.speed, bounce: ballItem.bounce },
    bag: { 0: { ...profile.bag } },
    form: { 0: formNow(profile, eco) },
    venue: venues.find(v => v.id === entry.venue) || venues[0],
    onEnd(result) {
      let { reward, profile: updated, ups } = settleMatch(profile, result, eco, startedAt);
      const [t0, t1] = rally ? result.points : result.games;
      const fixed = result.won === (t0 > t1) ? [t0, t1] : result.won ? [t1 + 1, t1] : [t0, t0 + 1];  // guard against a tie
      const score = swapped ? { a: fixed[1], b: fixed[0] } : { a: fixed[0], b: fixed[1] };
      const next = simulateOthers(reportResult(T, m, score));
      updated.lastReward = {
        ups, coach: result.tally && !result.forfeit ? coachTip(result.tally, updated, eco) : null,
        lines: reward.lines, mult: reward.mult, credits: reward.credits, won: result.won, ai: result.ai || entry.ai,
        score: rally ? `${t0}-${t1}` : (result.score?.sets || `${t0}-${t1}`),
      };
      updated = withRating(updated, result, [tLv(1)], [tLv(2), tLv(3)]);
      updated = settleTournament({ ...updated, tournament: { ...tour, T: next } });
      persistProfile(updated);
    },
  });
}

function renderTournamentResultScreen() {
  const r = profile?.tournamentResult;
  if (!r) { showScreen('hub'); return; }
  const pl = buildEquippedPlayer(profile);
  setCareerPreview(pl, equippedRacket(profile), buildLeftPanelHtml(pl, profile.stats, profile), r.place === 1 ? t('CHAMPION') : t('TOURNAMENT OVER'));
  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${t('TOURNAMENT')} <span>${t('RESULT')}</span></h2>
        <div class="cr-sub">${escapeHtml(t(r.name))}</div>
      </div>
      <div class="cr-head-right">${renderTopCreditsHtml(profile)}</div>
    </div>
    <div class="cr-body">
      <div class="cr-reward-box">
        <div class="cr-reward-head">
          <div class="cr-reward-outcome ${r.place === 1 ? '' : 'is-loss'}">${r.place === 1 ? t('🏆 CHAMPION') : t('PLACE #{place}', { place: r.place })}</div>
          <div class="cr-reward-score">${escapeHtml(t(r.name))}</div>
        </div>
        <div class="cr-reward-lines">
          <div class="cr-reward-row"><span>${t('Credits')}</span><b class="tabular">+${r.credits}</b></div>
          <div class="cr-reward-row"><span>${t('Ranking points')}</span><b class="tabular">+${r.rankingPoints}</b></div>
        </div>
        <div class="cr-reward-balance"><span>${t('New world rank')}</span><b class="tabular">#${myWorldRank()}</b></div>
        <button type="button" class="pl-start-btn" id="cr-tr-continue" style="width:100%;margin-top:4px">${t('Continue')}</button>
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
  setCareerPreview(pl, equippedRacket(profile), buildLeftPanelHtml(pl, profile.stats, profile), t('WORLD RANKING'));
  const table = worldRanking(profile, aiTable);
  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${t('CAREER')} · <span>${t('WORLD RANKING')}</span></h2>
        <div class="cr-sub">${t('Your rank: #{rank} of {total}. Win tournaments to climb.', { rank: myWorldRank(), total: table.length })}</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-rank-back">← ${t('Back to Hub')}</button>
      </div>
    </div>
    <div class="cr-body">
      <table class="cr-tour-table">
        <tr><th>#</th><th>${t('Name')}</th><th>${t('Points')}</th></tr>
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

function setOnlineStatus(text, lobby, err = false) {
  onlineState.status = text;
  if (lobby) onlineState.lobby = lobby;
  if (err) {
    onlineState.net = null;
    onlineState.lobby = null;
    if (curScreen === 'online') {
      renderOnlineScreen();
      return;
    }
  }
  const el = careerPanel?.querySelector('#cr-on-status');
  if (el) { el.innerHTML = text; el.style.display = text ? '' : 'none'; }
  const go = careerPanel?.querySelector('#cr-on-start');
  if (go) go.hidden = !canStartOnline();
}

// only the room creator may start (the server ignores everyone else)
const canStartOnline = () => !!onlineState.lobby && !onlineState.lobby.started && onlineState.lobby.host === onlineState.net?.seat;

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
  if (!url) { onlineState.rooms = []; setOnlineStatus(t(NO_SERVER), null, true); return; }
  if (!allowServer(url)) { onlineState.rooms = []; setOnlineStatus(t(NOT_CONNECTED), null, true); return; }
  onlineState.busy = true;
  setOnlineStatus(t('Looking for rooms…'));
  try { onlineState.rooms = await listRooms(url); onlineState.status = ''; }
  catch (e) { onlineState.rooms = []; onlineState.status = escapeHtml(t(e.message)); }
  onlineState.busy = false;
  if (curScreen === 'online') renderOnlineScreen();
}

function joinOnlineRoom(code, create) {
  code = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (!code && !create) { setOnlineStatus(t('Enter a room code first.'), null, true); return; }
  if (!profile || onlineState.net) return;
  track(create ? 'online-create' : 'online-join');
  const { stats: _s, ...look } = { ...buildEquippedPlayer(profile), level: profile.level };  // level: rivals rate against it
  const shoeItem = equippedShoes(profile);
  const myRacket = rackets.find(r => r.id === profile.equipped?.racket) || rackets[0];
  const lookWithRacket = { ...look, racket: myRacket.id, racketColor: myRacket.color, racketShape: myRacket.shape };
  const ballItem = shop.items.find(i => i.id === onlineState.ballId) || equippedBall(profile);
  const venue = venues[onlineState.venueIdx] || venues[0];
  const startedAt = new Date();  // ponytail: online counts from joining the room, not the first serve
  const net = startOnlineFn({
    url: onlineUrl() || undefined, code, create, players: onlineState.players,
    venue: venues.indexOf(venue), ai: 'club',
    match: { sets: 1, goldenPoint: true, superTiebreak: false, starPoint: false },
    char: 0, stats: { ...profile.stats }, racket: { ...myRacket.stats },
    public: create && onlineState.isPublic, name: profile.player.name, look: lookWithRacket,
    shoes: { speed: shoeItem.speed, agility: shoeItem.agility },
    ball: create ? { speed: ballItem.speed, bounce: ballItem.bounce } : undefined,
    bag: { ...profile.bag },
    status: (t, l, err) => setOnlineStatus(t, l, err),
    onEnd(result) {
      const { reward, profile: updated, ups } = settleMatch(profile, result, eco, startedAt);
      updated.lastReward = {
        ups, coach: result.tally && !result.forfeit ? coachTip(result.tally, updated, eco) : null,
        lines: reward.lines, mult: reward.mult, credits: reward.credits, won: result.won, ai: result.ai || 'online',
        score: result.score?.sets || '',
      };
      persistProfile(withRating(updated, result, result.mates || [], result.opps?.length ? result.opps : [null]));
    },
  });
  if (!net) {
    onlineState.net = null;
    return;
  }
  onlineState.net = net;
}

function renderOnlineScreen() {
  if (!profile) { showScreen('templates'); return; }
  const pl = buildEquippedPlayer(profile);
  setCareerPreview(pl, equippedRacket(profile), buildLeftPanelHtml(pl, profile.stats, profile), t('PLAY ONLINE'));
  if (onlineState.rooms === null && !onlineState.busy && !onlineState.net) refreshRooms();
  const joined = !!onlineState.net;
  const balls = shop.items.filter(i => i.type === 'ball' && profile.inventory.includes(i.id));
  if (!balls.some(b => b.id === onlineState.ballId)) onlineState.ballId = balls[0]?.id || 'ball_standard';
  const rooms = onlineState.rooms || [];

  careerPanel.innerHTML = `
    ${renderBannersHtml()}
    <div class="cr-head">
      <div>
        <h2 class="cr-title">${t('CAREER')} · <span>${t('PLAY ONLINE')}</span></h2>
        <div class="cr-sub">${t('1 Set · Golden Point · empty seats are filled by AI · Credits ×{mult}', { mult: eco.mult.online ?? 1 })}</div>
      </div>
      <div class="cr-head-right">
        ${renderTopCreditsHtml(profile)}
        <button type="button" class="cr-btn" id="cr-on-back">← ${joined ? t('Leave room') : t('Back to Hub')}</button>
      </div>
    </div>
    <div class="cr-body">
      <div class="cr-msg cr-msg-ok" id="cr-on-status" style="${onlineState.status ? '' : 'display:none'}">${onlineState.status}</div>
      <button type="button" class="pl-start-btn" id="cr-on-start" ${canStartOnline() ? '' : 'hidden'}>${t('START MATCH')}</button>
      ${joined ? '' : `
      <div class="pl-section-label">${t('PUBLIC ROOMS')} <button type="button" class="cr-btn" id="cr-on-refresh" ${onlineState.busy ? 'disabled' : ''}>${t('Refresh')}</button></div>
      <div class="cr-tour-list">
        ${rooms.length ? rooms.map(r => `
          <div class="cr-tour-row">
            <div class="cr-tour-main">
              <div class="cr-tour-name">${t("{host}'s room", { host: escapeHtml(r.host || 'Player') })} <span class="pl-meta-pill">${t('{taken}/{total} players', { taken: r.players - r.free, total: r.players })}</span></div>
              <div class="cr-tour-info">${escapeHtml(venues[r.venue]?.name || '—')} · ${r.free === 1 ? t('1 free seat') : t('{count} free seats', { count: r.free })} · ${escapeHtml(r.code)}</div>
            </div>
            <button type="button" class="cr-btn cr-btn-acc" data-join="${escapeHtml(r.code)}">${t('Join')}</button>
          </div>`).join('') : `<div class="cr-tour-info">${onlineState.busy ? t('Loading…') : t('No public rooms right now.')}</div>`}
      </div>

      <div class="pl-section-label">${t('CREATE ROOM')}</div>
      <div class="pl-seg-row" id="cr-on-mode">
        <button type="button" class="pl-seg-btn ${onlineState.players === 4 ? 'is-selected' : ''}" data-players="4">${t('Doubles (2v2)')}</button>
        <button type="button" class="pl-seg-btn ${onlineState.players === 2 ? 'is-selected' : ''}" data-players="2">${t('Singles (1v1)')}</button>
      </div>
      <div class="pl-seg-row" id="cr-on-vis">
        <button type="button" class="pl-seg-btn ${onlineState.isPublic ? 'is-selected' : ''}" data-public="1">${t('Public')}</button>
        <button type="button" class="pl-seg-btn ${onlineState.isPublic ? '' : 'is-selected'}" data-public="0">${t('Private')}</button>
      </div>
      <div class="cr-form-grid">
        <label class="cr-field"><span class="cr-field-head">${t('Venue')}</span>
          <select class="cr-select" id="cr-on-venue">${venues.map((v, i) => `<option value="${i}" ${i === onlineState.venueIdx ? 'selected' : ''}>${escapeHtml(v.name)} — ${escapeHtml(v.city)}</option>`).join('')}</select></label>
        <label class="cr-field"><span class="cr-field-head">${t('Match ball')}</span>
          <select class="cr-select" id="cr-on-ball">${balls.map(b => `<option value="${b.id}" ${b.id === onlineState.ballId ? 'selected' : ''}>${escapeHtml(t(b.name))}</option>`).join('')}</select></label>
      </div>
      <button type="button" class="cr-btn cr-btn-acc" id="cr-on-create">${t('Create room')}</button>

      <div class="pl-section-label">${t('JOIN BY CODE')}</div>
      <div class="cr-foot-row" style="justify-content:flex-start;gap:8px">
        <input type="text" class="cr-input" id="cr-on-code" maxlength="6" placeholder="${t('ROOM CODE')}" value="${escapeHtml(onlineState.code)}" style="max-width:180px;text-transform:uppercase" />
        <button type="button" class="cr-btn cr-btn-acc" id="cr-on-join">${t('Join')}</button>
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
  q('#cr-on-create').onclick = () => joinOnlineRoom('', true);
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
  if (curScreen === 'levelstart') {
    if (lvl.mode === 'choose') showScreen('creator'); else { lvl.mode = 'choose'; lvl.start = null; renderLevelStartScreen(); }
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
  track('career-open');
  const menuEl = document.getElementById('menu');
  const shell = menuEl?.querySelector('.pl-shell');
  if (!shell || !careerPanel) return;

  isOpen = true;
  const qmRight = shell.querySelector('.pl-right-panel:not(.pl-career-panel)');
  const topBtn = shell.querySelector('#pl-career-btn');
  if (qmRight) qmRight.hidden = true;
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

export function closeCareer({ navigate = true } = {}) {  // navigate: false when the route already moved away (browser Back)
  const menuEl = document.getElementById('menu');
  const shell = menuEl?.querySelector('.pl-shell');
  if (!shell || !careerPanel) return;

  isOpen = false;
  if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
  careerPanel.hidden = true;

  const qmRight = shell.querySelector('.pl-right-panel:not(.pl-career-panel)');
  const topBtn = shell.querySelector('#pl-career-btn');
  if (qmRight) qmRight.hidden = false;
  if (topBtn) topBtn.classList.remove('is-active');

  setCareerGamepadHandler(null);
  restoreQuickMatchPreview();
  if (navigate) location.hash = '#home';
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
    else if (location.hash !== '#career' && isOpen) closeCareer({ navigate: false });
  });

  if (location.hash === '#career') {
    openCareer();
  }
}
