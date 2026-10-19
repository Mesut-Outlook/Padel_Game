import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../src/settings.js';

function createMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

function createThrowingStorage() {
  return {
    getItem: () => { throw new Error('QuotaExceeded / SecurityError'); },
    setItem: () => { throw new Error('QuotaExceeded / SecurityError'); },
  };
}

test('loadSettings returns default settings when storage is empty or throws', () => {
  const emptyStore = createMockStorage();
  assert.deepEqual(loadSettings(emptyStore), { control: 'auto', speed: 0.85, tips: true, lang: '' });

  const throwingStore = createThrowingStorage();
  assert.deepEqual(loadSettings(throwingStore), { control: 'auto', speed: 0.85, tips: true, lang: '' });
});

test('loadSettings recovers from invalid speed and control in storage', () => {
  const store = createMockStorage({
    'padel.settings.v1': JSON.stringify({ control: 'steering_wheel', speed: 999 }),
  });
  assert.deepEqual(loadSettings(store), { control: 'auto', speed: 0.85, tips: true, lang: '' });
});

test('saveSettings and loadSettings round trip successfully', () => {
  const store = createMockStorage();
  const saved = saveSettings({ control: 'pad', speed: 1 }, store);
  assert.deepEqual(saved, { control: 'pad', speed: 1, tips: true, lang: '' });
  assert.deepEqual(loadSettings(store), { control: 'pad', speed: 1, tips: true, lang: '' });

  // Update speed only
  saveSettings({ speed: 0.7 }, store);
  assert.deepEqual(loadSettings(store), { control: 'pad', speed: 0.7, tips: true, lang: '' });
});

test('saveSettings does not throw when storage throws', () => {
  const throwingStore = createThrowingStorage();
  const res = saveSettings({ control: 'kb', speed: 0.7 }, throwingStore);
  assert.deepEqual(res, { control: 'kb', speed: 0.7, tips: true, lang: '' });
});

test('tips can be switched off and stay off; a non-boolean is ignored', () => {
  const store = createMockStorage();
  assert.equal(saveSettings({ tips: false }, store).tips, false);
  assert.equal(loadSettings(store).tips, false);
  assert.equal(saveSettings({ tips: 'no' }, store).tips, false);
  assert.equal(saveSettings({ tips: true }, store).tips, true);
});

test('settings keep a known language or "" (follow the browser), never anything else', () => {
  const store = createMockStorage();
  assert.equal(saveSettings({ lang: 'tr' }, store).lang, 'tr');
  assert.equal(saveSettings({ lang: 'xx' }, store).lang, 'tr');
  assert.equal(saveSettings({ lang: '' }, store).lang, '');
  assert.equal(loadSettings(createMockStorage({ 'padel.settings.v1': JSON.stringify({ lang: 42 }) })).lang, '');
});
