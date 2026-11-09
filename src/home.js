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
import { tutorialFinished } from './tutorialdone.js';
import { relTime, slotsFor, dayStrip, quickSlots, icsFor } from './schedule.js';
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
// Match calendar state (posted games from the server, the server clock offset, the visitor's selections)
let sched = { games: [], clients: 0, offset: 0, ready: false }, lastSchedKey = '';
let calDay = null, calPicked = false, sheet = null, notice = '', noticeTimer = null;  // calPicked: the visitor chose a day (else it follows the first day with games)  // sheet: { day, at, open } while "Post a game" is open

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

  const sub = homeEl.querySelector('#hm-play-sub');
  if (sub) sub.innerHTML = lastRows.length ? escapeHtml(t('{name} is waiting for you · start now', { name: lastRows[0].host || 'Player' })) : escapeHtml(t('Warm up until someone joins'));
  if (lastRows.length === 0) { listEl.innerHTML = ''; return; }  // nobody waiting: the calendar below says what to do instead

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

// ---- Match calendar ----
const M = 60000;
const pickNow = () => Date.now();
const fmtDay = (ms, opts) => { try { return new Date(ms).toLocaleDateString(document.documentElement?.lang || undefined, opts); } catch { return new Date(ms).toDateString(); } };
const fmtTime = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const relText = (at) => { const r = relTime(at, sched.offset, pickNow()); return r.key === 'now' ? t('now') : r.key === 'started' ? t('started') : t(r.key, { h: r.h, m: r.m }); };
const fmtText = (g) => (g.players === 2 ? t('Singles') : `${t('Doubles')} · ${g.mode === 'team' ? t('Team up') : t('Face off')}`);
const dots = (g) => {
  const total = g.players === 2 || g.mode === 'team' ? 2 : 4, taken = total - g.free;  // Team up: the two humans' places (the AI pair is not bookable)
  return Array.from({ length: total }, (_, i) => `<span class="hm-sc-dot${i < taken ? ' on' : ''}"></span>`).join('');
};
const canEnter = (g) => { const now = pickNow() + sched.offset; return (g.mine === 'host' || g.mine === 'seat') && now >= g.at - 10 * M && now < g.at + 15 * M; };

function gameRow(g) {
  const id = escapeHtml(g.id), host = escapeHtml(g.host?.name || 'Player');
  let action = '', extra = '';
  if (canEnter(g)) action = `<button type="button" class="hm-btn hm-sc-btn pri hm-sc-enter" data-code="${id}">${t('Enter')}</button>`;
  if (g.mine === 'host') {
    const reqs = g.requests || [];
    extra = `<div class="hm-sc-host">
      ${reqs.length ? `<div class="hm-sc-lab">${t('Requests')}</div>` + reqs.map(r => `<div class="hm-sc-req"><span>${escapeHtml(r.name)} <b>${(Number(r.level) || 0).toFixed(1)}</b></span><span><button type="button" class="hm-sc-no" data-code="${id}|${escapeHtml(r.reqId)}" aria-label="${t('Decline')}">✕</button><button type="button" class="hm-sc-yes" data-code="${id}|${escapeHtml(r.reqId)}" aria-label="${t('Accept')}">✓</button></span></div>`).join('') : ''}
      ${!g.open ? `<div class="hm-sc-note">${t('Unanswered requests are accepted 1 hour before the game.')}</div>` : ''}
      <button type="button" class="hm-link-btn hm-sc-del" data-code="${id}">${t('Delete game')}</button></div>`;
  } else if (g.mine === 'seat') extra = `<div class="hm-sc-links"><b>${t('Your seat is ready')}</b> <button type="button" class="hm-link-btn hm-sc-ics" data-code="${id}">📅 ${t('Add to calendar')}</button> <button type="button" class="hm-link-btn hm-sc-cancel" data-code="${id}">${t('Cancel')}</button></div>`;
  else if (g.mine === 'pending') extra = `<div class="hm-sc-links">${t('Request sent')} <button type="button" class="hm-link-btn hm-sc-cancel" data-code="${id}">${t('Cancel')}</button></div>`;
  else if (g.mine === 'declined') extra = `<div class="hm-sc-links">${t('Not accepted')}</div>`;
  else if (g.mine === 'cancelled') extra = `<div class="hm-sc-links">${t('The host cancelled this game.')}</div>`;
  else if (!action && g.at > pickNow() + sched.offset) action = g.free > 0 ? `<button type="button" class="hm-btn hm-sc-btn hm-sc-ask" data-code="${id}">${g.open ? t('Join') : t('Ask to join')}</button>` : `<span class="hm-sc-full">${t('This game is full.')}</span>`;
  return `<div class="hm-sc-game${g.mine === 'seat' || g.mine === 'host' ? ' mine' : ''}">
    <div class="hm-sc-time"><b>${fmtTime(g.at)}</b><small>${escapeHtml(relText(g.at))}</small></div>
    <div class="hm-sc-info"><div class="hm-sc-top">${host} <span class="hm-sc-tag">${escapeHtml(fmtText(g))}</span></div><div class="hm-sc-dots">${dots(g)}</div>${extra}</div>
    ${action}</div>`;
}

function renderSheet() {
  const now = pickNow(), days = dayStrip([], now, sched.offset);
  const busy = (at) => sched.games.filter(g => Math.abs(g.at - at) < 90 * M).length >= 8;
  return `<div class="hm-sheet" id="hm-sheet">
    <div class="hm-sc-sheethead"><b>${t('Post a game')}</b><button type="button" class="hm-link-btn hm-sc-close" aria-label="${t('Close')}">✕</button></div>
    <div class="hm-sc-lab">${t('Day')}</div>
    <div class="hm-sc-days">${days.map(d => `<button type="button" class="hm-sc-sday${d.dayOffset === sheet.day ? ' on' : ''}" data-code="${d.dayOffset}"><small>${escapeHtml(fmtDay(d.date, { weekday: 'short' }))}</small><b>${new Date(d.date).getDate()}</b></button>`).join('')}</div>
    <div class="hm-sc-lab">${t('Time')}</div>
    <div class="hm-sc-slots">${slotsFor(sheet.day, now, sched.offset).map(sl => `<button type="button" class="hm-sc-slot${sl.at === sheet.at ? ' on' : ''}${busy(sl.at) ? ' full' : ''}" data-code="${sl.at}" ${busy(sl.at) ? 'disabled' : ''}>${sl.label}</button>`).join('') || `<span class="hm-sc-note">${t('No times left today.')}</span>`}</div>
    <div class="hm-sc-note">${escapeHtml(quickPick.players === 2 ? t('Singles') : `${t('Doubles')} · ${quickPick.mode === 'team' ? t('Team up') : t('Face off')}`)}</div>
    <button type="button" class="hm-sc-toggle hm-sc-open${sheet.open ? ' on' : ''}" aria-pressed="${sheet.open}"><span><b>${t('Anyone can join without approval')}</b><small>${t('If this is off, you approve requests.')}</small></span><span class="hm-sc-sw"></span></button>
    <button type="button" class="hm-play-now hm-sc-submit" ${sheet.at ? '' : 'disabled'}>${t('Post game')}</button>
    <div class="hm-sc-note">${t('Your nickname is shown. One game at a time.')}</div></div>`;
}

function renderCalendar() {
  if (!homeEl) return;
  const cal = homeEl.querySelector('#hm-cal'), count = homeEl.querySelector('#hm-online-count');
  if (count) {
    count.hidden = !(sched.ready && sched.clients >= 1);
    count.innerHTML = count.hidden ? '' : escapeHtml(t('{n} players on the site now', { n: sched.clients + 1 }));
  }
  if (!cal) return;
  if (!sched.ready) { cal.innerHTML = ''; return; }
  const note = notice ? `<div class="hm-sc-notice" role="status">${escapeHtml(notice)}</div>` : '';
  if (sheet) { cal.innerHTML = note + renderSheet(); return bindCalendar(cal); }
  const now = pickNow(), games = sched.games, strip = dayStrip(games, now, sched.offset);
  if (!games.length) {
    cal.innerHTML = note + `<div class="hm-sc-empty"><div class="hm-sc-ball" aria-hidden="true"></div>
      <b>${t('Be the first to post a game tonight')}</b><p>${t('Pick a time and your game shows here for everyone.')}</p>
      <div class="hm-sc-quickrow">${quickSlots(now, sched.offset).map(q => `<button type="button" class="hm-sc-quick" data-code="${q.at}"><small>${escapeHtml(q.dayOffset ? fmtDay(q.at, { weekday: 'short' }) : t('Today'))}</small><b>${q.label}</b><em>${escapeHtml(quickPick.players === 2 ? t('Singles') : t('Doubles'))}</em></button>`).join('')}</div>
      <button type="button" class="hm-link-btn hm-sc-post">${t('Pick another day or time')}</button></div>`;
    return bindCalendar(cal);
  }
  if (!calPicked || calDay == null || !strip[calDay]) calDay = Math.max(0, strip.findIndex(d => d.count > 0));
  const day = strip[calDay], list = games.filter(g => new Date(g.at).toDateString() === new Date(day.date).toDateString());
  cal.innerHTML = note + `<div class="hm-sc-week">${strip.map(d => `<button type="button" class="hm-sc-day${d.dayOffset === calDay ? ' on' : ''}${d.count ? '' : ' empty'}" data-code="${d.dayOffset}"><small>${escapeHtml(d.dayOffset ? fmtDay(d.date, { weekday: 'short' }) : t('Today'))}</small><b>${new Date(d.date).getDate()}</b>${d.count ? `<span class="hm-sc-n">${d.count}</span>` : ''}</button>`).join('')}</div>
    ${list.length ? list.map(gameRow).join('') : `<div class="hm-games-empty">${t('No games yet on this day.')}</div>`}
    <button type="button" class="hm-btn-sec hm-sc-post">＋ ${t('Post a game')}</button>`;
  bindCalendar(cal);
}

function bindCalendar(cal) {
  const on = (cls, fn) => cal.querySelectorAll('.' + cls).forEach(b => { b.onclick = () => fn(b.dataset.code ?? ''); });
  const pair = (code) => { const i = code.indexOf('|'); return [code.slice(0, i), code.slice(i + 1)]; };
  on('hm-sc-quick', (at) => callbacks.onPost?.({ at: Number(at), players: quickPick.players, mode: quickPick.mode, open: false }));
  on('hm-sc-post', () => { sheet = { day: calDay ?? 0, at: null, open: false }; renderCalendar(); });
  on('hm-sc-day', (d) => { calDay = Number(d); calPicked = true; renderCalendar(); });
  on('hm-sc-ask', (id) => callbacks.onAsk?.(id));
  on('hm-sc-enter', (id) => callbacks.onEnter?.(id));
  on('hm-sc-cancel', (id) => callbacks.onCancel?.(id));
  on('hm-sc-del', (id) => callbacks.onDelete?.(id));
  on('hm-sc-yes', (c) => { const [id, r] = pair(c); callbacks.onAnswer?.(id, r, true); });
  on('hm-sc-no', (c) => { const [id, r] = pair(c); callbacks.onAnswer?.(id, r, false); });
  on('hm-sc-ics', (id) => downloadIcs(sched.games.find(g => g.id === id)));
  on('hm-sc-close', () => { sheet = null; renderCalendar(); });
  on('hm-sc-sday', (d) => { sheet.day = Number(d); sheet.at = null; renderCalendar(); });
  on('hm-sc-slot', (at) => { sheet.at = Number(at); renderCalendar(); });
  on('hm-sc-open', () => { sheet.open = !sheet.open; renderCalendar(); });
  on('hm-sc-submit', () => { if (!sheet?.at) return; const p = { at: sheet.at, players: quickPick.players, mode: quickPick.mode, open: sheet.open }; sheet = null; renderCalendar(); callbacks.onPost?.(p); });
}

// a calendar file made here and saved by the browser: nothing is sent anywhere
function downloadIcs(g) {
  if (!g || typeof Blob === 'undefined') return;
  const url = URL.createObjectURL(new Blob([icsFor(g, t('Padel Legends match'))], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'padel-legends.ics';
  document.body?.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// a short line at the top of the calendar (a server answer such as 'That time slot is full.'), gone after 6 s
export function setCalendarNotice(text) {
  notice = String(text || '');
  clearTimeout(noticeTimer);
  if (notice) noticeTimer = setTimeout(() => { notice = ''; renderCalendar(); }, 6000);
  renderCalendar();
}

// the visitor's career level, shown next to their name on posted games (display only)
export const myLevel = () => Number(safeLoadProfile()?.level) || 0;

export function setSchedule({ games = [], clients = 0, offset = 0, serverReady = true } = {}) {
  sched = { games: Array.isArray(games) ? games : [], clients: clients | 0, offset: Number(offset) || 0, ready: serverReady !== false };
  const key = JSON.stringify([sched.games, sched.clients, sched.ready, Math.floor((pickNow() + sched.offset) / M)]);  // the 10 s poll: rebuild only on a change (keeps pad/keyboard focus)
  if (key === lastSchedKey) return;
  lastSchedKey = key;
  renderCalendar();
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
            ${t('PLAY NOW')}<small class="hm-play-sub" id="hm-play-sub"></small>
          </button>
          ${tutorialFinished()
            ? `<button type="button" class="hm-btn-sec" id="hm-btn-training" tabindex="0">${t('Training again')}</button>`
            : `<button type="button" class="hm-train-card" id="hm-btn-training" tabindex="0"><span class="hm-train-ic" aria-hidden="true">🎓</span><span class="hm-train-txt"><b>${t('Training')}</b><small>${t('New here? Learn the shots in a few minutes')}</small></span><span class="hm-train-arr" aria-hidden="true">›</span></button>`}

          <div class="hm-sub-actions">
            ${callbacks.online === false ? '' : `<button type="button" class="hm-btn-sec" id="hm-btn-invite" tabindex="0">${t('Invite a friend')}</button>`}
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
              ${t('Match calendar')}
            </h2>
            <span class="hm-online-count" id="hm-online-count" hidden></span>
          </div>
          <div class="hm-games-list" id="hm-games-list" role="list"></div>
          <div class="hm-cal" id="hm-cal"></div>
        </section>
      </div>

      <div class="hm-howto" aria-label="${t('Ways to play')}">
        ${HOWTO.filter(h => h.ready).map(h => `<a class="hm-howto-item" href="kontroller.html#${h.to}" target="_blank" rel="noopener"><img src="assets/howto/${h.img}.webp" alt="${h.label()}" width="640" height="482" loading="lazy"><span>${h.label()}</span></a>`).join('')}
      </div>
    </main>

    <footer class="hm-bottom-bar">
      <div class="hm-actions-row">
        <button type="button" class="hm-btn" id="hm-btn-career" tabindex="0">🏆 ${t('Career')}</button>
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
    const note = homeEl.querySelector('.hm-name-note');
    if (note) note.style.display = 'block';  // phones hide the note to save room, but this is when it matters: while a name is typed
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
  const invite = homeEl.querySelector('#hm-btn-invite');  // absent without a game server (static build)
  if (invite) invite.onclick = () => {
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
  renderCalendar();
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
