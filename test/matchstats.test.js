import test from 'node:test';
import assert from 'node:assert/strict';
import { newTally, tallyEvents, tallyFrame, xpFromTally } from '../src/matchstats.js';
import { newWorld } from '../src/game.js';
import eco from '../data/economy.json' with { type: 'json' };

const hit = (pid, shot, more = {}) => ({ type: 'hit', pid, shot, mistake: null, speed: 15, quality: 'good', volley: false, ...more });
const point = (team, why, rally) => ({ type: 'point', team, why, rally });

test('tally: volleys and smashes made, a point lost on my volley counts it missed', () => {
  const t = newTally();
  tallyEvents(t, [hit(0, 'volley', { volley: true }), hit(2, 'drive'), hit(0, 'smash'), point(0, 'double bounce', 3)], 0);
  tallyEvents(t, [hit(0, 'volley', { volley: true }), point(1, 'out', 1)], 0);  // my volley went out
  tallyEvents(t, [hit(0, 'bandeja', { mistake: 'net' })], 0);
  assert.deepEqual(t.volley, [1, 1]);
  assert.deepEqual(t.smash, [1, 1]);
});

test('tally: clean 4+ rallies, 8+ long rallies, hard clean drives; other players do not count', () => {
  const t = newTally();
  tallyEvents(t, [hit(0, 'drive', { speed: 30 }), hit(2, 'drive'), hit(1, 'lob'), point(0, 'double bounce', 4)], 0);
  tallyEvents(t, [hit(1, 'drive', { speed: 30 }), point(1, 'out', 9)], 0);  // I did not hit: not clean for me, still long
  assert.equal(t.clean, 1);
  assert.equal(t.long, 1);
  assert.equal(t.drives, 1);
});

test('tally frames: distance (no teleports), seconds tired and dry', () => {
  const t = newTally();
  tallyFrame(t, { p: [0, 5], energy: 1, hyd: 1 }, 0.5);
  tallyFrame(t, { p: [0.5, 5], energy: 0.2, hyd: 0.2 }, 0.5);
  tallyFrame(t, { p: [4, 9], energy: 0.2, hyd: 1 }, 0.5);  // reset to serve position: not run
  assert.equal(t.dist, 0.5);
  assert.equal(t.tiredSec, 1);
  assert.equal(t.drySec, 0.5);
});

test('xpFromTally: whole points per stat from eco.xp weights', () => {
  const t = { ...newTally(), volley: [5, 1], smash: [2, 0], drives: 10, clean: 4, long: 2, dist: 400 };
  const xp = xpFromTally(t, eco);
  for (const k of ['speed', 'power', 'control', 'volley', 'smash', 'stamina']) assert.ok(Number.isInteger(xp[k]) && xp[k] > 0, k);
  assert.equal(xpFromTally(newTally(), eco).volley, 0);
});

test('hit events say whether the ball was volleyed', () => {
  assert.equal(typeof newWorld, 'function');  // the flag itself is checked in game.test.js (volley hit)
});
