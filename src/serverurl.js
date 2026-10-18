// Where the online client connects (pure: no DOM, location is passed in so it can be tested).
// ?server=wss://... always wins. The static GitHub Pages build (VITE_STATIC=1, set in pages.yml) has no game server
// of its own, so it uses DEFAULT_SERVER — null until a public one runs (then e.g. 'wss://server.padellegends.eu').
// Otherwise: the Vite dev server (:5173) talks to `npm run server` on :8080, and `npm run online` serves page + socket on one host.
export const DEFAULT_SERVER = null;
export const STATIC_BUILD = import.meta.env?.VITE_STATIC === '1';
export const NO_SERVER = 'Online mode requires a game server, which is not included in this static web build. You can play against the AI.';

export function serverUrl(loc, staticBuild = STATIC_BUILD, fallback = DEFAULT_SERVER) {
  const q = new URLSearchParams(loc.search).get('server');
  if (q) return q;
  if (staticBuild) return fallback;
  return loc.port === '5173' ? `ws://${loc.hostname}:8080` : `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}`;
}
