import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGS, pickLang, t, setLang, lang, loadLang } from '../src/i18n.js';

test('pickLang: saved setting, then the browser languages, then English', () => {
  assert.equal(pickLang('de', ['tr-TR']), 'de');
  assert.equal(pickLang('', ['tr-TR', 'en-US']), 'tr');
  assert.equal(pickLang('', ['ja-JP', 'pt-BR']), 'pt');
  assert.equal(pickLang('', ['ja-JP']), 'en');
  assert.equal(pickLang('xx', []), 'en');
});

test('t: the English text is the key, a missing entry falls back to it, placeholders fill in', () => {
  setLang('tr', { 'Start match': 'Maçı başlat', 'Level {n}': 'Seviye {n}' });
  assert.equal(t('Start match'), 'Maçı başlat');
  assert.equal(t('Not translated yet'), 'Not translated yet');
  assert.equal(t('Level {n}', { n: 3 }), 'Seviye 3');
  assert.equal(t('Hello {who}', {}), 'Hello {who}');
  setLang('en');
  assert.equal(t('Level {n}', { n: 3 }), 'Level 3');
});

test('loadLang: an unknown or missing table leaves the game in English', async () => {
  await loadLang('xx');
  assert.equal(lang(), 'en');
  assert.equal(LANGS.length, 8);
});
