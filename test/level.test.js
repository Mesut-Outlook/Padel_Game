import test from 'node:test';
import assert from 'node:assert/strict';
import { TIERS, tierAt, scaleStats, aiLevel, matchShare, rateMatch, questionnaireLevel, playtomicStart, startCredits, idleReliability } from '../src/level.js';

const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ''} ${a} vs ${b}`);
const avg = (s) => Object.values(s).reduce((a, b) => a + b, 0) / 6;

test('tierAt maps the band edges', () => {
  assert.equal(TIERS.length, 8);
  assert.equal(tierAt(0.5).id, 'rookie');
  assert.equal(tierAt(0.99).id, 'rookie');
  assert.equal(tierAt(1).id, 'beginner');
  assert.equal(tierAt(2.49).id, 'club');
  assert.equal(tierAt(6.5).id, 'legend');
  assert.equal(tierAt(7).index, 8);
});

test('scaleStats keeps the shape and hits the target average', () => {
  const s = scaleStats({ speed: 9, power: 8, control: 6, volley: 7, smash: 9, stamina: 6 }, 'rookie');
  near(avg(s), 5, 0.2, 'average');
  assert.ok(s.speed >= s.control);
  for (const v of Object.values(s)) assert.ok(Number.isInteger(v) && v >= 1 && v <= 10, `stat ${v}`);
});

test('aiLevel: a scaled character sits at its difficulty base level', () => {
  const s = { speed: 9, power: 8, control: 6, volley: 7, smash: 9, stamina: 6 };
  near(aiLevel(scaleStats(s, 'club'), 'club'), 2.5, 0.1);
  near(aiLevel(scaleStats(s, 'legend'), 'legend'), 5.8, 0.1);
});

test('rateMatch example from the spec', () => {
  const win = rateMatch({ level: 2.5, reliability: 0.2 }, 2.5, 2.5, true, 6 / 9);
  near(win.delta, 0.0885, 0.002);
  assert.equal(win.level, 2.59);
  near(win.reliability, 0.25, 1e-9);
  near(rateMatch({ level: 2.5, reliability: 0.2 }, 2.5, 2.5, false, 3 / 9).delta, -0.0885, 0.002);
});

test('rateMatch clamps at both ends', () => {
  assert.equal(rateMatch({ level: 6.99, reliability: 0 }, 1, 7, true, 1).level, 7);
  assert.equal(rateMatch({ level: 0.52, reliability: 0 }, 7, 0.5, false, 0).level, 0.5);
});

test('matchShare handles empty and missing scores', () => {
  near(matchShare({ games: [6, 3] }), 0.667, 0.01);
  near(matchShare({ points: [16, 10] }), 0.615, 0.01);
  assert.equal(matchShare({ games: [0, 0], won: true }), 0.6);
  assert.equal(matchShare({ won: false }), 0.4);
});

test('questionnaire maps 5 answers of 0-3 onto 0.5-4.0', () => {
  assert.equal(questionnaireLevel([0, 0, 0, 0, 0]), 0.5);
  assert.equal(questionnaireLevel([3, 3, 3, 3, 3]), 4);
});

test('playtomicStart parses comma decimals and clamps', () => {
  assert.deepEqual(playtomicStart('4,25'), { level: 4.25, reliability: 0.3 });
  assert.equal(playtomicStart('6.8').level, 4.5);
  assert.equal(playtomicStart('0.1').level, 0.5);
  assert.equal(playtomicStart(''), null);
  assert.equal(playtomicStart('abc'), null);
});

test('startCredits: Credits for a high start only', () => {
  assert.equal(startCredits(1.5), 0);
  assert.equal(startCredits(2.5), 750);
  assert.equal(startCredits(4.5), 1250);
});

test('idleReliability drops after 14 idle days, never below 0.3', () => {
  assert.equal(idleReliability(0.8, 10), 0.8);
  near(idleReliability(0.8, 24), 0.7, 1e-9);
  assert.equal(idleReliability(0.5, 400), 0.3);
});
