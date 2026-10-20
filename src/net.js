// Online client: joins a room on the authoritative server, sends inputs, buffers snapshots for smooth rendering.
import { debugOn } from './debug.js';
import { N_ } from './i18n.js';
// a dropped connection mid-match tries again after these waits (~30 s in all); the server keeps the seat for a minute, the AI plays it
const RETRY = [1000, 2000, 4000, 8000, 15000];
// what the server (server/server.js fail()) and this file report through onError: fixed sentences, so the UI can translate them
export const NET_TEXTS = [N_('Room not found'), N_('Room is full or match already started'), N_('Already in a room'), N_('The server is full. Try again later.'),
  N_('Could not get back into the match'), N_('Connection closed'), N_('Could not connect to the game server.'), N_('Server did not answer')];

export function connect({ url, code, cfg, char, stats, racket, onLobby, onError, onStatus, ...extra }) {  // extra: public, name, look, shoes, ball, bag
  const net = { seat: null, lobby: null, snaps: [], events: [], score: null, winner: null, ws: null, token: null };
  let tries = 0, lastSent = '';
  function open(join) {
    const ws = net.ws = new WebSocket(url);
    ws.onopen = () => ws.send(JSON.stringify(join));
    ws.onerror = () => { if (!net.lobby) onError?.('Could not connect to the game server.'); };
    ws.onclose = () => {
      if (net.ws !== ws) return;
      if (net.lobby?.started && net.winner == null && net.token && tries < RETRY.length) {  // mid-match: get the seat back
        onStatus?.('reconnecting');
        setTimeout(() => open({ type: 'join', code: net.lobby.code, rejoin: net.token }), RETRY[tries++]);
      } else onError?.('Connection closed');
    };
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.type === 'seat') { net.seat = m.seat; net.token = m.token; lastSent = ''; if (tries) { tries = 0; onStatus?.('back'); } }
      else if (m.type === 'pong') { net.rtt = performance.now() - m.t; net.srvTick = m.tick; }
      else if (m.type === 'lobby') { net.lobby = m; onLobby?.(m); }
      else if (m.type === 'error') { if (join.rejoin) tries = RETRY.length; onError?.(m.msg); }  // the seat is gone: stop trying
      else if (m.type === 'state') {
        m.snap.rt = performance.now();
        net.snaps.push(m.snap);
        if (net.snaps.length > 30) net.snaps.shift();
        net.events.push(...m.events);
        net.score = m.score; net.winner = m.winner;
      }
    };
  }
  open({ type: 'join', code, cfg, char, stats, racket, ...extra });
  // debug panel only: RTT + the server's tick time
  if (debugOn()) setInterval(() => net.ws.readyState === 1 && net.ws.send(JSON.stringify({ type: 'ping', t: performance.now() })), 2000);
  net.send = (inp) => {
    const ws = net.ws;
    if (ws.readyState !== 1) return;
    const s = JSON.stringify({ type: 'input', ...inp });
    if (s !== lastSent || inp.swing || inp.eat || inp.skip) { ws.send(s); lastSent = s; }
  };
  net.start = () => net.ws.readyState === 1 && net.ws.send(JSON.stringify({ type: 'start' }));
  // render ~70ms in the past, interpolating between buffered server snapshots
  net.view = () => {
    const S = net.snaps;
    if (!S.length) return null;
    const t = performance.now() - 70;
    let i = S.length - 1;
    while (i > 0 && S[i - 1].rt > t) i--;
    const a = S[Math.max(0, i - 1)], b = S[i];
    if (a === b || b.rt <= a.rt) return b;
    const k = Math.max(0, Math.min(1, (t - a.rt) / (b.rt - a.rt)));
    const L = (x, y) => x + (y - x) * k;
    return { ...b, b: b.b.map((v, j) => L(a.b[j], v)), pl: b.pl.map((p, j) => [L(a.pl[j][0], p[0]), L(a.pl[j][1], p[1]), ...p.slice(2)]) };
  };
  return net;
}

// public lobbies on the server: [{ code, players, venue, free, host }]
export function listRooms(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const done = (fn, v) => { clearTimeout(timer); ws.onclose = ws.onerror = null; ws.close(); fn(v); };
    const timer = setTimeout(() => done(reject, new Error('Server did not answer')), 4000);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'list' }));
    ws.onerror = () => done(reject, new Error('Could not connect to the game server.'));
    ws.onmessage = (ev) => {  // the server may be anyone's (?server=): keep only the fields the list shows, as plain strings and numbers
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m?.type === 'rooms') done(resolve, (Array.isArray(m.rooms) ? m.rooms : []).map(r => ({
        code: String(r?.code ?? ''), host: String(r?.host ?? ''), venue: Number(r?.venue) || 0, players: Number(r?.players) || 0, free: Number(r?.free) || 0,
      })));
    };
  });
}
