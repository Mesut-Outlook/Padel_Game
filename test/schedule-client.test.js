import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleToken, clockOffset, relTime, slotsFor, dayStrip, quickSlots, icsFor } from '../src/schedule.js';
import { scheduleCall } from '../src/net.js';
import { startServer } from '../server/server.js';

const M = 60000, H = 60 * M;
const withTz = (tz, fn) => { const old = process.env.TZ; process.env.TZ = tz; try { return fn(); } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; } };
const local = (y, mo, d, h, mi) => new Date(y, mo, d, h, mi).getTime();

test('scheduleToken: made once per browser, 22 url-safe characters; blocked storage still gives a token', () => {
  const map = new Map(), storage = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
  const a = scheduleToken(storage);
  assert.match(a, /^[A-Za-z0-9_-]{22}$/);
  assert.equal(scheduleToken(storage), a);
  assert.match(scheduleToken({ getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } }), /^[A-Za-z0-9_-]{22}$/);
});

test('relTime uses the server clock: a client 3 h fast still reads "in 2 h 0 min"', () => {
  const server = Date.UTC(2026, 10, 8, 19, 0), client = server + 3 * H, off = clockOffset(server, client);
  assert.equal(off, -3 * H);
  assert.deepEqual(relTime(server + 2 * H, off, client), { key: 'in {h} h {m} min', h: 2, m: 0 });
  assert.deepEqual(relTime(server + 25 * M, off, client), { key: 'in {m} min', h: 0, m: 25 });
  assert.equal(relTime(server + 30 * 1000, off, client).key, 'now');
  assert.equal(relTime(server - M, off, client).key, 'started');
});

test('slotsFor gives local half-hours: today from now+15 min, later days from 00:00', () => {
  for (const tz of ['Europe/Amsterdam', 'America/New_York']) withTz(tz, () => {
    const now = local(2026, 10, 8, 20, 50);
    const today = slotsFor(0, now, 0);
    assert.deepEqual(today.map(s => s.label), ['21:30', '22:00', '22:30', '23:00', '23:30']);
    assert.equal(new Date(today[0].at).getHours(), 21);
    const tomorrow = slotsFor(1, now, 0);
    assert.equal(tomorrow.length, 48); assert.equal(tomorrow[0].label, '00:00'); assert.equal(tomorrow[47].label, '23:30');
  });
});

test('dayStrip: seven days from today with the number of games on each', () => withTz('Europe/Amsterdam', () => {
  const now = local(2026, 10, 8, 12, 0);
  const strip = dayStrip([{ at: local(2026, 10, 8, 21, 0) }, { at: local(2026, 10, 8, 22, 0) }, { at: local(2026, 10, 14, 20, 0) }], now, 0);
  assert.equal(strip.length, 7);
  assert.deepEqual(strip.map(d => d.count), [2, 0, 0, 0, 0, 0, 1]);
  assert.equal(new Date(strip[1].date).getDate(), 9);
}));

test('quickSlots: tonight 20:00/21:00/22:00 that are still 15 min away, then tomorrow\'s', () => withTz('Europe/Amsterdam', () => {
  const at = (h, d = 8) => local(2026, 10, d, h, 0);
  assert.deepEqual(quickSlots(local(2026, 10, 8, 12, 0), 0).map(s => s.at), [at(20), at(21), at(22)]);
  assert.deepEqual(quickSlots(local(2026, 10, 8, 20, 50), 0).map(s => s.at), [at(22), at(20, 9), at(21, 9)]);
  assert.deepEqual(quickSlots(local(2026, 10, 8, 21, 50), 0).map(s => [s.label, s.dayOffset]), [['20:00', 1], ['21:00', 1], ['22:00', 1]]);
}));

test('icsFor: a UTC 90-minute event with the site link and no player names', () => {
  const ics = icsFor({ id: 'g1', at: Date.UTC(2026, 10, 8, 20, 0), host: { name: 'Mesut' } }, 'Padel Legends match');
  assert.match(ics, /BEGIN:VCALENDAR[\s\S]*BEGIN:VEVENT/);
  assert.match(ics, /DTSTART:20261108T200000Z/); assert.match(ics, /DTEND:20261108T213000Z/);
  assert.match(ics, /URL:https:\/\/padellegends\.eu\//);
  assert.equal(ics.includes('Mesut'), false);
  assert.ok(ics.includes('\r\n'));
});

test('scheduleCall: one short socket, the reply sanitised to plain fields', async () => {
  const srv = await startServer(0, { statePath: '' });
  try {
    const url = `ws://127.0.0.1:${srv.port}`;
    const at = Math.ceil((Date.now() + 2 * H) / (30 * M)) * 30 * M;
    const ok = await scheduleCall(url, { type: 'schedule:post', at, players: 2, mode: 'face', open: false, token: 'tok-abcdefgh-1', name: 'A', char: 1, level: 3 });
    assert.equal(ok.type, 'schedule:ok'); assert.equal(ok.games[0].mine, 'host'); assert.equal(typeof ok.games[0].host.name, 'string');
    const err = await scheduleCall(url, { type: 'schedule:ask', id: 'nope', token: 'tok-abcdefgh-2' });
    assert.equal(err.type, 'error'); assert.equal(err.msg, 'Game not found.');
    const list = await scheduleCall(url, { type: 'schedule:list' });
    assert.equal(list.games.length, 1); assert.equal(typeof list.now, 'number'); assert.ok(Number.isInteger(list.clients) && list.clients >= 0);  // earlier short sockets may still be closing
  } finally { await srv.close(); }
});

test('fix: scheduleToken({ create: false }) reads an existing token but never makes one', () => {
  const store = {}, storage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  assert.equal(scheduleToken(storage, { create: false }), null);
  assert.deepEqual(store, {});
  const tok = scheduleToken(storage);
  assert.equal(scheduleToken(storage, { create: false }), tok);
});
