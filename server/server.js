// Authoritative room server: node server/server.js [port]. Empty seats are AI.
import { WebSocketServer } from 'ws';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomInt } from 'node:crypto';
import { newWorld, stepWorld, snapshot, SHOTS, BAG } from '../src/game.js';
import { scoreText } from '../src/rules.js';
import { aiInput } from '../src/ai.js';

// serves the built client (npm run build -> dist/) so friends need a single URL
const DIST = path.resolve(import.meta.dirname, '../dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.json': 'application/json' };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, +v || 0));
const LOOK_MAX = 2048;
const CHARACTERS = JSON.parse(fs.readFileSync(new URL('../data/characters.json', import.meta.url))).length;
const VENUES = JSON.parse(fs.readFileSync(new URL('../data/venues.json', import.meta.url))).length;
const AI_LEVELS = ['rookie', 'club', 'pro', 'legend'];
// abuse limits (startServer(port, { ...LIMITS }) overrides them in tests): rooms on the server, sockets per visitor IP,
// messages per socket per second (beyond it they are dropped; the client sends ~60/s at most), largest message in bytes
export const LIMITS = { rooms: 100, perIp: 8, msgsPerSec: 120, payload: 4096 };
// pages that may open a socket here: the site, local dev, and any page served by this same host (npm run online, a tunnel)
const ORIGINS = ['padellegends.eu', 'www.padellegends.eu', 'localhost', '127.0.0.1', ...(process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // no 0/O or 1/I: codes are read aloud and typed
const LOOPBACK = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
// remote looks are shown to other players: only known appearance keys with safe values get through
const COLOR = /^#[0-9a-f]{6}$/i;
const ONE_OF = { gender: ['m', 'f'], hand: ['right', 'left'], beard: ['stubble', 'full', 'goatee'],
  hair: ['Hair_SimpleParted', 'Hair_Buzzed', 'Hair_BuzzedFemale', 'Hair_Long', 'Hair_Buns', 'none'] };
const OUTFIT_STYLES = ['crew', 'polo', 'vneck', 'tank'];
const OUTFIT_PATTERNS = ['none', 'chest', 'sash', 'side', 'stripes', 'split'];
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
    if (/^[A-Z0-9]{1,3}$/.test(l.outfit.text)) o.text = l.outfit.text;
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
  if (typeof l.level === 'number' && Number.isFinite(l.level)) out.level = clamp(l.level, 0.5, 7);  // career level, for the rating
  if (l.headwear && ['headband', 'visor'].includes(l.headwear.type) && col(l.headwear.color)) out.headwear = { type: l.headwear.type, color: l.headwear.color };
  if (typeof l.racket === 'string' && /^[a-z0-9_]{1,16}$/i.test(l.racket)) out.racket = l.racket;
  if (col(l.racketColor)) out.racketColor = l.racketColor;
  if (['round', 'teardrop', 'diamond'].includes(l.racketShape)) out.racketShape = l.racketShape;
  return out;
}
// stats/racket from the client: known keys only, 1..10 (a huge stat would make a player error-free)
const clampKeys = (target, src) => { for (const k in target) if (typeof src?.[k] === 'number') target[k] = clamp(src[k], 1, 10); };  // bytes of JSON; bigger looks are dropped and the client falls back to its roster character

// match settings from the room creator: known values only (they are sent to everyone and drive the match)
export function sanitizeCfg(c, m = {}) {
  if (!c || typeof c !== 'object') c = {};
  const bool = (v) => v === true;
  return {
    players: c.players === 2 ? 2 : 4, sets: [1, 3, 5].includes(c.sets) ? c.sets : 3,
    goldenPoint: c.goldenPoint !== false, starPoint: bool(c.starPoint), superTiebreak: bool(c.superTiebreak),
    ai: AI_LEVELS.includes(c.ai) ? c.ai : 'club', venue: clamp(Math.floor(+c.venue || 0), 0, VENUES - 1), outdoor: bool(c.outdoor),
    public: bool(m.public), host: text(m.name || '', 16),
  };
}

// the visitor's IP: the socket peer, or the proxy's client header when the peer is a local tunnel (cloudflared)
// or TRUST_PROXY=1 is set (a host such as Fly.io that puts its proxy in front)
function clientIp(req) {
  const peer = req.socket.remoteAddress || '';
  if (!process.env.TRUST_PROXY && !LOOPBACK.includes(peer)) return peer;
  return String(req.headers['cf-connecting-ip'] || req.headers['fly-client-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0]).trim() || peer;
}

// browsers send Origin: refuse sockets opened by other sites' pages (non-browser clients send none)
function originOk(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try {
    const h = new URL(o).hostname;
    return ORIGINS.includes(h) || h === String(req.headers.host || '').replace(/:\d+$/, '');
  } catch { return false; }
}

export function startServer(port, limits = {}) {
  const lim = { ...LIMITS, ...limits };
  const httpServer = http.createServer((req, res) => {
    let url;
    try { url = decodeURIComponent(req.url.split('?')[0]); } catch { res.writeHead(400); return res.end('bad request'); }
    const file = path.join(DIST, url === '/' ? 'index.html' : url);
    if (!file.startsWith(DIST + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found (run npm run build)'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  const wss = new WebSocketServer({ server: httpServer, maxPayload: lim.payload });
  const rooms = new Map(); // code -> room
  const perIp = new Map(); // ip -> open sockets

  // a dead connection (phone went to sleep, network gone) never sends close: ping every 30 s, drop what did not answer
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) { if (ws.alive === false) ws.terminate(); else { ws.alive = false; ws.ping(); } }
  }, 30000);

  function newCode() {
    let code;
    do code = Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join(''); while (rooms.has(code));
    return code;
  }

  function makeRoom(code, cfg) {
    const players = cfg.players === 2 ? 2 : 4;
    const room = {
      code, cfg, seats: players === 2 ? [0, 2] : [0, 2, 1, 3], clients: new Map(), inputs: {}, started: false, host: null,
      world: newWorld({ players, match: { sets: cfg.sets, goldenPoint: cfg.goldenPoint, starPoint: cfg.starPoint, superTiebreak: cfg.superTiebreak }, stats: {}, rackets: {}, outdoor: cfg.outdoor }),
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
    for (const pl of w.players) if (pl.active) inp[pl.id] = taken.has(pl.id) ? room.inputs[pl.id] || {} : aiInput(w, pl.id, room.cfg.ai);
    stepWorld(w, inp, 1 / 60);
    for (const id in room.inputs) if (room.inputs[id]) { room.inputs[id].swing = null; room.inputs[id].eat = false; } // edge events
    const events = w.events.splice(0);
    if (++frame % 2 && !events.some(e => e.type !== 'contact')) return; // 30 Hz unless something happened
    const msg = JSON.stringify({ type: 'state', snap: snapshot(w), score: scoreText(w.match), events, winner: w.match.winner });
    for (const ws of room.clients.keys()) ws.readyState === 1 && ws.send(msg);
  }

  function lobby(room) {
    const msg = JSON.stringify({ type: 'lobby', code: room.code, cfg: room.cfg, seats: room.seats, taken: [...room.clients.values()], chars: room.chars, looks: room.looks, names: room.names, started: room.started, host: room.host });
    for (const ws of room.clients.keys()) ws.readyState === 1 && ws.send(msg);
  }

  wss.on('connection', (ws, req) => {
    ws.on('error', () => {});  // e.g. an oversized message: ws closes the socket itself; unhandled, the error would end the process
    const ip = clientIp(req);
    if (!originOk(req) || (perIp.get(ip) || 0) >= lim.perIp) { ws.close(1008, 'not allowed'); return; }
    perIp.set(ip, (perIp.get(ip) || 0) + 1);
    ws.alive = true;
    ws.on('pong', () => { ws.alive = true; });
    const fail = (msg) => ws.send(JSON.stringify({ type: 'error', msg }));
    let room = null, win = 0, count = 0;
    ws.on('message', (raw) => {
      const now = Date.now();
      if (now - win >= 1000) { win = now; count = 0; }
      if (++count > lim.msgsPerSec) return;  // flood: drop
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (!m || typeof m !== 'object') return;
      try { onMessage(m); } catch (e) { console.error('bad message', e); }  // one bad message never takes the server down
    });
    function onMessage(m) {
      if (m.type === 'list') {  // public lobbies that still have a free seat
        const open = [...rooms.values()].filter(r => r.cfg.public && !r.started && r.clients.size < r.seats.length);
        ws.send(JSON.stringify({ type: 'rooms', rooms: open.map(r => ({ code: r.code, players: r.seats.length, venue: r.cfg.venue, free: r.seats.length - r.clients.size, host: r.cfg.host })) }));
      } else if (m.type === 'join') {
        if (room) return fail('Already in a room');  // one room per connection
        let target;
        if (m.create === true) {  // the server picks the code: never guessable, never someone else's room
          if (rooms.size >= lim.rooms) return fail('The server is full. Try again later.');
          target = makeRoom(newCode(), sanitizeCfg(m.cfg, m));
        } else {
          target = rooms.get(String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
          if (!target) return fail('Room not found');
        }
        const taken = new Set(target.clients.values());
        const seat = target.seats.find(s => !taken.has(s));
        if (seat == null || target.started) return fail('Room is full or match already started');
        room = target;
        const fresh = !room.clients.size;
        room.clients.set(ws, seat);
        if (room.host == null) room.host = seat;
        room.chars[seat] = clamp(m.char | 0, 0, CHARACTERS - 1);
        const pl = room.world.players[seat];
        clampKeys(pl.stats, m.stats);
        clampKeys(pl.racket, m.racket);
        if (m.shoes) pl.shoes = { speed: clamp(m.shoes.speed, 0, 0.12), agility: clamp(m.shoes.agility, 0, 0.3) };
        if (m.bag && typeof m.bag === 'object') pl.bag = Object.fromEntries(Object.keys(BAG).map(k => [k, clamp(Math.floor(+m.bag[k] || 0), 0, 16)]));  // career bag: counts only
        if (fresh && m.ball) {  // the host's match ball
          room.world.ballSpec = { speed: clamp(m.ball.speed, 1, 1.12), bounce: clamp(m.ball.bounce, 1, 1.07) };
          room.world.ball.bounce = room.world.ballSpec.bounce;
        }
        if (m.name) room.names[seat] = text(m.name, 16);
        const look = sanitizeLook(m.look);
        if (look) room.looks[seat] = look;
        ws.send(JSON.stringify({ type: 'seat', seat, code: room.code }));
        lobby(room);
      } else if (!room) return;
      else if (m.type === 'start') {  // only the room creator (or whoever took over after they left)
        if (room.clients.get(ws) !== room.host || room.started) return;
        room.started = true; lobby(room);
      } else if (m.type === 'input') {
        const seat = room.clients.get(ws);
        const prev = room.inputs[seat];
        const mv = Array.isArray(m.move) ? m.move.slice(0, 2).map(v => Math.max(-1, Math.min(1, +v || 0))) : [0, 0];
        const shot = m.swing === 'auto' || (typeof m.swing === 'string' && Object.hasOwn(SHOTS, m.swing) && m.swing !== 'serve') ? m.swing : null;
        room.inputs[seat] = { move: mv, swing: shot || prev?.swing || null, aim: Math.max(-1, Math.min(1, +m.aim || 0)), eat: m.eat === true || !!prev?.eat };
      }
    }
    ws.on('close', () => {
      const n = (perIp.get(ip) || 1) - 1;
      if (n) perIp.set(ip, n); else perIp.delete(ip);
      if (!room) return;
      const seat = room.clients.get(ws);
      room.clients.delete(ws);
      delete room.looks[seat]; delete room.names[seat];
      if (!room.clients.size) { clearInterval(room.timer); rooms.delete(room.code); return; }
      if (seat === room.host) room.host = room.clients.values().next().value;  // the next player may start the match
      lobby(room);  // seat falls back to AI
    });
  });

  return new Promise(resolve => httpServer.listen(port, () => resolve({
    port: httpServer.address().port, rooms,
    close: () => new Promise(done => { clearInterval(heartbeat); for (const r of rooms.values()) clearInterval(r.timer); for (const c of wss.clients) c.terminate(); wss.close(); httpServer.close(done); }),
  })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { port } = await startServer(+(process.argv[2] || process.env.PORT || 8080));
  console.log(`padel server on http://0.0.0.0:${port} (game + websocket)`);
}
