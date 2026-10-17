import test from 'node:test';
import assert from 'node:assert/strict';
import { createTournament, currentMatches, myMatch, reportResult, simulateOthers, simulateMatch, standings, isFinished, placement } from '../src/tournament.js';

const seeded = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const people = (n) => Array.from({ length: n }, (_, i) => ({ id: i === 0 ? 'me' : 'p' + i, name: 'P' + i, rating: 4 + (i % 5) }));
const sideIds = (x) => [].concat(x);
// plays the human's match (if any) with a fixed score, then simulates the rest of the round
function playRound(T, rng, mine = { a: 16, b: 10 }) {
  const m = myMatch(T);
  if (m) T = reportResult(T, m, mine);
  return simulateOthers(T, rng);
}

test('americano: 8 players, 7 rounds on 2 courts, every player partners every other exactly once', () => {
  let T = createTournament({ format: 'americano', entrants: people(8), rng: seeded(1) });
  const partners = {};
  const rng = seeded(2);
  for (let r = 0; r < 7; r++) {
    const ms = currentMatches(T);
    assert.equal(ms.length, 2);
    for (const m of ms) for (const [x, y] of [m.a, m.b]) { (partners[x] ??= []).push(y); (partners[y] ??= []).push(x); }
    T = playRound(T, rng);
  }
  assert.ok(isFinished(T));
  for (const [id, list] of Object.entries(partners)) assert.equal(new Set(list).size, 7, id);
});

test('americano: individual points equal the team points of each match', () => {
  let T = createTournament({ format: 'americano', entrants: people(8), rng: seeded(1) });
  const m = myMatch(T), mate = m.a.includes('me') ? m.a.find(x => x !== 'me') : m.b.find(x => x !== 'me');
  const mineOnA = m.a.includes('me');
  T = reportResult(T, m, mineOnA ? { a: 14, b: 10 } : { a: 10, b: 14 });
  const st = standings(T);
  assert.equal(st.find(s => s.id === 'me').points, 14);
  assert.equal(st.find(s => s.id === mate).points, 14);
  assert.equal(st.find(s => s.id === 'me').diff, 4);
});

test('mexicano: round 2 puts the top 4 on court 1 as (1+4) vs (2+3)', () => {
  let T = createTournament({ format: 'mexicano', entrants: people(8), rng: seeded(3) });
  T = playRound(T, seeded(4));
  const top = standings(T).map(s => s.id);
  const c1 = currentMatches(T).find(m => m.court === 1);
  assert.deepEqual([...c1.a].sort(), [top[0], top[3]].sort());
  assert.deepEqual([...c1.b].sort(), [top[1], top[2]].sort());
  for (let r = 1; r < 5; r++) T = playRound(T, seeded(10 + r));
  assert.ok(isFinished(T));
});

test('knockout of 8 pairs: 7 matches, one champion, seeded 1 v 8 in round 1', () => {
  const pairs = people(8).map((p, i) => ({ ...p, rating: 9 - i }));
  let T = createTournament({ format: 'knockout', entrants: pairs, rng: seeded(5) });
  assert.deepEqual([sideIds(currentMatches(T)[0].a)[0], sideIds(currentMatches(T)[0].b)[0]], ['me', 'p7']);
  let played = 0;
  const rng = seeded(6);
  while (!isFinished(T)) { played += currentMatches(T).length; T = playRound(T, rng, { a: 6, b: 3 }); }
  assert.equal(played, 7);
  assert.equal(standings(T).filter(s => placement(T, s.id) === 1).length, 1);
  assert.equal(placement(T, 'me'), 1, 'me wins every match 6-3');
});

test('league of 5 pairs: round robin of 10 matches, table by wins then game difference', () => {
  let T = createTournament({ format: 'league', entrants: people(5), rng: seeded(7) });
  let played = 0;
  const rng = seeded(8);
  while (!isFinished(T)) { played += currentMatches(T).length; T = playRound(T, rng, { a: 6, b: 0 }); }
  assert.equal(played, 10);
  const st = standings(T);
  assert.equal(st[0].id, 'me');
  assert.equal(st[0].wins, 4);
  for (let i = 1; i < st.length; i++) assert.ok(st[i - 1].wins > st[i].wins || (st[i - 1].wins === st[i].wins && st[i - 1].diff >= st[i].diff));
});

test('a tournament saved as JSON after round 3 resumes identically', () => {
  const run = (roundtrip) => {
    let T = createTournament({ format: 'mexicano', entrants: people(8), rng: seeded(9) });
    const rng = seeded(10);
    for (let r = 0; r < 5; r++) { if (roundtrip && r === 3) T = JSON.parse(JSON.stringify(T)); T = playRound(T, rng); }
    return standings(T);
  };
  assert.deepEqual(run(true), run(false));
});

test('simulateMatch: rating 8 beats rating 4 in more than 70% of 200 matches', () => {
  const rng = seeded(11);
  let wins = 0;
  for (let i = 0; i < 200; i++) { const s = simulateMatch(8, 4, { pointsTo: 16 }, rng); if (s.a > s.b) wins++; }
  assert.ok(wins > 140, String(wins));
  const set = simulateMatch(5, 5, { sets: 1 }, rng);
  assert.ok(Math.max(set.a, set.b) >= 6, JSON.stringify(set));
});
