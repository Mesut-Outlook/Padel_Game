// Anonymous event counts for GoatCounter (script tag in index.html; cookie-free, no personal data). Only fixed event
// names go out — never player names, room codes or looks. If an ad blocker stops the script, this does nothing.
export function track(name) {
  try { globalThis.goatcounter?.count?.({ path: name, title: name, event: true }); } catch { /* counting must never break the game */ }
}
