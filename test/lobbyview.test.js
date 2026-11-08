import test from 'node:test';
import assert from 'node:assert/strict';
import { lobbyView, lobbyHtml, aloneOnline, roomEndCard } from '../src/lobbyview.js';

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

test('lobbyView: a hostile server cannot put markup in the rules line', () => {
  const v = lobbyView({ seats: [0], taken: [0], cfg: { sets: '<img src=x onerror=alert(1)>' } }, 0);
  assert.equal(v.rules.sets, 3);
  assert.ok(!lobbyHtml(v).includes('<img'));
});

test('aloneOnline: true only when no other human players remain in the match', () => {
  // Invalid or empty lobbies
  assert.equal(aloneOnline(null, 0), false);
  assert.equal(aloneOnline({}, 0), false);
  assert.equal(aloneOnline({ taken: [] }, 0), false);
  assert.equal(aloneOnline({ taken: [2] }, 0), false, 'not alone if not even seated in taken');

  // Human alone in room
  assert.equal(aloneOnline({ taken: [0] }, 0), true);
  assert.equal(aloneOnline({ taken: [2] }, 2), true);
  assert.equal(aloneOnline({ taken: [0] }), true, 'seat optional');

  // Multiple humans
  assert.equal(aloneOnline({ taken: [0, 2] }, 0), false);
  assert.equal(aloneOnline({ taken: [0, 1, 2, 3] }, 0), false);
  assert.equal(aloneOnline({ taken: [0, 2] }), false);

  // Another player left (leftSeat)
  assert.equal(aloneOnline({ taken: [0, 2] }, 0, 2), true, 'opponent in seat 2 left -> player 0 is alone');
  assert.equal(aloneOnline({ taken: [0, 1, 2] }, 0, 2), false, 'seat 2 left but seat 1 remains');
  assert.equal(aloneOnline({ taken: [0, 2] }, null, 2), true, 'leftSeat without seat');
});

test('roomEndCard: chooses which card to show on room errors', () => {
  // Case 1: Invite link / code with room not found or room full -> 'ended'
  assert.equal(roomEndCard('Room not found', { code: 'ABC234', started: false }), 'ended');
  assert.equal(roomEndCard('Room is full or match already started', { code: 'ABC234', started: false }), 'ended');
  assert.equal(roomEndCard('Room not found', { code: 'ABC234' }), 'ended', 'started defaults to false');

  // Case 1 exclusions: missing code or match already started -> null
  assert.equal(roomEndCard('Room not found', { code: '', started: false }), null);
  assert.equal(roomEndCard('Room not found', { started: false }), null);
  assert.equal(roomEndCard('Room not found', { code: 'ABC234', started: true }), null);
  assert.equal(roomEndCard('Room is full or match already started', { code: '', started: false }), null);
  assert.equal(roomEndCard('Room is full or match already started', { code: 'ABC234', started: true }), null);

  // Case 2: Connection closed while waiting -> 'nobody'
  assert.equal(roomEndCard('Connection closed', { started: false }), 'nobody');
  assert.equal(roomEndCard('Connection closed', { code: 'ABC234', started: false }), 'nobody');
  assert.equal(roomEndCard('Connection closed', { code: '', started: false }), 'nobody');
  assert.equal(roomEndCard('Connection closed'), 'nobody', 'defaults options to empty object with started: false');

  // Case 2 exclusions: match already started -> null
  assert.equal(roomEndCard('Connection closed', { started: true }), null);
  assert.equal(roomEndCard('Connection closed', { code: 'ABC234', started: true }), null);

  // Other server errors / invalid inputs -> null
  assert.equal(roomEndCard('Server did not answer', { code: 'ABC234', started: false }), null);
  assert.equal(roomEndCard('The match was closed.', { code: 'ABC234', started: false }), null);
  assert.equal(roomEndCard('Could not connect to the game server.', { code: 'ABC234', started: false }), null);
  assert.equal(roomEndCard(null), null);
  assert.equal(roomEndCard(undefined), null);
});


