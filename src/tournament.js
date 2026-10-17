// Tournament engine (pure: no DOM, JSON-serialisable state so a tournament survives a reload).
// americano / mexicano: entrants are players, a match side is [id, id]; knockout / league: entrants are pairs, a side is a pair id.
// The human is 'me' (or the pair with id 'me'); their match is played for real, every other match is simulated from ratings.
const SCORING = { americano: { pointsTo: 16 }, mexicano: { pointsTo: 16 }, knockout: { sets: 1 }, league: { sets: 1 } };

export function createTournament({ format, entrants, rng = Math.random }) {
  const T = { format, scoring: SCORING[format], entrants, rounds: [], round: 0, done: false };
  T.rounds.push(pairings(T, rng));
  return T;
}

const ids = (T) => T.entrants.map(e => e.id);
const side = (x) => [].concat(x);
const mk = (T, list) => list.map(([a, b], i) => ({ id: `r${T.rounds.length}m${i}`, court: i + 1, a, b, score: null }));

// circle method: player 0 fixed, the rest rotate one place per round
function circle(list, r) {
  const rest = list.slice(1), k = r % rest.length;
  return [list[0], ...rest.slice(rest.length - k), ...rest.slice(0, rest.length - k)];
}
const seedOrder = (n) => n === 1 ? [1] : seedOrder(n / 2).flatMap(s => [s, n + 1 - s]);

function pairings(T, rng) {
  const r = T.rounds.length, list = ids(T);
  if (T.format === 'americano') {  // round r of the 8-player round robin: (0,7) (1,6) on court 1, (2,5) (3,4) on court 2
    const c = circle(list, r), p = [0, 1, 2, 3].map(i => [c[i], c[7 - i]]);
    return mk(T, [[p[0], p[1]], [p[2], p[3]]]);
  }
  if (T.format === 'mexicano') {
    const s = r === 0 ? shuffle(list, rng) : standings(T).map(x => x.id);
    return mk(T, [[[s[0], s[3]], [s[1], s[2]]], [[s[4], s[7]], [s[5], s[6]]]]);
  }
  if (T.format === 'knockout') {
    if (r === 0) {
      const byRating = [...T.entrants].sort((a, b) => b.rating - a.rating).map(e => e.id), order = seedOrder(list.length);
      return mk(T, Array.from({ length: list.length / 2 }, (_, i) => [byRating[order[2 * i] - 1], byRating[order[2 * i + 1] - 1]]));
    }
    const w = T.rounds[r - 1].map(winner);
    return mk(T, Array.from({ length: w.length / 2 }, (_, i) => [w[2 * i], w[2 * i + 1]]));
  }
  // league: circle method over pairs, null = bye
  const c = circle(list.length % 2 ? [...list, null] : list, r), n = c.length;
  return mk(T, Array.from({ length: n / 2 }, (_, i) => [c[i], c[n - 1 - i]]).filter(([a, b]) => a != null && b != null));
}

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const totalRounds = (T) => ({ americano: 7, mexicano: 5, knockout: Math.log2(T.entrants.length), league: T.entrants.length - (T.entrants.length % 2 ? 0 : 1) })[T.format];
const winner = (m) => (m.score.a > m.score.b ? m.a : m.b);

export const currentMatches = (T) => (T.done ? [] : T.rounds[T.round]);
export const isFinished = (T) => T.done;
export const myMatch = (T) => currentMatches(T).find(m => !m.score && [...side(m.a), ...side(m.b)].includes('me')) || null;

export function reportResult(T, match, score) {
  const next = JSON.parse(JSON.stringify(T));
  next.rounds[next.round].find(m => m.id === match.id).score = { a: score.a, b: score.b };
  return advance(next);
}

export function simulateOthers(T, rng = Math.random) {
  const next = JSON.parse(JSON.stringify(T)), rating = (x) => side(x).reduce((n, id) => n + next.entrants.find(e => e.id === id).rating, 0) / side(x).length;
  for (const m of currentMatches(next)) {
    if (m.score || [...side(m.a), ...side(m.b)].includes('me')) continue;
    m.score = simulateMatch(rating(m.a), rating(m.b), next.scoring, rng);
  }
  return advance(next, rng);
}

// a finished round opens the next one (mexicano needs the table, knockout the winners)
function advance(T, rng = Math.random) {
  if (T.done || T.rounds[T.round].some(m => !m.score)) return T;
  if (T.round + 1 >= totalRounds(T)) { T.done = true; return T; }
  T.rounds.push(pairings(T, rng));
  T.round++;
  return T;
}

// per-rally win chance from the rating gap; rally race to N, or one set to 6 (golden point, tie-break at 6-6)
export function simulateMatch(ratingA, ratingB, scoring, rng = Math.random) {
  const p = Math.min(0.8, Math.max(0.2, 0.5 + (ratingA - ratingB) * 0.03));
  const race = (to, by = 1) => { const s = [0, 0]; while (Math.max(...s) < to || Math.abs(s[0] - s[1]) < by) s[rng() < p ? 0 : 1]++; return s; };
  if (scoring.pointsTo) { const [a, b] = race(scoring.pointsTo); return { a, b }; }
  // ponytail: one set only (all formats here play 1 set); add a best-of-3 loop when a format needs it
  const g = [0, 0], game = (tb) => { const [a, b] = tb ? race(7, 2) : race(4); return a > b ? 0 : 1; };
  for (;;) {
    const tb = g[0] === 6 && g[1] === 6;
    g[game(tb)]++;
    if (tb || (Math.max(...g) >= 6 && Math.abs(g[0] - g[1]) >= 2)) break;
  }
  return { a: g[0], b: g[1] };
}

export function standings(T) {
  const row = Object.fromEntries(ids(T).map(id => [id, { id, points: 0, wins: 0, diff: 0 }]));
  for (const m of T.rounds.flat()) {
    if (!m.score) continue;
    for (const [s, mine, theirs] of [[m.a, m.score.a, m.score.b], [m.b, m.score.b, m.score.a]]) {
      for (const id of side(s)) { row[id].points += mine; row[id].diff += mine - theirs; if (mine > theirs) row[id].wins++; }
    }
  }
  const rows = Object.values(row);
  if (T.format === 'knockout') return rows.sort((a, b) => placement(T, a.id) - placement(T, b.id));
  const key = T.format === 'league' ? 'wins' : 'points';
  return rows.sort((a, b) => b[key] - a[key] || b.diff - a.diff);
}

// final place; knockout losers share the place of their round (3 for semi-finals, 5 for quarter-finals, …)
export function placement(T, id) {
  if (T.format !== 'knockout') return standings(T).findIndex(s => s.id === id) + 1;
  for (let r = T.rounds.length - 1; r >= 0; r--) {
    const m = T.rounds[r].find(x => x.a === id || x.b === id);
    if (!m) continue;
    return m.score && winner(m) === id && r === totalRounds(T) - 1 ? 1 : T.rounds[r].length + 1;
  }
  return T.entrants.length;
}
