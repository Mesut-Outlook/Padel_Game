import test from 'node:test';
import assert from 'node:assert/strict';
import { lobbyView, lobbyHtml } from '../src/lobbyview.js';

const chars = [{ name: 'Erhan' }, { name: 'Burcu' }, { name: 'Daan' }];
const venues = [{ name: 'Madrid Indoor Arena' }];
const lobby = (o = {}) => ({ code: 'ABC234', cfg: { players: 4, sets: 3, goldenPoint: true, venue: 0 }, seats: [0, 2, 1, 3], taken: [0], away: [], chars: { 0: 0, 2: 1 }, names: { 0: 'Mesut' }, started: false, host: 0, ...o });

test('lobbyView: seats by team with names, you, host, free seats and who may start', () => {
  const v = lobbyView(lobby({ taken: [0, 2], names: { 0: 'Mesut' } }), 2, chars, venues);
  assert.deepEqual(v.seats.map(s => [s.id, s.team, s.name, s.you, s.host, s.human]), [
    [0, 0, 'Mesut', false, true, true], [1, 0, '', false, false, false], [2, 1, 'Burcu', true, false, true], [3, 1, '', false, false, false]]);
  assert.equal(v.hostName, 'Mesut');
  assert.equal(v.amHost, false);
  assert.equal(v.canStart, false, 'a guest never starts');
  assert.equal(lobbyView(lobby({ taken: [0, 2] }), 0, chars, venues).canStart, true);
  assert.equal(lobbyView(lobby(), 0, chars, venues).canStart, false, 'the host alone cannot start');
  assert.deepEqual(lobbyView(lobby({ cfg: { players: 2, sets: 1, goldenPoint: false, venue: 0 } }), 0).rules.deuce, 'adv');
});

test('lobbyHtml: escapes player names and says what to do next', () => {
  const html = lobbyHtml(lobbyView(lobby({ taken: [0, 2], names: { 0: '<img src=x>' } }), 2, chars, venues));
  assert.ok(!html.includes('<img'), html);
  assert.ok(html.includes('&lt;img src=x&gt;'));
  assert.match(html, /Waiting for &lt;img src=x&gt; to start/);
  assert.match(lobbyHtml(lobbyView(lobby(), 0, chars, venues)), /Send the invite link/);
  assert.match(lobbyHtml(lobbyView(lobby({ away: [2], taken: [0], names: { 0: 'A', 2: 'B' } }), 0, chars, venues)), /reconnecting/);
});
