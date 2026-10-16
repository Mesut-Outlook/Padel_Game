// Padel match rules (shared client/server). Pure state machine driven by hit + contact events.
// Players: 0,1 = team 0 (z>0); 2,3 = team 1 (z<0). Singles: players 0 and 2.

export const PTS = ['0', '15', '30', '40'];

export function newMatch(opts = {}) {
  return {
    // starPoint (FIP 2026): advantage twice, third deuce is one deciding point. superTiebreak: 3rd set = tie-break to 10.
    opts: { sets: 3, goldenPoint: true, starPoint: false, superTiebreak: false, players: 4, ...opts },
    sets: [[0, 0]], games: [0, 0], points: [0, 0], tiebreak: false, tbTo: 7, tbStart: 0, deuces: 0,
    server: 0, serveOrder: [0, 2, 1, 3], serveIdx: 0, gamesPlayed: 0,
    rally: newRally(), winner: null, log: [],
  };
}

function newRally() {
  return { phase: 'serve', fault: 0, lastHitTeam: null, bouncesSinceHit: 0, netServe: false, let: false };
}

const teamOf = (pid) => (pid < 2 ? 0 : 1);

// Serving side: right box when total points even. Returns 1 (right) or -1 (left) from server's perspective.
export function serveSide(m) {
  return (m.points[0] + m.points[1]) % 2 === 0 ? 1 : -1;
}

export function serverId(m) {
  if (m.opts.players === 2) return m.serveOrder[m.serveIdx % 2 === 0 ? 0 : 1];
  return m.serveOrder[m.serveIdx % 4];
}

// Where server stands (world x,z) for current point
export function servePosition(m) {
  const zs = teamOf(serverId(m)) === 0 ? 1 : -1;
  // team0 faces -z so its right hand is +x... facing -z, right = -x. Team1 facing +z, right = +x.
  return [-zs * serveSide(m) * 2.5, zs * 9.6];
}

// Receiver's diagonal service box: opposite world-x half from the server.
export function serviceBox(m) {
  return { xSign: -Math.sign(servePosition(m)[0]), zMax: 6.95 };
}

export function onHit(m, pid) {
  const r = m.rally;
  const t = teamOf(pid);
  if (r.let) return replayServe(m);
  if (r.phase === 'serve') { r.phase = 'serveFlight'; r.lastHitTeam = t; r.bouncesSinceHit = 0; return null; }
  if (r.phase === 'serveFlight' && r.bouncesSinceHit === 0) return point(m, 1 - t, 'volleyed serve'); // receiver must let it bounce
  if (r.lastHitTeam === t && r.bouncesSinceHit === 0) return point(m, 1 - t, 'double hit');
  r.phase = 'rally'; r.lastHitTeam = t; r.bouncesSinceHit = 0;
  return null;
}

// Contact event from physics: {kind, side, p}
export function onContact(m, e) {
  const r = m.rally;
  if (r.phase === 'serve' || m.winner != null) return null;
  const hitter = r.lastHitTeam, opp = 1 - hitter;
  if (r.phase === 'serveFlight' && r.bouncesSinceHit === 0) {
    if (e.kind === 'net' && e.side === hitter) { r.netServe = true; return null; }
    if (e.kind !== 'floor') return serveFault(m, 'serve hit ' + e.kind);
    const box = serviceBox(m);
    const az = Math.abs(e.p[2]);
    const ok = e.side === opp && az <= box.zMax && Math.sign(e.p[0]) === box.xSign;
    if (!ok) return serveFault(m, 'serve out of box');
    r.bouncesSinceHit = 1;
    r.let = r.netServe;
    return null;
  }
  if (r.phase === 'serveFlight' && r.bouncesSinceHit === 1 && e.kind === 'mesh') return serveFault(m, 'serve into mesh');
  if (r.let) return replayServe(m);

  if (e.kind === 'out') return point(m, r.bouncesSinceHit > 0 ? hitter : opp, 'out');
  if (r.bouncesSinceHit === 0) {
    // ball hasn't reached opponent floor yet
    if (e.side === hitter) {
      if (e.kind === 'floor') return point(m, opp, 'bounced own side');
      if (e.kind === 'mesh') return point(m, opp, 'hit own mesh');
      if (e.kind === 'net') return null; // will drop on own side -> floor event decides
      return null; // own glass is allowed to play ball over
    }
    if (e.kind === 'floor') { r.bouncesSinceHit = 1; return null; }
    if (e.kind === 'net') return null;
    return point(m, opp, 'hit opponent wall directly');
  }
  // after first bounce on opponent side
  if (e.kind === 'floor') return point(m, hitter, 'double bounce');
  return null; // walls after bounce: still in play (out handled above)
}

function replayServe(m) {
  m.log.push('let');
  Object.assign(m.rally, { phase: 'serve', bouncesSinceHit: 0, netServe: false, let: false });
  return { let: true, why: 'let' };
}

function serveFault(m, why) {
  const r = m.rally;
  r.fault++;
  m.log.push('fault: ' + why);
  if (r.fault >= 2) return point(m, 1 - teamOf(serverId(m)), 'double fault');
  r.phase = 'serve'; r.bouncesSinceHit = 0;
  return { fault: true, why };
}

export function point(m, team, why) {
  m.log.push(`point T${team}: ${why}`);
  const p = m.points;
  p[team]++;
  const o = 1 - team;
  const star = m.opts.starPoint, sudden = star ? m.deuces >= 3 : m.opts.goldenPoint;
  let gameWon = false;
  if (m.tiebreak) gameWon = p[team] >= m.tbTo && p[team] - p[o] >= 2;
  else gameWon = p[team] >= 4 && (sudden || p[team] - p[o] >= 2);
  if (!m.tiebreak && !gameWon && p[team] === 4 && p[o] === 4) { p[0] = p[1] = 3; }
  if (!m.tiebreak && !gameWon && p[0] === 3 && p[1] === 3) m.deuces++;
  if (m.tiebreak && (p[0] + p[1]) % 2 === 1) m.serveIdx++; // tiebreak: change after 1st then every 2
  if (gameWon) game(m, team);
  m.rally = newRally();
  return { point: team, why };
}

function game(m, team) {
  const s = m.sets[m.sets.length - 1];
  s[team]++;
  m.points = [0, 0]; m.deuces = 0;
  const o = 1 - team;
  m.serveIdx = m.tiebreak ? m.tbStart + 1 : m.serveIdx + 1; // after a tie-break, its first receiver serves
  const setWon = m.tiebreak || (s[team] >= 6 && s[team] - s[o] >= 2);
  m.tiebreak = false;
  if (setWon) {
    const won = m.sets.filter(x => x[team] > x[1 - team]).length;
    if (won > m.opts.sets / 2) { m.winner = team; return; }
    m.sets.push([0, 0]);
    if (m.opts.superTiebreak && m.sets.length === 3) Object.assign(m, { tiebreak: true, tbTo: 10, tbStart: m.serveIdx });
  } else if (s[0] === 6 && s[1] === 6) Object.assign(m, { tiebreak: true, tbTo: 7, tbStart: m.serveIdx });
}

export function scoreText(m) {
  const sets = m.sets.map(s => s.join('-')).join('  ');
  const p = m.points;
  let pts;
  if (m.tiebreak) pts = p.join('-');
  else if (p[0] >= 3 && p[1] >= 3) pts = p[0] === p[1] ? (m.opts.starPoint ? (m.deuces >= 3 ? 'STAR POINT' : 'DEUCE') : m.opts.goldenPoint ? 'GOLDEN' : 'DEUCE') : (p[0] > p[1] ? 'AD-' : '-AD');
  else pts = PTS[Math.min(p[0], 3)] + '-' + PTS[Math.min(p[1], 3)];
  return { sets, pts };
}
