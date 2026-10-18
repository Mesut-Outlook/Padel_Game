// Anonymous event counts for GoatCounter (script tag in index.html; cookie-free, no personal data). Only fixed event
// names and enum values go into the path (e.g. match-start/doubles/club/v04) — never player names, room codes, looks
// or free text. If an ad blocker stops the script, this does nothing. Event list: README "Ziyaret sayacı".
export function track(name) {
  try { globalThis.goatcounter?.count?.({ path: name, title: name, event: true }); } catch { /* counting must never break the game */ }
}

// once per browser session (e.g. which input device a visitor uses)
const sent = new Set();
export function trackOnce(name) {
  let seen = sent.has(name);
  try { seen ||= sessionStorage.getItem('padel.track.' + name) === '1'; sessionStorage.setItem('padel.track.' + name, '1'); } catch { /* no storage: per page */ }
  sent.add(name);
  if (!seen) track(name);
}
