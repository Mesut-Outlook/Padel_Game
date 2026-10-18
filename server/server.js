// Authoritative room server: node server/server.js [port]. Empty seats are AI.
import { WebSocketServer } from 'ws';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { newWorld, stepWorld, snapshot, SHOTS } from '../src/game.js';
import { scoreText } from '../src/rules.js';
import { aiInput } from '../src/ai.js';

// serves the built client (npm run build -> dist/) so friends need a single URL
const DIST = path.resolve(import.meta.dirname, '../dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.json': 'application/json' };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, +v || 0));
const LOOK_MAX = 2048;
const CHARACTERS = JSON.parse(fs.readFileSync(new URL('../data/characters.json', import.meta.url))).length;
// remote looks are shown to other players: only known appearance keys with safe values get through
const COLOR = /^#[0-9a-f]{6}$/i;
const ONE_OF = { gender: ['m', 'f'], hand: ['right', 'left'], beard: ['stubble', 'full', 'goatee'],
  hair: ['Hair_SimpleParted', 'Hair_Buzzed', 'Hair_BuzzedFemale', 'Hair_Long', 'Hair_Buns', 'none'] };
const OUTFIT_STYLES = ['crew', 'polo', 'vneck', 'tank'];
const OUTFIT_PATTERNS = ['none', 'chest', 'sash', 'side'];
const BODY_TYPES = ['slim', 'athletic', 'muscular', 'stocky', 'tall', 'petite'];
const text = (v, n) => String(v).replace(/[^\p{L}\p{N} .'-]/gu, '').slice(0, n);
function sanitizeLook(l) {
  if (!l || typeof l !== 'object' || JSON.stringify(l).length > LOOK_MAX) return null;
  const col = (v) => (typeof v === 'string' && COLOR.test(v) ? v : undefined), num = (v, lo, hi) => (typeof v === 'number' ? clamp(v, lo, hi) : undefined);
  const out = {};
  if (l.name != null) out.name = text(l.name, 16);
  if (l.country != null) out.country = text(l.country, 32);
  if (/^[A-Z]{2}$/.test(l.countryCode)) out.countryCode = l.countryCode;
  for (const k in ONE_OF) if (ONE_OF[k].includes(l[k])) out[k] = l[k];
  for (const k of ['skinTone', 'hairColor', 'beardColor']) if (col(l[k])) out[k] = l[k];
  if (l.outfit && typeof l.outfit === 'object') {
    const o = {};
    for (const k of ['shirt', 'shorts', 'shoes']) if (col(l.outfit[k])) o[k] = l.outfit[k];
    if (OUTFIT_STYLES.includes(l.outfit.style)) o.style = l.outfit.style;
    if (OUTFIT_PATTERNS.includes(l.outfit.pattern)) o.pattern = l.outfit.pattern;
    if (col(l.outfit.accent)) o.accent = l.outfit.accent;
    out.outfit = o;
  }
  if (l.body && typeof l.body === 'object') {
    const b = {};
    if (BODY_TYPES.includes(l.body.type)) b.type = l.body.type;
    if (num(l.body.height, 0.9, 1.1) != null) b.height = num(l.body.height, 0.9, 1.1);
    if (num(l.body.width, 0.85, 1.2) != null) b.width = num(l.body.width, 0.85, 1.2);
    out.body = b;
  }
  if (l.face && num(l.face.width, 0.9, 1.12) != null) out.face = { width: num(l.face.width, 0.9, 1.12) };
  if (num(l.hairCut, 0.5, 2) != null) out.hairCut = num(l.hairCut, 0.5, 2);
  if (num(l.hairOpacity, 0, 1) != null) out.hairOpacity = num(l.hairOpacity, 0, 1);
  for (const k of ['ponytail', 'topknot', 'makeup', 'hairGel']) if (l[k] === true) out[k] = true;
  if (l.glasses === true || col(l.glasses)) out.glasses = l.glasses;
  if (l.headwear && ['headband', 'visor'].includes(l.headwear.type) && col(l.headwear.color)) out.headwear = { type: l.headwear.type, color: l.headwear.color };
  return out;
}
// stats/racket from the client: known keys only, 1..10 (a huge stat would make a player error-free)
const clampKeys = (target, src) => { for (const k in target) if (typeof src?.[k] === 'number') target[k] = clamp(src[k], 1, 10); };  // bytes of JSON; bigger looks are dropped and the client falls back to its roster character

export function startServer(port) {
  const httpServer = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(DIST, url === '/' ? 'index.html' : url);
    if (!file.startsWith(DIST + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found (run npm run build)'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  const wss = new WebSocketServer({ server: httpServer });
  const rooms = new Map(); // code -> room

  function makeRoom(code, cfg) {
    const players = cfg.players === 2 ? 2 : 4;
    const room = {
      code, cfg, seats: players === 2 ? [0, 2] : [0, 2, 1, 3], clients: new Map(), inputs: {}, started: false,
      world: newWorld({ players, match: { sets: cfg.sets || 3, goldenPoint: cfg.goldenPoint !== false, starPoint: !!cfg.starPoint, superTiebreak: !!cfg.superTiebreak }, stats: {}, rackets: {} }),
      chars: {}, looks: {}, names: {}, timer: null,
    };
    room.timer = setInterval(() => tick(room), 1000 / 60);
    rooms.set(code, room);
    return room;
  }

  let frame = 0;
  function tick(room) {
    if (!room.started) return;
    const w = room.world, taken = new Set(room.clients.values());
    const inp = {};
    for (const pl of w.players) if (pl.active) inp[pl.id] = taken.has(pl.id) ? room.inputs[pl.id] || {} : aiInput(w, pl.id, room.cfg.ai || 'club');
    stepWorld(w, inp, 1 / 60);
    for (const id in room.inputs) if (room.inputs[id]) room.inputs[id].swing = null; // swing is an edge event
    const events = w.events.splice(0);
    if (++frame % 2 && !events.some(e => e.type !== 'contact')) return; // 30 Hz unless something happened
    const msg = JSON.stringify({ type: 'state', snap: snapshot(w), score: scoreText(w.match), events, winner: w.match.winner });
    for (const ws of room.clients.keys()) ws.readyState === 1 && ws.send(msg);
  }

  function lobby(room) {
    const msg = JSON.stringify({ type: 'lobby', code: room.code, cfg: room.cfg, seats: room.seats, taken: [...room.clients.values()], chars: room.chars, looks: room.looks, names: room.names, started: room.started });
    for (const ws of room.clients.keys()) ws.readyState === 1 && ws.send(msg);
  }

  wss.on('connection', (ws) => {
    let room = null;
    ws.on('message', (raw) => {
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.type === 'list') {  // public lobbies that still have a free seat
        const open = [...rooms.values()].filter(r => r.cfg.public && !r.started && r.clients.size < r.seats.length);
        ws.send(JSON.stringify({ type: 'rooms', rooms: open.map(r => ({ code: r.code, players: r.seats.length, venue: r.cfg.venue, free: r.seats.length - r.clients.size, host: r.cfg.host })) }));
      } else if (m.type === 'join') {
        const code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        if (!code) return;
        room = rooms.get(code) || makeRoom(code, { players: m.cfg?.players, sets: m.cfg?.sets, goldenPoint: m.cfg?.goldenPoint, starPoint: m.cfg?.starPoint, superTiebreak: m.cfg?.superTiebreak, ai: m.cfg?.ai, venue: m.cfg?.venue | 0, public: !!m.public, host: text(m.name || '', 16) });
        const fresh = !room.clients.size && !room.started;
        const taken = new Set(room.clients.values());
        const seat = room.seats.find(s => !taken.has(s));
        if (seat == null || room.started && !m.spectate) { ws.send(JSON.stringify({ type: 'error', msg: 'Room is full or match already started' })); return; }
        room.clients.set(ws, seat);
        room.chars[seat] = clamp(m.char | 0, 0, CHARACTERS - 1);
        const pl = room.world.players[seat];
        clampKeys(pl.stats, m.stats);
        clampKeys(pl.racket, m.racket);
        if (m.shoes) pl.shoes = { speed: clamp(m.shoes.speed, 0, 0.12), agility: clamp(m.shoes.agility, 0, 0.3) };
        if (fresh && m.ball) {  // the host's match ball
          room.world.ballSpec = { speed: clamp(m.ball.speed, 1, 1.12), bounce: clamp(m.ball.bounce, 1, 1.07) };
          room.world.ball.bounce = room.world.ballSpec.bounce;
        }
        if (m.name) room.names[seat] = text(m.name, 16);
        const look = sanitizeLook(m.look);
        if (look) room.looks[seat] = look;
        ws.send(JSON.stringify({ type: 'seat', seat, code }));
        lobby(room);
      } else if (!room) return;
      else if (m.type === 'start') { room.started = true; lobby(room); }
      else if (m.type === 'input') {
        const seat = room.clients.get(ws);
        const prev = room.inputs[seat];
        const mv = Array.isArray(m.move) ? m.move.slice(0, 2).map(v => Math.max(-1, Math.min(1, +v || 0))) : [0, 0];
        room.inputs[seat] = { move: mv, swing: (m.swing === 'auto' || (m.swing in SHOTS && m.swing !== 'serve') ? m.swing : null) || prev?.swing || null, aim: Math.max(-1, Math.min(1, +m.aim || 0)) };
      }
    });
    ws.on('close', () => {
      if (!room) return;
      const seat = room.clients.get(ws);
      room.clients.delete(ws);
      delete room.looks[seat]; delete room.names[seat];
      if (!room.clients.size) { clearInterval(room.timer); rooms.delete(room.code); } else lobby(room); // seat falls back to AI
    });
  });

  return new Promise(resolve => httpServer.listen(port, () => resolve({
    port: httpServer.address().port, rooms,
    close: () => new Promise(done => { for (const r of rooms.values()) clearInterval(r.timer); for (const c of wss.clients) c.terminate(); wss.close(); httpServer.close(done); }),
  })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { port } = await startServer(+(process.argv[2] || process.env.PORT || 8080));
  console.log(`padel server on http://0.0.0.0:${port} (game + websocket)`);
}
