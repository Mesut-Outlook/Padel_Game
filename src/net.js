// Online client: joins a room on the authoritative server, sends inputs, buffers snapshots for smooth rendering.
export function connect({ url, code, cfg, char, stats, racket, onLobby, onError, ...extra }) {  // extra: public, name, look, shoes, ball
  const ws = new WebSocket(url);
  const net = { seat: null, lobby: null, snaps: [], events: [], score: null, winner: null, ws };
  ws.onopen = () => ws.send(JSON.stringify({ type: 'join', code, cfg, char, stats, racket, ...extra }));
  ws.onerror = () => onError?.('Could not connect to server: ' + url);
  ws.onclose = () => onError?.('Connection closed');
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.type === 'seat') net.seat = m.seat;
    else if (m.type === 'lobby') { net.lobby = m; onLobby?.(m); }
    else if (m.type === 'error') onError?.(m.msg);
    else if (m.type === 'state') {
      m.snap.rt = performance.now();
      net.snaps.push(m.snap);
      if (net.snaps.length > 30) net.snaps.shift();
      net.events.push(...m.events);
      net.score = m.score; net.winner = m.winner;
    }
  };
  let lastSent = '';
  net.send = (inp) => {
    if (ws.readyState !== 1) return;
    const s = JSON.stringify({ type: 'input', ...inp });
    if (s !== lastSent || inp.swing) { ws.send(s); lastSent = s; }
  };
  net.start = () => ws.readyState === 1 && ws.send(JSON.stringify({ type: 'start' }));
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
    ws.onerror = () => done(reject, new Error('Could not connect to server: ' + url));
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.type === 'rooms') done(resolve, m.rooms); };
  });
}
