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
  assert.deepEqual(loadSettings(emptyStore), { control: 'auto', speed: 0.85 });

  const throwingStore = createThrowingStorage();
  assert.deepEqual(loadSettings(throwingStore), { control: 'auto', speed: 0.85 });
});

test('loadSettings recovers from invalid speed and control in storage', () => {
  const store = createMockStorage({
    'padel.settings.v1': JSON.stringify({ control: 'steering_wheel', speed: 999 }),
  });
  assert.deepEqual(loadSettings(store), { control: 'auto', speed: 0.85 });
});

test('saveSettings and loadSettings round trip successfully', () => {
  const store = createMockStorage();
  const saved = saveSettings({ control: 'pad', speed: 1 }, store);
  assert.deepEqual(saved, { control: 'pad', speed: 1 });
  assert.deepEqual(loadSettings(store), { control: 'pad', speed: 1 });

  // Update speed only
  saveSettings({ speed: 0.7 }, store);
  assert.deepEqual(loadSettings(store), { control: 'pad', speed: 0.7 });
});

test('saveSettings does not throw when storage throws', () => {
  const throwingStore = createThrowingStorage();
  const res = saveSettings({ control: 'kb', speed: 0.7 }, throwingStore);
  assert.deepEqual(res, { control: 'kb', speed: 0.7 });
});
