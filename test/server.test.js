import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { startServer } from '../server/server.js';
import { readFileSync } from 'node:fs';

const ROSTER = JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url))).length;

// one client: resolves with the first message of `type`
function client(port) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const open = new Promise(r => ws.once('open', r));
  const next = (type) => new Promise(r => { const on = (raw) => { const m = JSON.parse(raw); if (m.type === type) { ws.off('message', on); r(m); } }; ws.on('message', on); });
  const send = async (m) => { await open; ws.send(JSON.stringify(m)); };
  return { ws, next, send };
}
// create: the server picks the room code (it comes back in the lobby); join: an existing room by code
const create = async (c, m = {}) => { const p = c.next('lobby'); await c.send({ type: 'join', create: true, ...m }); return p; };
const join = async (c, code, m = {}) => { const p = c.next('lobby'); await c.send({ type: 'join', code, ...m }); return p; };
const list = async (port) => { const c = client(port); const p = c.next('rooms'); await c.send({ type: 'list' }); const m = await p; c.ws.close(); return m.rooms; };

test('room list shows public open rooms only, and drops them once started', async () => {
  const srv = await startServer(0);
  try {
    const host = client(srv.port), priv = client(srv.port);
    const { code } = await create(host, { public: true, name: 'Mesut', cfg: { players: 2, venue: 3 } });
    await create(priv, { cfg: { players: 2 } });
    assert.deepEqual(await list(srv.port), [{ code, players: 2, venue: 3, free: 1, host: 'Mesut' }]);
    const lob = host.next('lobby');
    await host.send({ type: 'start' });
    await lob;
    assert.deepEqual(await list(srv.port), []);
    host.ws.close(); priv.ws.close();
  } finally { await srv.close(); }
});

test('join keeps a small look, drops an oversized one, and works without one', async () => {
  const srv = await startServer(0);
  try {
    const a = client(srv.port), b = client(srv.port), c = client(srv.port);
    const look = { hair: 'Hair_Buns', hairColor: '#c9a15e', name: 'x' };
    const l1 = await create(a, { name: 'Ada', look, cfg: { players: 4 } });
    assert.deepEqual(l1.looks, { 0: look });
    const l2 = await join(b, l1.code, { name: 'Big', look: { pad: 'x'.repeat(3000) } });
    assert.equal(l2.looks[2], undefined);
    assert.deepEqual(l2.names, { 0: 'Ada', 2: 'Big' });
    assert.equal((await join(c, l1.code, { char: 3 })).taken.length, 3);
    for (const x of [a, b, c]) x.ws.close();
  } finally { await srv.close(); }
});

test('host ball spec, player shoes and bag are clamped into the room world', async () => {
  const srv = await startServer(0);
  try {
    const a = client(srv.port);
    const { code } = await create(a, { cfg: { players: 2 }, ball: { speed: 9, bounce: 1.04 }, shoes: { speed: 5, agility: 0.1 }, bag: { bag_water: 99, bag_gel: -3, bag_banana: 2.7, steak: 5 } });
    const w = srv.rooms.get(code).world;
    assert.deepEqual(w.ballSpec, { speed: 1.12, bounce: 1.04 });
    assert.equal(w.ball.bounce, 1.04);
    assert.deepEqual(w.players[0].shoes, { speed: 0.12, agility: 0.1 });
    assert.deepEqual(w.players[0].bag, { bag_water: 16, bag_isotonic: 0, bag_banana: 2, bag_gel: 0 });  // counts only: effects live in game.js
    assert.equal(w.players[2].bag.bag_water, Infinity);  // AI seat: the default bag
    a.ws.close();
  } finally { await srv.close(); }
});

test('join: look is whitelisted (bad markup/colours/keys dropped), stats and racket clamped to 1-10', async () => {
  const srv = await startServer(0);
  try {
    const a = client(srv.port);
    const lob = a.next('lobby');
    await a.send({ type: 'join', create: true, cfg: { players: 2 }, char: 999,
      stats: { volley: 1000, speed: 'x', evil: 5 }, racket: { power: -50 },
      look: { name: 'x <img src=x onerror=alert(1)>', hair: 'Hair_Buns', hairColor: 'red;background:url(x)', skinTone: '#AABBCC', beard: 'full', outfit: { shirt: '#112233', shorts: 'javascript:1' }, body: { type: 'tall', height: 9 }, onclick: 'x', hand: 'left', glasses: '#000000', headwear: { type: 'crown', color: '#ffffff' } } });
    const l = await lob, look = l.looks[0];
    assert.equal(look.name, 'x img srcx onerr');
    assert.equal(look.hair, 'Hair_Buns');
    assert.equal(look.hairColor, undefined);
    assert.equal(look.skinTone, '#AABBCC');
    assert.deepEqual(look.outfit, { shirt: '#112233' });
    assert.deepEqual(look.body, { type: 'tall', height: 1.1 });
    assert.equal(look.onclick, undefined);
    assert.equal(look.headwear, undefined);
    assert.equal(look.glasses, '#000000');
    assert.equal(l.chars[0], ROSTER - 1, 'char index clamped to the roster');
    const pl = srv.rooms.get(l.code).world.players[0];
    assert.equal(pl.stats.volley, 10);
    assert.equal(pl.stats.speed, 6);
    assert.equal(pl.stats.evil, undefined);
    assert.equal(pl.racket.power, 1);
    a.ws.close();
  } finally { await srv.close(); }
});

test('join: look level is clamped to 0.5-7', async () => {
  const srv = await startServer(0);
  try {
    const a = client(srv.port), b = client(srv.port);
    assert.equal((await create(a, { cfg: { players: 2 }, look: { level: 12 } })).looks[0].level, 7);
    assert.equal((await create(b, { cfg: { players: 2 }, look: { level: 'x' } })).looks[0].level, undefined);
    a.ws.close(); b.ws.close();
  } finally { await srv.close(); }
});

test('join: look outfit sanitizes style, pattern, accent and chest text (drops invalid values)', async () => {
  const srv = await startServer(0);
  try {
    const a = client(srv.port);
    let lob = a.next('lobby');
    await a.send({
      type: 'join', create: true, cfg: { players: 2 },
      look: {
        outfit: {
          shirt: '#112233',
          shorts: '#445566',
          shoes: '#778899',
          style: 'polo',
          pattern: 'sash',
          accent: '#ffffff',
          text: 'GS',
        },
        hairGel: true,
      },
    });
    let l = await lob;
    assert.equal(l.looks[0].hairGel, true);
    assert.deepEqual(l.looks[0].outfit, {
      shirt: '#112233',
      shorts: '#445566',
      shoes: '#778899',
      style: 'polo',
      pattern: 'sash',
      accent: '#ffffff',
      text: 'GS',
    });
    a.ws.close();

    const b = client(srv.port);
    lob = b.next('lobby');
    await b.send({
      type: 'join', create: true, cfg: { players: 2 },
      look: {
        outfit: {
          shirt: '#112233',
          style: 'hoodie',
          pattern: 'dots',
          accent: 'red',
          text: '<b>GS</b>',
        },
        hairGel: 'yes',
      },
    });
    l = await lob;
    assert.equal(l.looks[0].hairGel, undefined);
    assert.deepEqual(l.looks[0].outfit, {
      shirt: '#112233',
    });
    b.ws.close();
  } finally { await srv.close(); }
});

test('join: look preserves valid racket, racketColor, and racketShape', async () => {
  const srv = await startServer(0);
  try {
    const a = client(srv.port);
    const lob = a.next('lobby');
    await a.send({
      type: 'join', create: true, cfg: { players: 2 },
      look: {
        racket: 'r05',
        racketColor: '#9B59B6',
        racketShape: 'teardrop',
      },
    });
    const l = await lob;
    assert.equal(l.looks[0].racket, 'r05');
    assert.equal(l.looks[0].racketColor, '#9B59B6');
    assert.equal(l.looks[0].racketShape, 'teardrop');
    a.ws.close();

    const b = client(srv.port);
    const lob2 = b.next('lobby');
    await b.send({
      type: 'join', create: true, cfg: { players: 2 },
      look: {
        racket: 'racket<script>',
        racketColor: 'blue',
        racketShape: 'oval',
      },
    });
    const l2 = await lob2;
    assert.equal(l2.looks[0].racket, undefined);
    assert.equal(l2.looks[0].racketColor, undefined);
    assert.equal(l2.looks[0].racketShape, undefined);
    b.ws.close();
  } finally { await srv.close(); }
});


test('online: eat input waits for the server step; cfg.outdoor reaches the world', async () => {
  const srv = await startServer(0);
  try {
    const a = client(srv.port);
    const { code } = await create(a, { cfg: { players: 2, outdoor: true } });
    const room = srv.rooms.get(code);
    assert.equal(room.world.opts.outdoor, true);
    await a.send({ type: 'input', move: [0, 0], eat: true });
    await new Promise(r => setTimeout(r, 50));
    assert.equal(room.inputs[0].eat, true);  // not started: kept until a step uses it
    a.ws.close();
  } finally { await srv.close(); }
});

test('the server picks unguessable room codes; joining needs an existing room, one room per connection', async () => {
  const srv = await startServer(0);
  try {
    const a = client(srv.port), b = client(srv.port), c = client(srv.port);
    const err = c.next('error');
    await c.send({ type: 'join', code: 'NOPE42' });
    assert.equal((await err).msg, 'Room not found');
    const l1 = await create(a, { code: 'MINE', cfg: { players: 4 } });  // a code the client asks for is ignored
    assert.match(l1.code, /^[A-HJ-NP-Z2-9]{6}$/);
    const l2 = await create(b, { cfg: { players: 4 } });
    assert.notEqual(l2.code, l1.code);
    const again = a.next('error');
    await a.send({ type: 'join', create: true });
    assert.equal((await again).msg, 'Already in a room');
    assert.equal(srv.rooms.size, 2);
    for (const x of [a, b, c]) x.ws.close();
  } finally { await srv.close(); }
});

test('only the room creator starts the match; the next player takes over when they leave', async () => {
  const srv = await startServer(0);
  try {
    const a = client(srv.port), b = client(srv.port);
    const { code, host } = await create(a, { cfg: { players: 4 } });
    assert.equal(host, 0);
    await join(b, code);
    await b.send({ type: 'start' });
    await new Promise(r => setTimeout(r, 50));
    assert.equal(srv.rooms.get(code).started, false);
    const lob = b.next('lobby');
    a.ws.close();
    assert.equal((await lob).host, 2);
    const go = b.next('lobby');
    await b.send({ type: 'start' });
    assert.equal((await go).started, true);
    b.ws.close();
  } finally { await srv.close(); }
});

test('match settings are whitelisted before they reach the world and the lobby', async () => {
  const srv = await startServer(0);
  try {
    const a = client(srv.port);
    const l = await create(a, { name: 'A<b>', cfg: { players: 9, sets: 1e9, ai: '__proto__', venue: 999, outdoor: 'yes', goldenPoint: false, evil: 1 } });
    assert.deepEqual(l.cfg, { players: 4, sets: 3, goldenPoint: false, starPoint: false, superTiebreak: false, ai: 'club', venue: 9, outdoor: false, public: false, host: 'Ab' });
    a.ws.close();
  } finally { await srv.close(); }
});

test('bad messages, prototype shot names and broken URLs do not crash the server', async () => {
  const srv = await startServer(0);
  try {
    const a = client(srv.port);
    for (const raw of ['null', '1', '"x"', '[]', '{', '{"type":"join","cfg":null,"look":null,"create":true}']) { await a.send({}); a.ws.send(raw); }
    const { code } = await (async () => { const b = client(srv.port); const l = await create(b, { cfg: { players: 2 } }); return { code: l.code, b }; })();
    const room = srv.rooms.get(code);
    assert.ok(room);
    const res = await fetch(`http://127.0.0.1:${srv.port}/%`);
    assert.equal(res.status, 400);
    const c = client(srv.port);
    await join(c, code);
    await c.send({ type: 'input', swing: 'constructor', move: [5, 'x'] });
    await new Promise(r => setTimeout(r, 50));
    assert.deepEqual(room.inputs[2], { move: [1, 0], swing: null, aim: 0, eat: false });
    assert.equal((await list(srv.port)).length, 0);  // still answering
    a.ws.close(); c.ws.close();
  } finally { await srv.close(); }
});

test('limits: rooms on the server, sockets per IP, other sites\' pages and oversized messages', async () => {
  const srv = await startServer(0, { rooms: 1, perIp: 3 });
  try {
    const a = client(srv.port), b = client(srv.port);
    await create(a, { cfg: { players: 2 } });
    const full = b.next('error');
    await b.send({ type: 'join', create: true });
    assert.equal((await full).msg, 'The server is full. Try again later.');
    const c = client(srv.port), d = client(srv.port);  // 4th socket from this IP
    const closed = await new Promise(r => d.ws.once('close', (code) => r(code)));
    assert.equal(closed, 1008);
    const evil = new WebSocket(`ws://127.0.0.1:${srv.port}`, { origin: 'https://evil.example' });
    c.ws.close();
    await new Promise(r => c.ws.once('close', r));
    assert.equal(await new Promise(r => evil.once('close', (code) => r(code))), 1008);
    const big = await new Promise(r => { b.ws.once('close', (code) => r(code)); b.ws.send('x'.repeat(5000)); });
    assert.equal(big, 1009);  // maxPayload: the socket is dropped
    a.ws.close();
  } finally { await srv.close(); }
});

test('a flood of messages from one socket is cut at the per-second limit', async () => {
  const srv = await startServer(0, { msgsPerSec: 3 });
  try {
    const a = client(srv.port);
    let answers = 0;
    a.ws.on('message', (raw) => { if (JSON.parse(raw).type === 'rooms') answers++; });
    for (let i = 0; i < 6; i++) await a.send({ type: 'list' });
    await new Promise(r => setTimeout(r, 100));
    assert.equal(answers, 3);
    a.ws.close();
  } finally { await srv.close(); }
});
