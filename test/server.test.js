import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { startServer } from '../server/server.js';

// one client: resolves with the first message of `type`
function client(port) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const open = new Promise(r => ws.once('open', r));
  const next = (type) => new Promise(r => { const on = (raw) => { const m = JSON.parse(raw); if (m.type === type) { ws.off('message', on); r(m); } }; ws.on('message', on); });
  const send = async (m) => { await open; ws.send(JSON.stringify(m)); };
  return { ws, next, send };
}
const list = async (port) => { const c = client(port); const p = c.next('rooms'); await c.send({ type: 'list' }); const m = await p; c.ws.close(); return m.rooms; };

test('room list shows public open rooms only, and drops them once started', async () => {
  const srv = await startServer(0);
  try {
    const host = client(srv.port), priv = client(srv.port);
    let lob = host.next('lobby');
    await host.send({ type: 'join', code: 'PUB1', public: true, name: 'Mesut', cfg: { players: 2, venue: 3 } });
    await lob;
    lob = priv.next('lobby');
    await priv.send({ type: 'join', code: 'PRIV', cfg: { players: 2 } });
    await lob;
    assert.deepEqual(await list(srv.port), [{ code: 'PUB1', players: 2, venue: 3, free: 1, host: 'Mesut' }]);
    lob = host.next('lobby');
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
    let lob = a.next('lobby');
    await a.send({ type: 'join', code: 'LOOK', name: 'Ada', look, cfg: { players: 4 } });
    assert.deepEqual((await lob).looks, { 0: look });
    lob = b.next('lobby');
    await b.send({ type: 'join', code: 'LOOK', name: 'Big', look: { pad: 'x'.repeat(3000) } });
    const l2 = await lob;
    assert.equal(l2.looks[2], undefined);
    assert.deepEqual(l2.names, { 0: 'Ada', 2: 'Big' });
    lob = c.next('lobby');
    await c.send({ type: 'join', code: 'LOOK', char: 3 });
    assert.equal((await lob).taken.length, 3);
    for (const x of [a, b, c]) x.ws.close();
  } finally { await srv.close(); }
});

test('host ball spec, player shoes and energy product are clamped into the room world', async () => {
  const srv = await startServer(0);
  try {
    const a = client(srv.port);
    const lob = a.next('lobby');
    await a.send({ type: 'join', code: 'BALL', cfg: { players: 2 }, ball: { speed: 9, bounce: 1.04 }, shoes: { speed: 5, agility: 0.1 }, fuel: { boost: 0.9, tire: 0.2, name: 'x' } });
    await lob;
    const w = srv.rooms.get('BALL').world;
    assert.deepEqual(w.ballSpec, { speed: 1.12, bounce: 1.04 });
    assert.equal(w.ball.bounce, 1.04);
    assert.deepEqual(w.players[0].shoes, { speed: 0.12, agility: 0.1 });
    assert.deepEqual(w.players[0].fuel, { boost: 0.2, tire: 0.9 });  // energy product clamped to the shop's range
    a.ws.close();
  } finally { await srv.close(); }
});

test('join: look is whitelisted (bad markup/colours/keys dropped), stats and racket clamped to 1-10', async () => {
  const srv = await startServer(0);
  try {
    const a = client(srv.port);
    const lob = a.next('lobby');
    await a.send({ type: 'join', code: 'SAFE', cfg: { players: 2 }, char: 999,
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
    assert.equal(l.chars[0], 25, 'char index clamped to the roster');
    const pl = srv.rooms.get('SAFE').world.players[0];
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
    let lob = a.next('lobby');
    await a.send({ type: 'join', code: 'LVL1', cfg: { players: 2 }, look: { level: 12 } });
    assert.equal((await lob).looks[0].level, 7);
    lob = b.next('lobby');
    await b.send({ type: 'join', code: 'LVL2', cfg: { players: 2 }, look: { level: 'x' } });
    assert.equal((await lob).looks[0].level, undefined);
    a.ws.close(); b.ws.close();
  } finally { await srv.close(); }
});

test('join: look outfit sanitizes style, pattern, accent and chest text (drops invalid values)', async () => {
  const srv = await startServer(0);
  try {
    const a = client(srv.port);
    let lob = a.next('lobby');
    await a.send({
      type: 'join', code: 'KIT1', cfg: { players: 2 },
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
      type: 'join', code: 'KIT2', cfg: { players: 2 },
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
      type: 'join', code: 'RK1', cfg: { players: 2 },
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
      type: 'join', code: 'RK2', cfg: { players: 2 },
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

