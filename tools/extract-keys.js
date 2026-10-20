// Collects every English UI string (the i18n keys) and writes data/i18n-keys.json: { "key": ["src/x.js:12", …] }.
// Sources (not src/i18n.js, whose comments quote t('…') examples): t('…') and N_('…') literals in src/*.js and kontroller.html's module script, data-i18n* attributes
// in index.html / kontroller.html, data/shop.json (name, desc), data/tournaments.json circuit (name, description).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const lineOf = (text, i) => text.slice(0, i).split('\n').length;

// the string a JS single/double-quoted literal evaluates to
const unescape = (s) => s.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/gs, (_, c) =>
  c[0] === 'u' || c[0] === 'x' ? String.fromCharCode(parseInt(c.slice(1), 16)) : ({ n: '\n', t: '\t', r: '\r' }[c] ?? c));
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

export function collectKeys() {
  const keys = new Map();
  const add = (key, loc) => { if (key && !key.includes('${')) (keys.get(key) || keys.set(key, []).get(key)).push(loc); };
  const scanJs = (file, text) => {
    for (const m of text.matchAll(/(?<![\w$.])(?:t|N_)\(\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)")/g)) {
      add(unescape(m[1] ?? m[2]), `${file}:${lineOf(text, m.index)}`);
    }
  };
  for (const f of fs.readdirSync(path.join(root, 'src')).filter((f) => f.endsWith('.js') && f !== 'i18n.js').sort()) scanJs(`src/${f}`, read(`src/${f}`));
  for (const f of ['index.html', 'kontroller.html']) {
    const text = read(f);
    if (f === 'kontroller.html') for (const m of text.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) scanJs(f, text.slice(0, m.index) .replace(/[^\n]/g, '') + m[1]);
    for (const m of text.matchAll(/data-i18n(?:-html|-title)?=(?:"([^"]*)"|'([^']*)')/g)) add(decode(m[1] ?? m[2]), `${f}:${lineOf(text, m.index)}`);
  }
  for (const i of JSON.parse(read('data/shop.json')).items) { add(i.name, 'data/shop.json'); add(i.desc, 'data/shop.json'); }
  for (const c of JSON.parse(read('data/tournaments.json')).circuit) { add(c.name, 'data/tournaments.json'); add(c.description, 'data/tournaments.json'); }
  return keys;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const keys = collectKeys();
  const out = Object.fromEntries([...keys].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  fs.writeFileSync(path.join(root, 'data/i18n-keys.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`${keys.size} keys -> data/i18n-keys.json`);
}
