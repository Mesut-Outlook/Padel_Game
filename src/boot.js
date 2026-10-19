// Entry: load the UI language first, translate the static HTML, then start the game (src/main.js).
import { loadSettings } from './settings.js';
import { loadLang, pickLang, translateDom, lang, I18N_LIVE } from './i18n.js';

const test = new URLSearchParams(location.search).get('lang');  // ?lang=de: try a language before it goes live
const code = test ? pickLang(test) : I18N_LIVE ? pickLang(loadSettings().lang, navigator.languages || [navigator.language]) : 'en';
loadLang(code).then(() => {
  document.documentElement.lang = lang();
  translateDom(document);
  return import('./main.js');
});
