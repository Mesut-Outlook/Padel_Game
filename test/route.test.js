import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute } from '../src/route.js';

test('parseRoute maps #home, #friendly, #career, and empty hash to valid screen', () => {
  assert.deepEqual(parseRoute('#home'), { screen: 'home' });
  assert.deepEqual(parseRoute('#friendly'), { screen: 'friendly' });
  assert.deepEqual(parseRoute('#career'), { screen: 'career' });
  assert.deepEqual(parseRoute(''), { screen: 'home' });
  assert.deepEqual(parseRoute(null), { screen: 'home' });
});

test('parseRoute falls back to home for unknown hashes', () => {
  assert.deepEqual(parseRoute('#random-hash'), { screen: 'home' });
  assert.deepEqual(parseRoute('#settings'), { screen: 'home' });
  assert.deepEqual(parseRoute('#123'), { screen: 'home' });
});

test('parseRoute extracts sanitized room code (?room=padel1 -> PADEL1, max 6, A-Z0-9 only)', () => {
  assert.deepEqual(parseRoute('', '?room=padel1'), { screen: 'friendly', room: 'PADEL1' });
  assert.deepEqual(parseRoute('#friendly', '?room=abc'), { screen: 'friendly', room: 'ABC' });
  // lowercase and special chars stripped, clamped to 6 uppercase chars
  assert.deepEqual(parseRoute('', '?room=pad-el99_extra'), { screen: 'friendly', room: 'PADEL9' });
  assert.deepEqual(parseRoute('#home', '?room=padel1'), { screen: 'home', room: 'PADEL1' });
});
