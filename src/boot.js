// Entry: load the UI language first, translate the static HTML, then start the game (src/main.js).
import { loadSettings } from './settings.js';
import { loadLang, pickLang, translateDom, lang, I18N_LIVE } from './i18n.js';

const test = new URLSearchParams(location.search).get('lang');  // ?lang=de: try a language before it goes live
const code = test ? pickLang(test) : I18N_LIVE ? pickLang(loadSettings().lang, navigator.languages || [navigator.language]) : 'en';
loadLang(code).then(() => {
  document.documentElement.lang = lang();
  translateDom(document);
  return import('./main.js');
}).then(keepFiles);

// Service worker (public/sw.js): keeps models, sounds and fonts in the browser cache. ?nosw switches it off and clears the cache.
function keepFiles() {
  try {
    if (!('serviceWorker' in navigator)) return;
    if (location.search.includes('nosw')) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
      caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
    } else if (import.meta.env.PROD) {
      navigator.serviceWorker.register('./sw.js?v=' + __BUILD_ID__).catch(() => {});
    }
  } catch { /* the game works without it */ }
}
