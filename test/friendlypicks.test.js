import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPicks, savePicks, STORAGE_KEY } from '../src/friendlypicks.js';

function createMockStorage(init = {}) {
  const map = new Map(Object.entries(init));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

function createFailingStorage() {
  return {
    getItem: () => { throw new Error('Access denied (SecurityError)'); },
    setItem: () => { throw new Error('QuotaExceededError'); },
  };
}

test('friendlypicks: round trips valid selections', () => {
  const storage = createMockStorage();
  const original = {
    char: 3,
    venue: 2,
    racket: 1,
    sets: '3s',
    golden: 'star',
    ai: 'legend',
    players: 4,
    humans: 2,
  };

  savePicks(original, storage);
  assert.equal(typeof storage.getItem(STORAGE_KEY), 'string');

  const loaded = loadPicks(storage, { charCount: 10, venueCount: 8, racketCount: 5 });
  assert.deepEqual(loaded, original);
});

test('friendlypicks: drops out-of-bounds indices and unknown values', () => {
  const storage = createMockStorage({
    [STORAGE_KEY]: JSON.stringify({
      char: 15,          // out of bounds (charCount: 10)
      venue: -1,         // negative
      racket: 3,         // valid (racketCount: 5)
      sets: 'invalid',   // invalid
      golden: 'star',    // valid
      ai: 'godmode',     // invalid
      players: 3,        // invalid (only 2 or 4)
      humans: 4,         // valid
    }),
  });

  const loaded = loadPicks(storage, { charCount: 10, venueCount: 8, racketCount: 5 });
  assert.deepEqual(loaded, {
    racket: 3,
    golden: 'star',
    humans: 4,
  });
});

test('friendlypicks: clamps humans to 2 in singles mode (players: 2)', () => {
  const storage = createMockStorage({
    [STORAGE_KEY]: JSON.stringify({
      players: 2,
      humans: 4,
    }),
  });

  const loaded = loadPicks(storage);
  assert.equal(loaded.players, 2);
  assert.equal(loaded.humans, 2);
});

test('friendlypicks: corrupt or non-object JSON returns empty object', () => {
  const badInputs = [
    '{ corrupt json',
    'null',
    '123',
    '"string"',
    '[1, 2, 3]',
  ];

  for (const raw of badInputs) {
    const storage = createMockStorage({ [STORAGE_KEY]: raw });
    const loaded = loadPicks(storage);
    assert.deepEqual(loaded, {}, `Expected empty object for ${raw}`);
  }
});

test('friendlypicks: does not throw when storage throws errors', () => {
  const failing = createFailingStorage();

  assert.doesNotThrow(() => {
    const loaded = loadPicks(failing, { charCount: 10 });
    assert.deepEqual(loaded, {});
  });

  assert.doesNotThrow(() => {
    savePicks({ char: 1 }, failing);
  });
});

test('friendlypicks: null or missing storage returns empty object safely', () => {
  assert.deepEqual(loadPicks(null), {});
  assert.deepEqual(loadPicks(undefined), {});
  assert.doesNotThrow(() => savePicks({ char: 1 }, null));
});
