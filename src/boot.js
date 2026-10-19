// Entry: load the UI language first, translate the static HTML, then start the game (src/main.js).
import { loadSettings } from './settings.js';
import { loadLang, pickLang, translateDom, lang } from './i18n.js';

loadLang(pickLang(loadSettings().lang, navigator.languages || [navigator.language])).then(() => {
  document.documentElement.lang = lang();
  translateDom(document);
  return import('./main.js');
});
