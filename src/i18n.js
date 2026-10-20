// UI language. The English text is the key: t('Start match'). Every other language is a table in src/locales/<code>.js,
// loaded before the game starts (src/boot.js), so t() also works at module scope. A missing entry shows the English text.
// Placeholders: t('Level {n}', { n: 3 }). Static HTML: data-i18n (text) / data-i18n-html (keeps <b>…) / data-i18n-title.
export const LANGS = [
  ['en', 'English'], ['de', 'Deutsch'], ['es', 'Español'], ['fr', 'Français'],
  ['it', 'Italiano'], ['nl', 'Nederlands'], ['pt', 'Português'], ['tr', 'Türkçe'],
];
const CODES = LANGS.map(([c]) => c);
// false until the locale tables are written (plan step 4): English for everyone, no Language setting; ?lang=xx still tests one
export const I18N_LIVE = false;
let table = {}, current = 'en';

export const lang = () => current;

// saved setting first ('' = follow the browser), then the browser's languages, then English
export function pickLang(saved, prefs = []) {
  if (CODES.includes(saved)) return saved;
  for (const p of prefs) { const c = String(p).slice(0, 2).toLowerCase(); if (CODES.includes(c)) return c; }
  return 'en';
}

export function t(text, vars) {
  const s = table[text] || text;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
}

// marks an English text that reaches t() later through a variable (a table, a label), so tools/extract-keys.js finds it
export const N_ = (s) => s;

export function setLang(code, tbl = {}) { current = code; table = tbl; }

export async function loadLang(code) {
  if (code !== 'en') {
    try { return setLang(code, (await import(`./locales/${code}.js`)).default); } catch { /* no table yet: English */ }
  }
  setLang('en');
}

export function translateDom(root) {
  for (const el of root.querySelectorAll('[data-i18n]')) { el.dataset.i18n ||= el.textContent.trim(); el.textContent = t(el.dataset.i18n); }
  for (const el of root.querySelectorAll('[data-i18n-html]')) { el.dataset.i18nHtml ||= el.innerHTML.trim(); el.innerHTML = t(el.dataset.i18nHtml); }
  for (const el of root.querySelectorAll('[data-i18n-title]')) { el.dataset.i18nTitle ||= el.title; el.title = t(el.dataset.i18nTitle); }
}
