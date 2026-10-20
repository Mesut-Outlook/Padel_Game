// Service worker: keeps the game's own files (models, animations, fonts, JS/CSS) in the browser cache.
// One lasting cache: models and fonts are served from it at once and re-checked in the background (a changed model shows on
// the next visit); Vite's hashed files never change, so they are cache first. A deploy registers ?v=<new build id>, and the
// new worker drops only the old hashed files, so players do not download 18 MB of models again after every deploy.
const CACHE = 'padel-files';
const HASHED = /-[A-Za-z0-9_-]{8}\.(js|css)$/;   // Vite output, e.g. assets/main-61kw_4eF.js

// 'cache' = cache first, 'stale' = cache now + refresh in the background, 'network' = network first, 'skip' = not ours.
function cachePolicy(url, origin, scope, method, navigate) {
  if (method !== 'GET' || url.origin !== origin) return 'skip';   // other sites (GoatCounter), the game server, non-GET
  if (navigate) return 'network';
  const rest = url.href.startsWith(scope) ? url.href.slice(scope.length) : '';
  if (rest.startsWith('assets/')) return HASHED.test(url.pathname) ? 'cache' : 'stale';
  return rest.startsWith('fonts/') ? 'stale' : 'skip';
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('padel-') && k !== CACHE) await caches.delete(k);
  const c = await caches.open(CACHE);
  for (const r of await c.keys()) if (HASHED.test(new URL(r.url).pathname)) await c.delete(r);  // the old build's bundles
  await self.clients.claim();
})()));

let off = false;   // a ?nosw page load: stop caching so the page can empty the cache
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.mode === 'navigate' && r.url.includes('nosw')) off = true;
  if (off) return;
  const how = cachePolicy(new URL(r.url), self.location.origin, self.registration.scope, r.method, r.mode === 'navigate');
  if (how === 'skip') return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const keep = (res) => { if (res.ok && res.status === 200) c.put(r, res.clone()); return res; };
    if (how === 'network') {
      try { return keep(await fetch(r)); } catch (err) { const hit = await c.match(r); if (hit) return hit; throw err; }
    }
    const hit = await c.match(r);
    if (!hit) return keep(await fetch(r));
    if (how === 'stale') {  // rewrite only a file that really changed (same ETag = same file), not 18 MB on every visit
      const same = (res) => { const tag = res.headers.get('etag'); return tag && tag === hit.headers.get('etag'); };
      e.waitUntil(fetch(r).then((res) => same(res) || keep(res)).catch(() => {}));
    }
    return hit;
  })());
});
