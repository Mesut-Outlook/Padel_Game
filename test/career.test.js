import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newProfile, loadProfile, saveProfile, matchReward, applyReward, exportProfile, importProfile } from '../src/career.js';

const eco = JSON.parse(fs.readFileSync(new URL('../data/economy.json', import.meta.url)));
const chars = JSON.parse(fs.readFileSync(new URL('../data/characters.json', import.meta.url)));
const memStore = (init = null) => { let v = init; return { getItem: () => v, setItem: (_, s) => { v = s; } }; };

test('match reward: club win by sets = base + games + win bonus', () => {
  const r = matchReward({ won: true, gamesWon: 6, scoring: 'sets', ai: 'club' }, eco);
  assert.equal(r.credits, 20 + 24 + 40);
  assert.equal(r.lines.length, 3);
});

test('match reward: pro multiplier', () => {
  assert.equal(matchReward({ won: true, gamesWon: 6, scoring: 'sets', ai: 'pro' }, eco).credits, Math.round(84 * 1.4));
});

test('match reward: rally scoring loss pays per point, rookie multiplier', () => {
  assert.equal(matchReward({ won: false, pointsWon: 12, scoring: 'rally', ai: 'rookie' }, eco).credits, Math.round(32 * 0.6));
});

test('new profile starts at stat 4 with starter kit', () => {
  const p = newProfile(chars[0], { name: 'Mesut' });
  assert.equal(p.player.name, 'Mesut');
  assert.deepEqual(Object.values(p.stats), [4, 4, 4, 4, 4, 4]);
  assert.equal(p.credits, 0);
  assert.equal(p.equipped.racket, 'r01');
  assert.ok(p.inventory.includes('ball_standard'));
});

test('applyReward adds credits and history without mutating the input', () => {
  const p = newProfile(chars[0], {});
  const q = applyReward(p, { credits: 84, lines: [] }, { won: true, pointsWon: 30 });
  assert.equal(q.credits, 84);
  assert.deepEqual(q.history, { played: 1, won: 1, pointsWon: 30 });
  assert.equal(p.credits, 0);
});

test('loadProfile statuses: none, corrupt, unavailable, round trip', () => {
  assert.equal(loadProfile(memStore(null)).status, 'none');
  assert.equal(loadProfile(memStore('{bad')).status, 'corrupt');
  assert.equal(loadProfile(memStore('{"version":99}')).status, 'corrupt');
  assert.equal(loadProfile({ getItem() { throw new Error('denied'); } }).status, 'unavailable');
  const s = memStore(), p = newProfile(chars[3], { name: 'Ada' });
  assert.equal(saveProfile(s, p), true);
  assert.deepEqual(loadProfile(s), { profile: p, status: 'ok' });
  assert.equal(saveProfile({ setItem() { throw new Error('quota'); } }, p), false);
});

test('export / import round trip; bad import throws', () => {
  const p = newProfile(chars[1], { name: 'Zafer' });
  assert.deepEqual(importProfile(exportProfile(p)), p);
  assert.throws(() => importProfile('{"version":99}'), /invalid profile/);
  assert.throws(() => importProfile('nope'), /invalid profile/);
});
