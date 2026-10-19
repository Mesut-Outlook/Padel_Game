import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newProfile, loadProfile, saveProfile, matchReward, applyReward, exportProfile, importProfile, trainCost, buyTraining, tournamentReward, canEnter, worldRanking, aiRankingTable, migrateProfile, applyRating, settleMatch, formNow, addPoints, expirePoints, expiringSoon } from '../src/career.js';

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

test('newProfile v2 starts average with starter kit, at level 1.50', () => {
  const p = newProfile(chars[0], { name: 'Mesut' });
  assert.equal(p.player.name, 'Mesut');
  assert.equal(p.version, 2);
  assert.deepEqual(Object.values(p.stats), [5, 5, 5, 5, 5, 5]);
  assert.deepEqual([p.level, p.reliability, p.bestTier, p.lastCareerMatch], [1.5, 0.2, 3, null]);
  const high = newProfile(chars[0], {}, { level: 2.5, reliability: 0.3 });
  assert.deepEqual([high.credits, high.bestTier, high.reliability], [750, 4, 0.3]);
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
  assert.deepEqual([5, 6, 9].map(l => trainCost(l, eco)), [50, 80, 328]);
});

test('buyTraining: max, credits, unknown stat rejected unchanged; success deducts and raises', () => {
  const p = { ...newProfile(chars[0], {}), credits: 10 };
  assert.deepEqual(buyTraining({ ...p, stats: { ...p.stats, power: 10 }, credits: 9999 }, 'power', eco).reason, 'max');
  assert.deepEqual(buyTraining(p, 'power', eco), { ok: false, reason: 'credits' });
  assert.deepEqual(buyTraining(p, 'luck', eco), { ok: false, reason: 'stat' });
  const r = buyTraining({ ...p, credits: 100 }, 'power', eco);
  assert.equal(r.ok, true);
  assert.equal(r.profile.credits, 50);
  assert.equal(r.profile.stats.power, 6);
  assert.equal(p.stats.power, 5);
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
  const p = { ...newProfile(chars[0], {}), rankingPoints: 100, credits: 50, bestTier: 5 };
  assert.deepEqual(canEnter(p, entry('fip_gold'), 40), { ok: false, reason: 'ranking' });
  assert.deepEqual(canEnter(p, entry('fip_silver'), 40), { ok: false, reason: 'credits' });
  assert.deepEqual(canEnter(p, entry('fip_bronze'), 40), { ok: true });
  assert.deepEqual(canEnter({ ...p, credits: 9999, bestTier: 7 }, entry('premier_finals'), 9), { ok: false, reason: 'invite' });
  assert.deepEqual(canEnter({ ...p, credits: 9999, bestTier: 7 }, entry('premier_finals'), 8), { ok: true });
  assert.deepEqual(canEnter({ ...p, bestTier: 4, rankingPoints: 9999, credits: 9999 }, entry('p1'), 1), { ok: false, reason: 'tier' });
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
  // template AI clone is filtered out
  assert.equal(table.some(r => r.id === chars[0].id), false);
  assert.equal(table.filter(r => r.name === 'Mesut').length, 1);
});

test('match reward: style points pay 1 Credit per 10, before the AI multiplier', () => {
  const r = matchReward({ won: false, gamesWon: 0, scoring: 'sets', ai: 'pro', style: 165 }, eco);
  assert.deepEqual(r.lines.at(-1), { label: 'Style 165 pts', credits: 16 });
  assert.equal(r.credits, Math.round((20 + 0 + 16) * 1.4));
  assert.equal(matchReward({ won: false, gamesWon: 0, scoring: 'sets', ai: 'club' }, eco).lines.length, 2, 'no style line without style points');
});

test('a v1 profile missing credits/equipped/history counts as corrupt and cannot be imported', () => {
  const partial = '{"version":1,"player":{"name":"x"},"stats":{},"inventory":[]}';
  assert.equal(loadProfile(memStore(partial)).status, 'corrupt');
  assert.throws(() => importProfile(partial), /invalid profile/);
  const p = newProfile(chars[0], {});
  assert.throws(() => importProfile(JSON.stringify({ ...p, credits: '<b>9</b>' })), /invalid profile/);
});

test('match reward: quitting mid-match (forfeit) pays nothing', () => {
  const r = matchReward({ won: false, gamesWon: 0, scoring: 'sets', ai: 'legend', forfeit: true }, eco);
  assert.equal(r.credits, 0);
});

test('migrateProfile keeps everything and backs up', () => {
  const v1 = { ...newProfile(chars[0], {}), version: 1, stats: { speed: 4, power: 7, control: 4, volley: 4, smash: 4, stamina: 4 },
    rankingPoints: 70, credits: 1733, inventory: ['r01', 'r04', 'shoe_starter', 'kit_starter', 'ball_standard'] };
  for (const k of ['level', 'reliability', 'bestTier', 'lastCareerMatch']) delete v1[k];
  const raw = JSON.stringify(v1), saved = {};
  const store = { getItem: (k) => (k === 'padel.career.v1' ? raw : null), setItem: (k, v) => { saved[k] = v; } };
  const { profile: p, status } = loadProfile(store);
  assert.equal(status, 'ok');
  assert.deepEqual([p.version, p.level, p.reliability, p.bestTier], [2, 3, 0.5, 4]);
  assert.deepEqual(p.stats, { speed: 5, power: 7, control: 5, volley: 5, smash: 5, stamina: 5 });
  assert.equal(p.credits, 1733);
  assert.deepEqual(p.inventory, v1.inventory);
  assert.equal(saved['padel.career.v1.bak'], raw);
  assert.equal(JSON.parse(saved['padel.career.v1']).version, 2, 'migrated once: the v2 profile is saved back');
  assert.equal(migrateProfile(JSON.parse(raw)).level, 3);
});

test('applyRating updates level, bestTier and date; a tier-up is reported', () => {
  const p = newProfile(chars[0], {}), now = new Date('2026-10-19T12:00:00Z');
  const r = applyRating(p, 1.5, 2.5, { won: true, games: [6, 3] }, now);
  assert.ok(r.profile.level > 1.5 && r.delta > 0);
  assert.equal(r.profile.lastCareerMatch, now.toISOString());
  assert.equal(r.tierUp, null);
  const up = applyRating({ ...p, level: 2.45, reliability: 0 }, 2.45, 4, { won: true, games: [6, 0] }, now);
  assert.equal(up.profile.bestTier, 4);
  assert.equal(up.tierUp.id, 'intermediate');
});

test('bestTier never goes down', () => {
  const p = { ...newProfile(chars[0], {}), level: 2.55, bestTier: 4, reliability: 0 };
  const r = applyRating(p, 2.55, 1, { won: false, games: [0, 6] });
  assert.ok(r.profile.level < 2.5);
  assert.equal(r.profile.bestTier, 4);
  assert.equal(r.tierUp, null);
});

test('a v1 export file still imports (migrated)', () => {
  const v1 = { ...newProfile(chars[0], {}), version: 1, rankingPoints: 70 };
  for (const k of ['level', 'reliability', 'bestTier', 'lastCareerMatch']) delete v1[k];
  const p = importProfile(JSON.stringify(v1));
  assert.deepEqual([p.version, p.level], [2, 3]);
});

test('migration keeps every tournament a v1 player could enter', () => {
  for (const rp of [0, 10, 30, 59, 60, 80, 179, 180, 199, 200, 350, 599, 600, 700, 1299, 1300, 1499, 1500, 2500]) {
    const v1 = { ...newProfile(chars[0], {}), version: 1, rankingPoints: rp };
    const p = migrateProfile(v1);
    for (const e of circuit.filter(x => !x.inviteTop && rp >= x.minRankingPoints))
      assert.ok(p.bestTier >= e.minTier, `${rp} pts lost ${e.id} (bestTier ${p.bestTier} < ${e.minTier})`);
  }
});

// part B: economy (spec §6, §7)
const at = (d, h = 10, m = 0) => new Date(2026, 9, d, h, m);
const club = (won, gamesWon) => ({ won, gamesWon, scoring: 'sets', ai: 'club' });

test('settleMatch: first win of the day pays ×2, once per day', () => {
  const p0 = newProfile(chars[0]);
  const a = settleMatch(p0, club(true, 6), eco, at(19, 9), at(19, 10));
  assert.equal(a.reward.credits, 2 * (20 + 24 + 40));
  assert.ok(a.reward.lines.some(l => /First win/.test(l.label)));
  const b = settleMatch({ ...a.profile, lastCareerMatch: at(19, 10).toISOString() }, club(true, 6), eco, at(19, 12), at(19, 13));
  assert.equal(b.reward.credits, 84);
  const c = settleMatch(b.profile, club(true, 6), eco, at(20, 9), at(20, 10));
  assert.equal(c.reward.credits, 168);
});

test('settleMatch: streak +10% per match started within 20 min, max +50%, forfeit resets', () => {
  let p = { ...newProfile(chars[0]), lastWinDay: '2026-10-19', lastCareerMatch: at(19, 10).toISOString() };
  const s1 = settleMatch(p, club(false, 3), eco, at(19, 10, 15), at(19, 10, 30));
  assert.equal(s1.profile.streak, 1);
  assert.equal(s1.reward.credits, Math.round(32 * 1.1));
  assert.ok(s1.reward.lines.some(l => l.label === 'Streak +10%'));
  p = { ...s1.profile, streak: 7, lastCareerMatch: at(19, 10, 30).toISOString() };
  assert.equal(settleMatch(p, club(false, 3), eco, at(19, 10, 40), at(19, 11)).reward.credits, Math.round(32 * 1.5));
  assert.equal(settleMatch(p, club(false, 3), eco, at(19, 11, 0), at(19, 11, 20)).profile.streak, 0);  // 30 min gap
  const f = settleMatch(p, { ...club(false, 0), forfeit: true }, eco, at(19, 10, 40), at(19, 10, 41));
  assert.equal(f.profile.streak, 0);
  assert.equal(f.reward.credits, 0);
});

test('form: rusts 0.01/day after 7 idle days down to -0.10; a match gives +0.03, training +0.02', () => {
  const p = { ...newProfile(chars[0]), lastCareerMatch: at(1).toISOString(), formAt: at(1).toISOString() };
  assert.equal(formNow(p, eco, at(8)), 0);
  assert.equal(formNow({ ...p, formAt: undefined }, eco, at(30)), 0);  // profile from before part B: rust starts with its next match
  assert.equal(formNow(p, eco, at(14)), -0.06);
  assert.equal(formNow(p, eco, at(30)), -0.1);
  assert.equal(formNow(newProfile(chars[0]), eco, at(30)), 0);  // never played: no rust
  const m = settleMatch(p, club(false, 3), eco, at(14, 9), at(14));
  assert.equal(m.profile.form, -0.03);
  const t = buyTraining({ ...p, credits: 1000 }, 'speed', eco, at(14)).profile;
  assert.equal(t.form, -0.04);
  assert.equal(formNow(t, eco, at(16)), -0.06);  // rust goes on from the training day, idle days not counted twice
});

test('ranking points expire after 90 days; old profiles start their log today', () => {
  let p = addPoints(newProfile(chars[0]), 100, at(1));
  p = addPoints(p, 50, at(19));
  assert.equal(p.rankingPoints, 150);
  assert.equal(expiringSoon(p, eco, at(1 + 85)), 100);
  const e = expirePoints(p, eco, at(1 + 91));
  assert.equal(e.rankingPoints, 50);
  assert.equal(e.pointsLog.length, 1);
  assert.equal(expirePoints(e, eco, at(1 + 91)), e);  // nothing to do: same object (no save)
  const old = { ...newProfile(chars[0]), rankingPoints: 70 };
  delete old.pointsLog;
  const b = expirePoints(old, eco, at(19));
  assert.equal(b.rankingPoints, 70);
  assert.deepEqual(b.pointsLog, [{ at: at(19).toISOString(), pts: 70 }]);
});

test('loadProfile expires old points and saves the result', () => {
  const store = new Map(), storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  saveProfile(storage, addPoints(newProfile(chars[0]), 100, at(1)));
  const { profile } = loadProfile(storage, at(1 + 91), eco);
  assert.equal(profile.rankingPoints, 0);
  assert.equal(JSON.parse(store.get('padel.career.v1')).rankingPoints, 0);
});

test('applyRating: a new best tier pays tierUpCredits × tier number, once', () => {
  const p = { ...newProfile(chars[0], {}, { level: 2.45, reliability: 0 }), credits: 0 };
  const r = applyRating(p, 2.45, 4, { won: true, games: [6, 0] }, at(19), eco.tierUp);
  assert.equal(r.tierUp.name, 'Intermediate');
  assert.equal(r.bonus, 150 * 4);
  assert.equal(r.profile.credits, 600);
  const again = applyRating({ ...r.profile, level: 2.45 }, 2.45, 4, { won: true, games: [6, 0] }, at(19), eco.tierUp);
  assert.equal(again.bonus, 0);
});

test('review fixes: forfeit keeps the rust, multi-tier jump pays every tier, expiry edge cases', () => {
  const rusty = { ...newProfile(chars[0]), lastCareerMatch: at(1).toISOString(), formAt: at(1).toISOString() };
  const f = settleMatch(rusty, { ...club(false, 0), forfeit: true }, eco, at(30, 9), at(30)).profile;
  const after = applyRating(f, 1.5, 1.5, { won: false, games: [0, 6] }, at(30), eco.tierUp).profile;
  assert.equal(formNow(after, eco, at(30)), -0.1);
  const low = { ...newProfile(chars[0], {}, { level: 0.9, reliability: 0 }), credits: 0 };  // Rookie (1) -> Intermediate (4)?
  const jump = applyRating({ ...low, level: 2.45 }, 2.45, 6, { won: true, games: [6, 0] }, at(19), 150);
  assert.equal(jump.bonus, 150 * (2 + 3 + 4));
  const old = addPoints(newProfile(chars[0]), 100, at(1));
  assert.equal(expiringSoon(old, eco, at(1 + 95)), 0);  // already past expiry: not 'expiring soon'
  assert.equal(expirePoints({ ...old, pointsLog: {} }, eco, at(19)).rankingPoints, 100);  // a broken log does not crash
});

test('bag after a match: remaining counts come back; a tier up adds 2 bananas + 4 water within the limit', () => {
  const p0 = newProfile(chars[0]);
  const m = settleMatch(p0, { ...club(true, 6), bag: { bag_water: 1, bag_banana: 2 } }, eco, at(19, 9), at(19, 10));
  assert.deepEqual(m.profile.bag, { bag_water: 1, bag_banana: 2 });
  assert.deepEqual(settleMatch(p0, club(true, 6), eco, at(19, 9), at(19, 10)).profile.bag, p0.bag);  // no count: unchanged
  const low = { ...newProfile(chars[0], {}, { level: 2.45, reliability: 0 }), bag: { bag_water: 6, bag_banana: 1 } };
  const r = applyRating(low, 2.45, 4, { won: true, games: [6, 0] }, at(19), eco.tierUp, eco.tierUpBag);
  assert.deepEqual(r.profile.bag, { bag_water: 8, bag_banana: 3 });
});
