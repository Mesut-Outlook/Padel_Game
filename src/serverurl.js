// Where the online client connects (pure: no DOM, location is passed in so it can be tested).
// ?server=wss://... always wins (index.html moves it out of the URL into window.__padelServer before GoatCounter loads). The static GitHub Pages build (VITE_STATIC=1, set in pages.yml) has no game server
// of its own, so it uses DEFAULT_SERVER — null until a public one runs (then e.g. 'wss://server.padellegends.eu').
// Otherwise: the Vite dev server (:5173) talks to `npm run server` on :8080, and `npm run online` serves page + socket on one host.
import { N_, t } from './i18n.js';

export const DEFAULT_SERVER = null;
export const STATIC_BUILD = import.meta.env?.VITE_STATIC === '1';
export const NO_SERVER = N_('Online mode requires a game server, which is not included in this static web build. You can play against the AI.');

export function serverUrl(loc, staticBuild = STATIC_BUILD, fallback = DEFAULT_SERVER, given = globalThis.__padelServer) {
  const q = new URLSearchParams(loc.search).get('server') || given;
  if (q) return q;
  if (staticBuild) return fallback;
  return loc.port === '5173' ? `ws://${loc.hostname}:8080` : `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}`;
}

// A server we run (DEFAULT_SERVER), this page's own host or a local test machine is used without asking.
export function trustedServer(url, loc, fallback = DEFAULT_SERVER) {
  try {
    const u = new URL(url), h = u.hostname;
    if (u.protocol !== 'ws:' && u.protocol !== 'wss:') return false;
    return h === loc.hostname || h === 'localhost' || h === '127.0.0.1' || (!!fallback && h === new URL(fallback).hostname);
  } catch { return false; }
}

// Anyone else's server (a ?server= link) sees the visitor's IP and player data: ask once per page before connecting.
const answers = new Map();
export function allowServer(url, loc = globalThis.location) {
  if (trustedServer(url, loc)) return true;
  if (!answers.has(url)) {
    let host = '';
    try { host = new URL(url).protocol.startsWith('ws') ? new URL(url).host : ''; } catch { /* not a URL */ }
    answers.set(url, !!host && !!globalThis.confirm?.([
      t('This link uses a game server that Padel Legends does not run: {host}', { host }),
      t('That server will receive your IP address and the player you play with: name, look, level, stats and equipment.'),
      t('Connect anyway?'),
    ].join('\n\n')));
  }
  return answers.get(url);
}
export const NOT_CONNECTED = N_('Not connected: you did not allow that game server.');
