import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newProfile, loadProfile, saveProfile, matchReward, applyReward, exportProfile, importProfile, trainCost, buyTraining, tournamentReward, canEnter, worldRanking, aiRankingTable } from '../src/career.js';

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

test('training cost grows by 1.6 per level from 50', () => {
  assert.deepEqual([4, 5, 9].map(l => trainCost(l, eco)), [50, 80, 524]);
});

test('buyTraining: max, credits, unknown stat rejected unchanged; success deducts and raises', () => {
  const p = { ...newProfile(chars[0], {}), credits: 10 };
  assert.deepEqual(buyTraining({ ...p, stats: { ...p.stats, power: 10 }, credits: 9999 }, 'power', eco).reason, 'max');
  assert.deepEqual(buyTraining(p, 'power', eco), { ok: false, reason: 'credits' });
  assert.deepEqual(buyTraining(p, 'luck', eco), { ok: false, reason: 'stat' });
  const r = buyTraining({ ...p, credits: 100 }, 'power', eco);
  assert.equal(r.ok, true);
  assert.equal(r.profile.credits, 50);
  assert.equal(r.profile.stats.power, 5);
  assert.equal(p.stats.power, 4);
});

const circuit = JSON.parse(fs.readFileSync(new URL('../data/tournaments.json', import.meta.url))).circuit;
const entry = (id) => circuit.find(e => e.id === id);

test('tournament reward: P1 runner-up gets 60% of 1000 points and 10x that in credits', () => {
  assert.deepEqual(tournamentReward(entry('p1'), 2), { rankingPoints: 600, credits: 6000 });
  assert.deepEqual(tournamentReward(entry('club_americano'), 1), { rankingPoints: 10, credits: 100 });
  assert.deepEqual(tournamentReward(entry('fip_bronze'), 6), { rankingPoints: 7, credits: 72 });
  assert.deepEqual(tournamentReward(entry('fip_bronze'), 9), { rankingPoints: 4, credits: 36 });
});

test('canEnter: ranking minimum, entry fee, and Premier Finals by invitation (top 8)', () => {
  const p = { ...newProfile(chars[0], {}), rankingPoints: 100, credits: 50 };
  assert.deepEqual(canEnter(p, entry('fip_gold'), 40), { ok: false, reason: 'ranking' });
  assert.deepEqual(canEnter(p, entry('fip_silver'), 40), { ok: false, reason: 'credits' });
  assert.deepEqual(canEnter(p, entry('fip_bronze'), 40), { ok: true });
  assert.deepEqual(canEnter({ ...p, credits: 9999 }, entry('premier_finals'), 9), { ok: false, reason: 'invite' });
  assert.deepEqual(canEnter({ ...p, credits: 9999 }, entry('premier_finals'), 8), { ok: true });
});

test('world ranking: AI players hold fixed points 0-6000 and the profile slots in by points', () => {
  const ai = aiRankingTable(chars);
  assert.equal(ai.length, chars.length);
  assert.ok(ai.every(r => r.points >= 0 && r.points <= 6000));
  assert.deepEqual(aiRankingTable(chars), ai, 'stable');
  const p = { ...newProfile(chars[0], { name: 'Mesut' }), rankingPoints: ai[2].points + 1 };
  const table = worldRanking(p, ai);
  assert.equal(table.findIndex(r => r.id === 'me'), 2);
  assert.equal(table[2].name, 'Mesut');
});

test('match reward: style points pay 1 Credit per 10, before the AI multiplier', () => {
  const r = matchReward({ won: false, gamesWon: 0, scoring: 'sets', ai: 'pro', style: 165 }, eco);
  assert.deepEqual(r.lines.at(-1), { label: 'Style 165 pts', credits: 16 });
  assert.equal(r.credits, Math.round((20 + 0 + 16) * 1.4));
  assert.equal(matchReward({ won: false, gamesWon: 0, scoring: 'sets', ai: 'club' }, eco).lines.length, 2, 'no style line without style points');
});
