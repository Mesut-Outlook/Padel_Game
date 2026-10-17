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

test('host ball spec and player shoes are clamped into the room world', async () => {
  const srv = await startServer(0);
  try {
    const a = client(srv.port);
    const lob = a.next('lobby');
    await a.send({ type: 'join', code: 'BALL', cfg: { players: 2 }, ball: { speed: 9, bounce: 1.04 }, shoes: { speed: 5, agility: 0.1 } });
    await lob;
    const w = srv.rooms.get('BALL').world;
    assert.deepEqual(w.ballSpec, { speed: 1.12, bounce: 1.04 });
    assert.equal(w.ball.bounce, 1.04);
    assert.deepEqual(w.players[0].shoes, { speed: 0.12, agility: 0.1 });
    a.ws.close();
  } finally { await srv.close(); }
});
