// Authoritative room server: node server/server.js [port]. Empty seats are AI.
import { WebSocketServer } from 'ws';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomInt, randomBytes, createHmac, createHash } from 'node:crypto';
import { createSchedule, SCHEDULE } from './schedule.js';
import { loadSchedule, saveSchedule } from './schedulestore.js';
import { newWorld, stepWorld, snapshot, SHOTS, BAG } from '../src/game.js';
import { scoreText } from '../src/rules.js';
import { aiInput } from '../src/ai.js';

// serves the built client (npm run build -> dist/) so friends need a single URL
const DIST = path.resolve(import.meta.dirname, '../dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, +v || 0));
const LOOK_MAX = 2048;
const CHARACTERS = JSON.parse(fs.readFileSync(new URL('../data/characters.json', import.meta.url))).length;
const VENUES = JSON.parse(fs.readFileSync(new URL('../data/venues.json', import.meta.url))).length;
const AI_LEVELS = ['rookie', 'club', 'pro', 'legend'];
// abuse limits (startServer(port, { ...LIMITS }) overrides them in tests): rooms on the server, sockets on the server, sockets per visitor IP,
// rooms one visitor holds at a time (a room outlives its socket while seats wait for a rejoin), messages per socket per second
// (beyond it they are dropped; the client sends ~60/s at most), largest message in bytes. Sized for the home Raspberry Pi: raise them on a bigger host.
export const LIMITS = { rooms: 10, waiting: 30, clients: 40, perIp: 8, roomsPerIp: 2, playingPerIp: 1, msgsPerSec: 120, payload: 4096, rejoinMs: 60000, lobbyMs: 900000,
  ghostMs: 15000, idleMs: 600000, overMs: 60000, matchMs: 5400000, joinsPerMin: 20, logsPerMin: 60, sendSkip: 65536, sendDrop: 524288, countdownMs: 5000 };
// rooms: matches playing at once (CPU and upload on the Pi); waiting: rooms not started yet (cheap: no simulation), so a few visitors holding
// empty rooms cannot lock everyone else out; playingPerIp: matches one visitor's rooms may play at once (a home playing together is one room); rejoinMs: a dropped player's seat waits this long; lobbyMs: a room nobody starts closes; ghostMs: a socket that has not joined a room by then is closed;
// idleMs: a started room where no player sent input closes; overMs: a finished match's room closes after this; matchMs: no room plays longer;
// joinsPerMin: join messages per visitor; logsPerMin: join/leave/rejoin log lines; sendSkip/sendDrop: bytes a socket may have queued before it misses a
// message / is dropped (a client that stops reading must not fill the memory); countdownMs: an auto room starts this long after its second human joins
// pages that may open a socket here: the site, local dev, and any page served by this same host (npm run online, a tunnel)
const ORIGINS = ['padellegends.eu', 'www.padellegends.eu', 'localhost', '127.0.0.1', ...(process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)];
const CLOSED_FOR_GOOD = 4000;  // close code for a started room the server ended (idle, too long, error): the client does not try to rejoin
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
// names show in the public room list: a few rude words make it a plain 'Player' (ponytail: short list, grow it when reports come in)
const RUDE = /f.?ck|shit|cunt|bitch|nigg|faggot|whore|slut|pussy|hitler|orospu|siktir|sikerim|yarrak|piç|ibne|puta|mierda|cabr[oó]n|coño|merde|putain|stronz|kanker|hoer|scheiss|fotze|caralho|porra/i;
const LEET = { 4: 'a', '@': 'a', 0: 'o', 1: 'i', 3: 'e', 5: 's', 7: 't' };
export const cleanName = (v) => { const n = text(v, 16).trim(); return RUDE.test(n.toLowerCase().replace(/[401357@]/g, (d) => LEET[d]).replace(/[^\p{L}]/gu, '')) ? 'Player' : n; };
function sanitizeLook(l) {
  if (!l || typeof l !== 'object' || JSON.stringify(l).length > LOOK_MAX) return null;
  const col = (v) => (typeof v === 'string' && COLOR.test(v) ? v : undefined), num = (v, lo, hi) => (typeof v === 'number' ? clamp(v, lo, hi) : undefined);
  const out = {};
  if (l.name != null) out.name = text(l.name, 16);
  if (l.country != null) out.country = text(l.country, 32);
  if (typeof l.countryCode === 'string' && /^[A-Z]{2}$/.test(l.countryCode)) out.countryCode = l.countryCode;
  for (const k in ONE_OF) if (ONE_OF[k].includes(l[k])) out[k] = l[k];
  for (const k of ['skinTone', 'hairColor', 'beardColor']) if (col(l[k])) out[k] = l[k];
  if (l.outfit && typeof l.outfit === 'object') {
    const o = {};
    for (const k of ['shirt', 'shorts', 'shoes']) if (col(l.outfit[k])) o[k] = l.outfit[k];
    if (OUTFIT_STYLES.includes(l.outfit.style)) o.style = l.outfit.style;
    if (OUTFIT_PATTERNS.includes(l.outfit.pattern)) o.pattern = l.outfit.pattern;
    if (col(l.outfit.accent)) o.accent = l.outfit.accent;
    if (typeof l.outfit.text === 'string' && /^[A-Z0-9]{1,3}$/.test(l.outfit.text)) o.text = l.outfit.text;
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
    mode: c.mode === 'team' ? 'team' : 'face',  // doubles: humans on one team vs AIs (Team up), or across the net (Face off)
    public: bool(m.public), auto: bool(c.auto) || bool(m.quick),
  };
}

// the visitor's IP: the socket peer, or one proxy header when the peer is local (cloudflared) or TRUST_PROXY=1 is set (a proxy in front).
// Only the header named by PROXY_HEADER counts (cf-connecting-ip by default), never a chain of fallbacks a visitor could fill in;
// x-forwarded-for, when chosen, gives its last address: the one the proxy itself added.
export function clientIp(req) {
  const peer = req.socket.remoteAddress || '';
  if (process.env.TRUST_PROXY !== '1' && !LOOPBACK.includes(peer)) return peer;
  const name = (process.env.PROXY_HEADER || 'cf-connecting-ip').toLowerCase();
  const v = String(req.headers[name] || '');
  return (name === 'x-forwarded-for' ? v.split(',').pop() : v).trim() || peer;
}

// the key the per-visitor limits count: one home or phone network holds a whole IPv6 /64, so counting full addresses limits nothing
export function ipKey(ip) {
  if (ip.startsWith('::ffff:')) return ip.slice(7);  // an IPv4 visitor, however the socket shows it
  if (!ip.includes(':')) return ip;
  const [left, right] = ip.toLowerCase().split('::').map(s => (s ? s.split(':') : []));
  const groups = right ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right] : left;
  return groups.slice(0, 4).map(g => g.replace(/^0+(?=.)/, '')).join(':') + '::/64';
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

// every message to a client goes through here: a socket that stopped reading misses messages, and one that keeps not reading is dropped
export function sendCapped(ws, msg, lim) {
  if (ws.readyState !== 1) return;
  if (ws.bufferedAmount > lim.sendDrop) return ws.terminate();
  if (ws.bufferedAmount > lim.sendSkip) return;
  ws.send(msg);
}

// a room counts against the visitor who made it for as long as it lives, even after they leave; it keeps only this keyed hash,
// never the IP (the key is made at start and lost on restart, so the hash cannot be turned back into an address)
const OWNER_KEY = randomBytes(32);
export const ownerKey = (ip) => createHmac('sha256', OWNER_KEY).update(ip).digest('base64url').slice(0, 22);

// one status line a minute for journalctl: counts and timings only, never an IP, a name or a room code
export const statusLine = ({ rooms, clients, tickAvg, tickMax, cpu, rss }) =>
  `status rooms=${rooms} clients=${clients} tick_avg=${tickAvg.toFixed(2)}ms tick_max=${tickMax.toFixed(2)}ms cpu=${cpu.toFixed(1)}% rss=${Math.round(rss / 1048576)}MB`;

export function startServer(port, limits = {}) {
  const lim = { ...LIMITS, ...limits };
  // the built client's files, read once: a request never waits on the disk to find out whether a path exists (rebuild = restart)
  const files = new Map();
  (function walk(dir) {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }  // no dist/: the server only speaks websocket
    for (const e of entries) {
      const file = path.join(dir, e.name);
      if (e.isDirectory()) walk(file);
      else if (e.isFile()) files.set('/' + path.relative(DIST, file).split(path.sep).join('/'), { file, size: fs.statSync(file).size, type: TYPES[path.extname(file)] || 'application/octet-stream' });
    }
  })(DIST);
  const httpServer = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { allow: 'GET, HEAD' }); return res.end(); }
    let url;
    try { url = decodeURIComponent(req.url.split('?')[0]); } catch { res.writeHead(400); return res.end('bad request'); }
    const f = files.get(url === '/' ? '/index.html' : url);
    if (!f) { res.writeHead(404); return res.end('not found (run npm run build)'); }
    res.writeHead(200, { 'content-type': f.type, 'content-length': f.size, 'x-content-type-options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(f.file).on('error', () => res.destroy()).pipe(res);
  });
  const wss = new WebSocketServer({ server: httpServer, maxPayload: lim.payload });
  const rooms = new Map(); // code -> room
  const perIp = new Map(); // ip -> open sockets
  const wrong = new Map(); // ip -> wrong room codes or rejoin tokens in the last 30 s
  let badLines = 0, logLines = 0;  // log lines this minute ('bad message', and join/leave/rejoin): one visitor must not be able to fill the disk
  const joins = new Map();  // visitor -> join messages this minute
  const logLine = (line) => { if (logLines++ < lim.logsPerMin) console.log(line); };
  // posted games (Match calendar): kept in schedule.js, saved to PADEL_STATE after every change, started here at their time
  const clock = lim.now || Date.now;
  const statePath = lim.statePath ?? process.env.PADEL_STATE;
  const schedule = createSchedule({ windowMs: lim.matchMs }, loadSchedule(statePath, console.log));
  let savedText = '';
  const saveNow = () => { const text = JSON.stringify(schedule.toJSON()); if (text !== savedText && saveSchedule(statePath, schedule.toJSON())) savedText = text; };
  const schedWrites = new Map();  // visitor -> schedule:* writes this minute
  const schedCode = (id) => 'S' + String(id).slice(0, 5).toUpperCase();
  const humans = (room) => room.clients.size;
  const schedTimer = setInterval(() => {  // auto-accept and expiry, then start due rooms: at the time with two humans, after the grace with whoever came
    const t = clock();
    schedule.sweep(t);
    saveNow();
    for (const room of rooms.values()) {
      const c = room.cfg;
      if (!c.scheduled || room.started || !humans(room) || t < c.at) continue;
      if (humans(room) >= 2 || t >= c.graceUntil) begin(room);
    }
  }, lim.schedTickMs || 5000);

  // a dead connection (phone went to sleep, network gone) never sends close: ping every 30 s, drop what did not answer
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) { if (ws.alive === false) ws.terminate(); else { ws.alive = false; ws.ping(); } }
    wrong.clear();
    sweep();
  }, 30000);
  // seats kept for dropped players run out; a room nobody came back to closes
  function sweep(now = Date.now()) {
    for (const ws of wss.clients) if (!ws.inRoom && now - ws.born > lim.ghostMs) ws.close(1000, 'no room');  // a socket must join a room or go
    for (const room of rooms.values()) {
      if (!room.started && now - room.born > lim.lobbyMs) { closeRoom(room, 'lobby timed out'); continue; }  // an open socket must not hold a room slot for ever
      if (room.started) {  // a match ends: after its result, after a long spell with no player input, or at the length cap
        if (room.overAt != null && now - room.overAt > lim.overMs) { closeRoom(room, 'match over'); continue; }
        if (now - room.startedAt > lim.matchMs || now - room.lastInput > lim.idleMs) { closeRoom(room, 'match closed', CLOSED_FOR_GOOD); continue; }
      }
      for (const s in room.away) if (room.away[s].until < now) delete room.away[s];
      if (!room.clients.size && !Object.keys(room.away).length) closeRoom(room);
    }
  }

  // tick timing over the current minute (rooms that have not started do no work, so they are not counted)
  let tSum = 0, tN = 0, tMax = 0, lastCpu = process.cpuUsage(), lastWall = performance.now();
  const tickAvg = () => tN ? Math.round(tSum / tN * 100) / 100 : 0;
  function status() {
    const clients = wss.clients.size;
    if (clients || rooms.size) {
      const cu = process.cpuUsage(lastCpu), wall = performance.now() - lastWall;
      console.log(statusLine({ rooms: rooms.size, clients, tickAvg: tickAvg(), tickMax: tMax, cpu: wall > 0 ? (cu.user + cu.system) / 1000 / wall * 100 : 0, rss: process.memoryUsage.rss() }));
    }
    lastCpu = process.cpuUsage(); lastWall = performance.now(); tSum = tN = tMax = badLines = logLines = 0; joins.clear(); schedWrites.clear();
  }
  const statusTimer = setInterval(status, 60000);

  // public lobbies with a free seat, longest waiting first (Map order = creation order)
  const openRooms = () => [...rooms.values()].filter(r => r.cfg.public && !r.started && r.clients.size < r.seats.length);

  function closeRoom(room, reason = '', code = 1000) {
    clearInterval(room.timer); rooms.delete(room.code);
    for (const ws of room.clients.keys()) ws.close(code, reason);
  }

  function newCode() {
    let code;
    do code = Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join(''); while (rooms.has(code));
    return code;
  }

  function makeRoom(code, cfg, owner) {
    const players = cfg.players === 2 ? 2 : 4;
    const room = {
      code, cfg, owner, born: Date.now(), seats: players === 2 ? [0, 2] : cfg.mode === 'team' ? [0, 1] : [0, 2, 1, 3], startsAt: null, clients: new Map(), inputs: {}, started: false, host: null, frame: 0,
      world: newWorld({ players, match: { sets: cfg.sets, goldenPoint: cfg.goldenPoint, starPoint: cfg.starPoint, superTiebreak: cfg.superTiebreak }, stats: {}, rackets: {}, outdoor: cfg.outdoor, holdReplay: true }),  // every client shows a highlight before the next serve
      chars: {}, looks: {}, names: {}, timer: null, tokens: {}, away: {},  // away: seat -> { token, until, name, look } of a dropped player
    };
    room.timer = setInterval(() => {
      const t0 = performance.now(); tick(room);
      if (room.started) { const d = performance.now() - t0; tSum += d; tN++; if (d > tMax) tMax = d; }
    }, 1000 / 60);
    rooms.set(code, room);
    return room;
  }

  // an auto room is ready when two humans are in (Face off: one on each team, which the seat order gives)
  const ready = (room) => room.clients.size >= 2;
  function countdown(room) {
    if (!room.cfg.auto || room.started) return;
    if (!ready(room)) room.startsAt = null;
    else if (room.startsAt == null) room.startsAt = Date.now() + lim.countdownMs;
  }
  function begin(room) {
    const playing = [...rooms.values()].filter(r => r.started);
    if (room.cfg.scheduled && playing.filter(r => r.cfg.scheduled).length >= lim.rooms - 2) return false;  // posted games leave two slots for Play now and invites; the scheduler tries again
    if (playing.length >= lim.rooms || playing.filter(r => r.owner === room.owner).length >= lim.playingPerIp) {  // every match slot busy: an auto room tries again after another countdown
      if (room.cfg.auto) { room.startsAt = Date.now() + lim.countdownMs; lobby(room); }
      return false;
    }
    room.started = true; room.startsAt = null; room.startedAt = room.lastInput = Date.now(); lobby(room);
    return true;
  }

  function tick(room) {
    if (room.startsAt != null && !room.started && Date.now() >= room.startsAt) begin(room);
    if (!room.started || !room.clients.size) return;  // nobody connected: the match waits for a rejoin instead of playing on
    try {
      const w = room.world, taken = new Set(room.clients.values());
      const inp = {};
      for (const pl of w.players) if (pl.active) inp[pl.id] = taken.has(pl.id) ? room.inputs[pl.id] || {} : aiInput(w, pl.id, room.cfg.ai);
      stepWorld(w, inp, 1 / 60);
      if (w.match.winner != null && room.overAt == null) room.overAt = Date.now();
      for (const id in room.inputs) if (room.inputs[id]) { room.inputs[id].swing = null; room.inputs[id].eat = room.inputs[id].skip = false; } // edge events
      const events = w.events.splice(0);
      if (++room.frame % 2 && !events.some(e => e.type !== 'contact')) return; // 30 Hz unless something happened
      const msg = JSON.stringify({ type: 'state', snap: snapshot(w), score: scoreText(w.match), events, winner: w.match.winner });
      for (const ws of room.clients.keys()) sendCapped(ws, msg, lim);
    } catch (e) {  // a broken match ends its own room, never the whole server
      console.error('room stopped', e); closeRoom(room, 'match error', CLOSED_FOR_GOOD);
    }
  }

  function lobby(room) {
    const msg = JSON.stringify({ type: 'lobby', code: room.code, cfg: room.cfg, seats: room.seats, taken: [...room.clients.values()], away: Object.keys(room.away).map(Number), chars: room.chars, looks: room.looks, names: room.names, started: room.started, host: room.host, startsAt: room.startsAt });
    for (const ws of room.clients.keys()) sendCapped(ws, msg, lim);
  }

  wss.on('connection', (ws, req) => {
    ws.on('error', () => {});  // e.g. an oversized message: ws closes the socket itself; unhandled, the error would end the process
    const ip = ipKey(clientIp(req));
    if (!originOk(req) || wss.clients.size > lim.clients || (perIp.get(ip) || 0) >= lim.perIp) { ws.close(1008, 'not allowed'); return; }
    perIp.set(ip, (perIp.get(ip) || 0) + 1);
    ws.alive = true;
    ws.born = Date.now();
    ws.on('pong', () => { ws.alive = true; });
    const reply = (m) => sendCapped(ws, JSON.stringify(m), lim);  // replies too: a client that stops reading must not pile them up
    const fail = (msg) => reply({ type: 'error', msg });
    let lastList = 0;
    let room = null, win = 0, count = 0;
    // no guessing: wrong codes count per visitor, so opening a new socket does not start over
    const missed = () => { const n = (wrong.get(ip) || 0) + 1; wrong.set(ip, n); if (n >= 5) ws.close(1008, 'too many wrong codes'); };
    ws.on('message', (raw) => {
      const now = Date.now();
      if (now - win >= 1000) { win = now; count = 0; }
      if (++count > lim.msgsPerSec) return;  // flood: drop
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (!m || typeof m !== 'object') return;
      try { onMessage(m); } catch (e) {  // one bad message never takes the server down; our client never sends one, so the socket goes
        if (badLines++ < 10) console.error('bad message', e.message);
        ws.close(1008, 'bad message');
      }
    });
    // schedule:* (Match calendar). Tokens are hashed at once and never stored, sent back or logged.
    const hashTok = (v) => (typeof v === 'string' && v.length >= 8 && v.length <= 64 ? createHash('sha256').update(v).digest('hex') : null);
    const who = (m, th) => ({ th, vk: ownerKey(ip), name: cleanName(m.name) || 'Player', char: clamp(m.char | 0, 0, CHARACTERS - 1), level: clamp(m.level, 0, 7) });
    let lastSched = 0;
    function onSchedule(m) {
      const th = hashTok(m.token), t = clock(), id = String(m.id ?? '').slice(0, 16);
      if (m.type === 'schedule:list') {  // one a second per socket, like the open games list
        if (Date.now() - lastSched < 1000) return;
        lastSched = Date.now();
        return reply({ type: 'schedule', games: schedule.list(th, t), clients: wss.clients.size - 1, now: t });
      }
      const vk = ownerKey(ip), n = (schedWrites.get(vk) || 0) + 1;
      schedWrites.set(vk, n);
      if (n > (lim.schedWritesPerMin ?? 10)) return fail('The server is full. Try again later.');
      if (!th) return fail('Game not found.');
      let r;
      if (m.type === 'schedule:post') r = schedule.post({ at: Number(m.at), players: m.players === 4 ? 4 : 2, mode: m.mode === 'team' ? 'team' : 'face', open: m.open === true, ...who(m, th) }, t);
      else if (m.type === 'schedule:ask') r = schedule.ask({ id, ...who(m, th) }, t);
      else if (m.type === 'schedule:answer') r = schedule.answer({ id, reqId: String(m.reqId ?? '').slice(0, 16), accept: m.accept === true, th }, t);
      else if (m.type === 'schedule:cancel') r = schedule.cancel({ id, th }, t);
      else if (m.type === 'schedule:delete') r = schedule.remove({ id, th }, t);
      else return;
      if (!r.ok) return fail(r.err);
      saveNow();
      reply({ type: 'schedule:ok', games: schedule.list(th, t), now: t });
    }
    // schedule:enter → the posted game's room (made on the first entry, from 10 min before): seats follow the booking order, host first
    function enterRoom(m) {
      const th = hashTok(m.token), t = clock(), id = String(m.id ?? '').slice(0, 16);
      const g = schedule.get(id), idx = th ? schedule.seatsFor(id).findIndex(p => p.th === th) : -1;
      if (!g || g.cancelled || idx < 0 || t < g.at - SCHEDULE.enterMin * 60000 || t >= g.at + SCHEDULE.expireMin * 60000) return { err: 'Game not found.' };
      const code = schedCode(id);
      const target = rooms.get(code) || makeRoom(code, { ...sanitizeCfg({ players: g.players, mode: g.mode }), scheduled: id, at: g.at, graceUntil: g.at + SCHEDULE.graceMin * 60000 }, 'sched:' + id);
      const taken = new Set(target.clients.values());
      const seat = !taken.has(target.seats[idx]) ? target.seats[idx] : target.seats.find(s => !taken.has(s));
      return seat == null ? { err: 'Room is full or match already started' } : { code, seat };
    }
    let forcedSeat = null;
    function onMessage(m) {
      if (typeof m.type === 'string' && m.type.startsWith('schedule:')) {
        if (m.type !== 'schedule:enter') return onSchedule(m);
        const r = enterRoom(m);
        if (r.err) return fail(r.err);
        forcedSeat = r.seat;
        m = { ...m, type: 'join', code: r.code, quick: false, create: false, rejoin: undefined };
      }
      if (m.type === 'ping') reply({ type: 'pong', t: Number.isFinite(m.t) ? m.t : null, tick: tickAvg() });
      else if (m.type === 'list') {  // public lobbies that still have a free seat; one list a second per socket
        if (Date.now() - lastList < 1000) return;
        lastList = Date.now();
        reply({ type: 'rooms', rooms: openRooms().map(r => ({ code: r.code, players: r.cfg.players, ...(r.cfg.players === 4 && { mode: r.cfg.mode }), venue: r.cfg.venue,
          free: r.seats.length - r.clients.size, host: r.names[r.host] ?? '', char: r.chars[r.host] ?? 0 })) });  // whoever holds the room now: a creator who left is not listed
      } else if (m.type === 'join') {
        if (room) return fail('Already in a room');  // one room per connection
        const n = (joins.get(ip) || 0) + 1; joins.set(ip, n);
        if (n > lim.joinsPerMin) return fail('The server is full. Try again later.');
        let target;
        const want = m.quick === true && m.rejoin === undefined && sanitizeCfg(m.cfg, m);
        if (want) target = openRooms().find(r => r.cfg.auto && r.cfg.players === want.players && (want.players === 2 || r.cfg.mode === want.mode));  // longest waiting first
        if (target) { /* quick match: an open room of the same kind */ }
        else if ((m.create === true || want) && m.rejoin === undefined) {  // the server picks the code: never guessable, never someone else's room
          const owner = ownerKey(ip), mine = [...rooms.values()].filter(r => r.owner === owner).length;
          if ([...rooms.values()].filter(r => !r.started && !r.cfg.scheduled).length >= lim.waiting || mine >= lim.roomsPerIp) return fail('The server is full. Try again later.');
          target = makeRoom(newCode(), want ? { ...want, public: true } : sanitizeCfg(m.cfg, m), owner);
        } else {
          if ((wrong.get(ip) || 0) >= 5) return ws.close(1008, 'too many wrong codes');  // even a right code: each new socket would be a free guess
          target = rooms.get(String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
          if (!target) { fail('Room not found'); return missed(); }
        }
        if (typeof m.rejoin === 'string') {  // back after a dropped connection: the same seat, even in a match that has started
          const seat = Number(Object.keys(target.tokens).find(s => target.tokens[s] === m.rejoin));
          const a = target.away[seat];
          // a phone that switched networks comes back before the server noticed the old socket is dead: the token replaces it
          const old = target.started && !a && [...target.clients].find(([, s]) => s === seat)?.[0];
          if (!(a?.until >= Date.now()) && !old) { fail('Could not get back into the match'); return missed(); }
          if (old) { target.clients.delete(old); old.terminate(); }
          delete target.away[seat];
          room = target; ws.inRoom = true;
          room.clients.set(ws, seat);
          if (room.host == null) room.host = seat;
          if (a?.name) room.names[seat] = a.name;
          if (a?.look) room.looks[seat] = a.look;
          logLine(`rejoin seat=${seat}`);
          reply({ type: 'seat', seat, code: room.code, token: m.rejoin });
          return lobby(room);
        }
        const taken = new Set(target.clients.values());
        const seat = forcedSeat ?? target.seats.find(s => !taken.has(s));
        forcedSeat = null;
        if (seat == null || target.started) return fail('Room is full or match already started');
        room = target; ws.inRoom = true;
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
        if (m.name) room.names[seat] = cleanName(m.name);
        const look = sanitizeLook(m.look);
        if (look) room.looks[seat] = look;
        room.tokens[seat] = randomBytes(16).toString('base64url');  // lets this player back into the seat if the connection drops
        logLine(`join seat=${seat}`);
        reply({ type: 'seat', seat, code: room.code, token: room.tokens[seat] });
        countdown(room);
        lobby(room);
      } else if (!room) return;
      else if (m.type === 'start') {  // only the room creator (or whoever took over after they left)
        if (room.clients.get(ws) !== room.host || room.started || room.clients.size < 2) return;  // two people: the wizard asks the same
        if (!begin(room)) fail('The server is full. Try again later.');
      } else if (m.type === 'leave') {  // Exit: the seat goes to the AI for good, the others are told
        ws.leaving = true; ws.close(1000, 'left');
      } else if (m.type === 'input') {
        const seat = room.clients.get(ws);
        room.lastInput = Date.now();
        const prev = room.inputs[seat];
        const axis = (v) => Math.max(-1, Math.min(1, +v || 0));
        const mv = Array.isArray(m.move) ? [axis(m.move[0]), axis(m.move[1])] : [0, 0];  // always two numbers: a missing axis would turn hydration into NaN
        const shot = m.swing === 'auto' || (typeof m.swing === 'string' && Object.hasOwn(SHOTS, m.swing) && m.swing !== 'serve') ? m.swing : null;
        room.inputs[seat] = { move: mv, swing: shot || prev?.swing || null, aim: Math.max(-1, Math.min(1, +m.aim || 0)), eat: m.eat === true || !!prev?.eat, skip: m.skip === true || !!prev?.skip };
      }
    }
    ws.on('close', (code) => {
      const n = (perIp.get(ip) || 1) - 1;
      if (n) perIp.set(ip, n); else perIp.delete(ip);
      if (!room) return;
      const seat = room.clients.get(ws);
      if (seat === undefined) return;  // replaced by the same player's new connection (rejoin)
      room.clients.delete(ws);
      logLine(`leave seat=${seat} code=${code} started=${+room.started}`);  // why a player left; never an IP or a room code
      // mid-match the AI plays the seat while it waits for its player (rejoin); in the lobby the seat is simply free
      if (ws.leaving) {
        delete room.tokens[seat];
        const msg = JSON.stringify({ type: 'left', seat, name: room.names[seat] || '' });
        for (const c of room.clients.keys()) sendCapped(c, msg, lim);
      } else if (room.started && room.world.match.winner == null) room.away[seat] = { token: room.tokens[seat], until: Date.now() + lim.rejoinMs, name: room.names[seat], look: room.looks[seat] };
      delete room.looks[seat]; delete room.names[seat];
      if (!room.started) delete room.chars[seat];
      if (!room.clients.size) { if (!Object.keys(room.away).length) closeRoom(room); return; }
      if (seat === room.host) room.host = room.clients.values().next().value;  // the next player may start the match
      countdown(room);
      lobby(room);  // seat falls back to AI
    });
  });

  // HOST=127.0.0.1 when a tunnel is the only way in (otherwise every device on the Wi-Fi can reach the port too)
  return new Promise(resolve => httpServer.listen(port, process.env.HOST, () => resolve({
    port: httpServer.address().port, rooms, sweep, schedule,
    close: () => new Promise(done => { clearInterval(heartbeat); clearInterval(statusTimer); clearInterval(schedTimer); for (const r of rooms.values()) clearInterval(r.timer); for (const c of wss.clients) c.terminate(); wss.close(); httpServer.close(done); }),
  })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { port } = await startServer(+(process.argv[2] || process.env.PORT || 8080));
  console.log(`padel server on http://${process.env.HOST || '0.0.0.0'}:${port} (game + websocket)`);
}
