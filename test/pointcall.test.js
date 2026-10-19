import test from 'node:test';
import assert from 'node:assert/strict';
import { pointCall, teamOf } from '../src/pointcall.js';

test('teamOf maps player indices 0..3 to teams 0 and 1', () => {
  assert.equal(teamOf(0), 0);
  assert.equal(teamOf(1), 0);
  assert.equal(teamOf(2), 1);
  assert.equal(teamOf(3), 1);
  assert.equal(teamOf(null), null);
  assert.equal(teamOf(-1), null);
});

test('pointCall: hit opponent wall directly attributes to losing hitter', () => {
  // Player 0 (team 0) hit glass directly, team 1 scores
  const res = pointCall('hit opponent wall directly', 1, 0);
  assert.deepEqual(res, { pid: 0, team: 0, text: 'hit the glass directly' });

  // Contradiction: hitter on scoring team -> fallback to losing team
  const contra = pointCall('hit opponent wall directly', 1, 2);
  assert.deepEqual(contra, { pid: null, team: 0, text: 'hit the glass directly' });

  // Missing hitter -> fallback to losing team
  const none = pointCall('hit opponent wall directly', 1, null);
  assert.deepEqual(none, { pid: null, team: 0, text: 'hit the glass directly' });
});

test('pointCall: bounced own side attributes to losing hitter', () => {
  // Player 2 (team 1) bounced on own side, team 0 scores
  const res = pointCall('bounced own side', 0, 2);
  assert.deepEqual(res, { pid: 2, team: 1, text: 'bounced it on own side' });

  // Fallback
  const none = pointCall('bounced own side', 0, null);
  assert.deepEqual(none, { pid: null, team: 1, text: 'bounced it on own side' });
});

test('pointCall: hit own mesh attributes to losing hitter', () => {
  // Player 1 (team 0) hit own mesh, team 1 scores
  const res = pointCall('hit own mesh', 1, 1);
  assert.deepEqual(res, { pid: 1, team: 0, text: 'hit own fence' });

  const none = pointCall('hit own mesh', 1, null);
  assert.deepEqual(none, { pid: null, team: 0, text: 'hit own fence' });
});

test('pointCall: double hit attributes to losing hitter', () => {
  // Player 3 (team 1) double hit, team 0 scores
  const res = pointCall('double hit', 0, 3);
  assert.deepEqual(res, { pid: 3, team: 1, text: 'double hit' });

  const none = pointCall('double hit', 0, null);
  assert.deepEqual(none, { pid: null, team: 1, text: 'double hit' });
});

test('pointCall: out distinguishes loser error from winner out-of-court smash', () => {
  // Player 0 (team 0) hit it out, team 1 scores
  const error = pointCall('out', 1, 0);
  assert.deepEqual(error, { pid: 0, team: 0, text: 'hit it out' });

  // Player 0 (team 0) hit a ball that bounced in opponent court and went out, team 0 scores
  const winner = pointCall('out', 0, 0);
  assert.deepEqual(winner, { pid: 0, team: 0, text: 'winner' });

  // Null hitter fallback
  const none = pointCall('out', 1, null);
  assert.deepEqual(none, { pid: null, team: 0, text: 'out' });
});

test('pointCall: double fault attributes to server', () => {
  // Player 2 (team 1) served double fault, team 0 scores
  const res = pointCall('double fault', 0, 2);
  assert.deepEqual(res, { pid: 2, team: 1, text: 'double fault' });

  const none = pointCall('double fault', 0, null);
  assert.deepEqual(none, { pid: null, team: 1, text: 'double fault' });
});

test('pointCall: volleyed serve attributes to receiver', () => {
  // Player 0 (team 0) illegally volleyed the serve, team 1 scores
  const res = pointCall('volleyed serve', 1, 0);
  assert.deepEqual(res, { pid: 0, team: 0, text: 'volleyed the serve' });

  const none = pointCall('volleyed serve', 1, null);
  assert.deepEqual(none, { pid: null, team: 0, text: 'volleyed the serve' });
});

test('pointCall: double bounce attributes winner to scoring hitter', () => {
  // Player 3 (team 1) struck the winning shot, team 1 scores
  const res = pointCall('double bounce', 1, 3);
  assert.deepEqual(res, { pid: 3, team: 1, text: 'winner' });

  // Contradiction: hitter on losing team -> fallback to scoring team
  const contra = pointCall('double bounce', 1, 0);
  assert.deepEqual(contra, { pid: null, team: 1, text: 'winner' });

  // Null hitter -> fallback to scoring team
  const none = pointCall('double bounce', 1, null);
  assert.deepEqual(none, { pid: null, team: 1, text: 'winner' });
});
