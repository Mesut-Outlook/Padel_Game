import test from 'node:test';
import assert from 'node:assert/strict';
import { createSchedule, SCHEDULE } from '../server/schedule.js';

const M = 60000, H = 60 * M, D = 24 * H;
const T0 = Date.UTC(2026, 10, 8, 12, 0);  // "now" in every test: Sunday 12:00 UTC
const at21 = Date.UTC(2026, 10, 8, 21, 0);
let n = 0;
const make = (lim = {}, state = null) => createSchedule({ newId: () => `g${++n}`, ...lim }, state);
const who = (i, extra = {}) => ({ th: `th${i}x`.padEnd(64, '0'), vk: `vk${i}x`, name: `P${i}`, char: i % 9, level: 2.5, ...extra });
const post = (s, i, at = at21, extra = {}) => s.post({ at, players: 2, mode: 'face', open: false, ...who(i), ...extra }, T0);

test('post: only half-hour slots from now+15 min to 7 days ahead', () => {
  const s = make();
  for (const at of [at21 + 10 * M, T0 - 30 * M, T0 + 0, T0 + 8 * D]) assert.equal(post(s, 1, at).err, 'That time is not available.');
  assert.equal(post(s, 1, T0 + D + 30 * M).ok, true);
  assert.equal(post(make(), 2, T0 + 30 * M).ok, true);  // 30 min ahead is past the 15-minute lead
});

test('post: a 9th game overlapping the same 90-minute window is refused', () => {
  const s = make();
  for (let i = 0; i < 8; i++) assert.equal(post(s, i).ok, true);
  assert.equal(post(s, 8, at21 + 30 * M).err, 'That time slot is full. Pick another time.');
  assert.equal(post(s, 9, at21 + 90 * M).ok, true);
  assert.equal(s.slotTaken(at21), 8);
});

test('post: one posting per visitor, by token hash or by visitor key', () => {
  const s = make();
  assert.equal(post(s, 1).ok, true);
  assert.equal(post(s, 2, at21 + 2 * H, { th: who(1).th }).err, 'You already have a game posted.');
  assert.equal(post(s, 2, at21 + 2 * H, { vk: 'vk1x' }).err, 'You already have a game posted.');
});

test('post: the schedule holds at most 60 games', () => {
  const s = make({ maxPosts: 2 });
  post(s, 1); post(s, 2, at21 + 2 * H);
  assert.equal(post(s, 3, at21 + 4 * H).err, 'The schedule is full. Try again later.');
});

test('ask: an open game seats at once, a closed one queues the request', () => {
  const s = make();
  const open = post(s, 1, at21, { open: true }).game, closed = post(s, 2, at21 + 2 * H).game;
  assert.deepEqual(s.ask({ id: open.id, ...who(3) }, T0), { ok: true, status: 'accepted' });
  assert.deepEqual(s.ask({ id: closed.id, ...who(4) }, T0), { ok: true, status: 'pending' });
  assert.equal(s.ask({ id: open.id, ...who(5) }, T0).err, 'This game is full.');  // singles: one guest seat
  assert.equal(s.ask({ id: 'nope', ...who(5) }, T0).err, 'Game not found.');
});

test('ask: two bookings per visitor, eight pending requests per game', () => {
  const s = make();
  const g = [1, 2, 3].map(i => post(s, i, at21 + (i - 1) * 2 * H, { players: 4 }).game);
  s.ask({ id: g[0].id, ...who(9) }, T0); s.ask({ id: g[1].id, ...who(9) }, T0);
  assert.equal(s.ask({ id: g[2].id, ...who(9) }, T0).err, 'You already have two games booked.');
  assert.equal(s.ask({ id: g[2].id, ...who(10, { vk: 'vk9x' }) }, T0).err, 'You already have two games booked.');
  for (let i = 20; i < 28; i++) assert.equal(s.ask({ id: g[2].id, ...who(i) }, T0).ok, true);
  assert.equal(s.ask({ id: g[2].id, ...who(30) }, T0).err, 'This game has enough requests.');
});

test('answer: only the host decides; a declined guest sees declined', () => {
  const s = make();
  const g = post(s, 1, at21, { players: 4 }).game;
  s.ask({ id: g.id, ...who(2) }, T0); s.ask({ id: g.id, ...who(3) }, T0);
  const reqs = s.list(who(1).th, T0)[0].requests;
  assert.equal(reqs.length, 2);
  assert.equal(s.answer({ id: g.id, reqId: reqs[0].reqId, accept: true, th: who(2).th }, T0).ok, false);
  assert.equal(s.answer({ id: g.id, reqId: reqs[0].reqId, accept: true, th: who(1).th }, T0).ok, true);
  assert.equal(s.answer({ id: g.id, reqId: reqs[1].reqId, accept: false, th: who(1).th }, T0).ok, true);
  assert.equal(s.list(who(2).th, T0)[0].mine, 'seat');
  assert.equal(s.list(who(3).th, T0)[0].mine, 'declined');
});

test('cancel after acceptance frees the seat for a pending request', () => {
  const s = make();
  const g = post(s, 1).game;
  s.ask({ id: g.id, ...who(2) }, T0); s.ask({ id: g.id, ...who(3) }, T0);
  const [r2, r3] = s.list(who(1).th, T0)[0].requests;
  s.answer({ id: g.id, reqId: r2.reqId, accept: true, th: who(1).th }, T0);
  assert.equal(s.answer({ id: g.id, reqId: r3.reqId, accept: true, th: who(1).th }, T0).err, 'This game is full.');
  assert.equal(s.cancel({ id: g.id, th: who(2).th }, T0).ok, true);
  assert.equal(s.answer({ id: g.id, reqId: r3.reqId, accept: true, th: who(1).th }, T0).ok, true);
  assert.equal(s.list(who(2).th, T0)[0].mine, null);
});

test('sweep: pending requests are accepted 60 min before the start, first come first served while seats last', () => {
  const s = make();
  const g = post(s, 1, at21, { players: 4 }).game;
  for (const i of [2, 3, 4, 5]) s.ask({ id: g.id, ...who(i) }, T0);
  s.sweep(at21 - 61 * M);
  assert.equal(s.list(who(2).th, T0)[0].mine, 'pending');
  s.sweep(at21 - 60 * M);
  assert.deepEqual(s.seatsFor(g.id).map(p => p.name), ['P1', 'P2', 'P3', 'P4']);
  assert.equal(s.list(who(5).th, T0)[0].mine, 'pending');
});

test('sweep: a game starts once at its time and expires 15 min later; a deleted one stays visible to its guests as cancelled', () => {
  const s = make();
  const g = post(s, 1).game, h = post(s, 2, at21 + 2 * H).game;
  s.ask({ id: h.id, ...who(3) }, T0);
  assert.equal(s.remove({ id: h.id, th: who(3).th }, T0).ok, false);  // not the host
  assert.equal(s.remove({ id: h.id, th: who(2).th }, T0).ok, true);
  assert.equal(s.list(who(3).th, T0).find(x => x.id === h.id).mine, 'cancelled');
  assert.equal(s.list('someone', T0).some(x => x.id === h.id), false);
  assert.deepEqual(s.sweep(at21).started.map(x => x.id), [g.id]);
  assert.deepEqual(s.sweep(at21 + M).started, []);
  assert.deepEqual(s.sweep(at21 + 15 * M).expired, [g.id]);
  assert.equal(s.list('x', at21 + 15 * M).some(x => x.id === g.id), false);
});

test('sweep: a clock earlier than the newest posting changes nothing', () => {
  const s = make();
  const g = post(s, 1).game;
  assert.deepEqual(s.sweep(T0 - D), { started: [], expired: [] });
  assert.equal(s.list('x', T0).length, 1);
  assert.ok(g);
});

test('list: tokens and visitor keys never leave; the host sees requests; free counts singles and doubles', () => {
  const s = make();
  post(s, 1); post(s, 2, at21 + 2 * H, { players: 4 });
  s.ask({ id: s.list('x', T0)[1].id, ...who(3) }, T0);
  const pub = s.list('x', T0);
  assert.deepEqual(pub.map(g => g.free), [1, 3]);
  assert.equal(pub[1].requests, undefined);
  const txt = JSON.stringify(s.list(who(2).th, T0));
  for (const secret of ['th1x', 'th2x', 'th3x', 'vk1x', 'vk2x', 'vk3x']) assert.equal(txt.includes(secret), false, secret);
  assert.equal(s.list(who(2).th, T0)[1].requests.length, 1);
  assert.match(s.list(who(2).th, T0)[1].requests[0].reqId, /^[0-9a-z]{8}$/);
});

test('toJSON round-trip keeps games, seats, requests and createdAt, but no visitor keys', () => {
  const s = make();
  const g = post(s, 1, at21, { players: 4 }).game;
  s.ask({ id: g.id, ...who(2) }, T0);
  const json = JSON.parse(JSON.stringify(s.toJSON()));
  assert.equal(JSON.stringify(json).includes('vk1x'), false);
  const r = make({}, json);
  assert.deepEqual(r.list(who(1).th, T0), s.list(who(1).th, T0));
  assert.equal(SCHEDULE.aheadDays, 7);
});

test('fix: a Team up doubles game has one guest seat (humans sit in 0 and 1), Face off has three', () => {
  const s = make();
  const team = post(s, 1, at21, { players: 4, mode: 'team', open: true }).game.id;
  const face = post(s, 2, at21, { players: 4, mode: 'face', open: true }).game.id;
  assert.equal(s.list(null, T0).find(g => g.id === team).free, 1);
  assert.equal(s.list(null, T0).find(g => g.id === face).free, 3);
  assert.equal(s.ask({ id: team, ...who(3) }, T0).status, 'accepted');
  assert.equal(s.ask({ id: team, ...who(4) }, T0).err, 'This game is full.');
});

test('fix: cancelled games do not fill the schedule; an empty one is gone at once', () => {
  const s = make({ maxPosts: 3 });
  for (let i = 0; i < 5; i++) { const id = post(s, 1).game.id; s.remove({ id, th: who(1).th }); }
  assert.equal(s.get('g1'), undefined, 'nobody to tell: deleted');
  for (let i = 0; i < 3; i++) assert.equal(post(s, 10 + i, at21 + i * 2 * H).ok, true);
});

test('fix: the declined list keeps only the newest entries', () => {
  const s = make();
  const id = post(s, 1).game.id;
  for (let i = 0; i < 60; i++) { s.ask({ id, ...who(100 + i) }, T0); const r = s.list(who(1).th, T0)[0].requests[0]; s.answer({ id, reqId: r.reqId, accept: false, th: who(1).th }, T0); }
  assert.ok(s.get(id).declined.length <= 32);
});

test('fix: no asking or answering once the game has started', () => {
  const s = make();
  const id = post(s, 1).game.id;
  s.ask({ id, ...who(2) }, T0);
  const reqId = s.list(who(1).th, T0)[0].requests[0].reqId;
  assert.equal(s.ask({ id, ...who(3) }, at21).err, 'Game not found.');
  assert.equal(s.answer({ id, reqId, accept: true, th: who(1).th }, at21).err, 'Game not found.');
});

test('fix: a state file of the wrong shape starts an empty schedule instead of throwing', () => {
  assert.doesNotThrow(() => createSchedule({}, { games: [{}] }));
  assert.equal(createSchedule({}, { games: [{}] }).list(null, T0).length, 0);
});
