// Match calendar helpers for the browser: the browser token, the server clock, local time slots, the week strip and the
// calendar file. Pure except scheduleToken (localStorage). Times are ms; offsetMs = server clock − this device's clock.
import { N_ } from './i18n.js';

const M = 60000, H = 60 * M, LEAD = 15 * M;
const TOKEN_KEY = 'padel.scheduleToken';
const pad = (n) => String(n).padStart(2, '0');
const hhmm = (ms) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dayStart = (ms, plus = 0) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + plus); return d.getTime(); };

let memoryToken = null;  // storage blocked: one token for this page
// create: false = only read (the calendar list sends a token only once this browser has posted or asked: no ID for a visitor who never used it)
export function scheduleToken(storage = globalThis.localStorage, { create = true } = {}) {
  const fresh = () => { const b = new Uint8Array(16); globalThis.crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  try {
    let tok = storage.getItem(TOKEN_KEY);
    if (!/^[A-Za-z0-9_-]{22}$/.test(tok || '')) { if (!create) return null; tok = fresh(); storage.setItem(TOKEN_KEY, tok); }
    return tok;
  } catch { return create ? (memoryToken ||= fresh()) : memoryToken; }
}

export const clockOffset = (serverNow, clientNow) => serverNow - clientNow;

export function relTime(atMs, offsetMs, nowMs) {
  const d = atMs - (nowMs + offsetMs);
  if (d <= 0) return { key: N_('started'), h: 0, m: 0 };
  if (d < M) return { key: N_('now'), h: 0, m: 0 };
  const h = Math.floor(d / H), m = Math.round((d % H) / M);
  return h ? { key: N_('in {h} h {m} min'), h, m } : { key: N_('in {m} min'), h: 0, m };
}

export function slotsFor(dayOffset, nowMs, offsetMs) {
  const now = nowMs + offsetMs, start = dayStart(now, dayOffset), out = [];
  for (let i = 0; i < 48; i++) {
    const d = new Date(start); d.setHours(Math.floor(i / 2), (i % 2) * 30, 0, 0);
    const at = d.getTime();
    if (at >= now + LEAD && dayStart(at) === start) out.push({ at, label: hhmm(at) });
  }
  return out;
}

export function dayStrip(games, nowMs, offsetMs) {
  const now = nowMs + offsetMs;
  return Array.from({ length: 7 }, (_, dayOffset) => {
    const date = dayStart(now, dayOffset);
    return { dayOffset, date, count: games.filter(g => dayStart(g.at) === date).length };
  });
}

export function quickSlots(nowMs, offsetMs) {
  const now = nowMs + offsetMs, out = [];
  for (const dayOffset of [0, 1]) for (const h of [20, 21, 22]) {
    const d = new Date(dayStart(now, dayOffset)); d.setHours(h, 0, 0, 0);
    if (d.getTime() >= now + LEAD) out.push({ at: d.getTime(), label: hhmm(d.getTime()), dayOffset });
  }
  return out.slice(0, 3);
}

// a calendar file made on this device (nothing is sent anywhere); no player names in it
export function icsFor(game, title) {
  const utc = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Padel Legends//Match calendar//EN', 'BEGIN:VEVENT',
    `UID:${String(game.id).replace(/[^A-Za-z0-9]/g, '')}@padellegends.eu`, `DTSTAMP:${utc(Date.now())}`,
    `DTSTART:${utc(game.at)}`, `DTEND:${utc(game.at + 90 * M)}`, `SUMMARY:${String(title).replace(/[\r\n,;]/g, ' ')}`,
    'URL:https://padellegends.eu/', 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
}
