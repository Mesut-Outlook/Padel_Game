// Posted games ("Match calendar"): who hosts, who holds a seat, who asked, and every rule about them. Pure: the caller passes
// the time, hashed tokens (th) and visitor keys (vk); nothing here touches sockets, files or the DOM. Spec: docs/superpowers/specs/2026-11-08-scheduled-games-design.md
import { randomUUID } from 'node:crypto';

const M = 60000;
export const SCHEDULE = { aheadDays: 7, slotMin: 30, leadMin: 15, windowMs: 5400000, maxOverlap: 8, perVisitorPosts: 1, perVisitorSeats: 2, maxRequests: 8, maxPosts: 60, autoAcceptMin: 60, enterMin: 10, graceMin: 3, expireMin: 15 };

const ERR = {
  time: 'That time is not available.', slot: 'That time slot is full. Pick another time.', posted: 'You already have a game posted.',
  booked: 'You already have two games booked.', requests: 'This game has enough requests.', full: 'This game is full.',
  missing: 'Game not found.', schedule: 'The schedule is full. Try again later.',
};
const shortId = () => randomUUID().replace(/-/g, '').slice(0, 8);
const person = ({ th, vk, name, char, level }) => ({ th, vk, name: String(name ?? ''), char: char | 0, level: Number(level) || 0 });
const pub = ({ name, char, level }) => ({ name, char, level });

export function createSchedule(limits = {}, state = null) {
  const L = { ...SCHEDULE, ...limits }, newId = L.newId || shortId;
  const games = new Map();
  for (const g of state?.games || []) games.set(g.id, { ...g, host: { ...g.host }, seats: g.seats.map(p => ({ ...p })), requests: g.requests.map(p => ({ ...p })), declined: [...g.declined] });

  const live = () => [...games.values()].filter(g => !g.cancelled);
  const guestSeats = (g) => (g.players === 4 ? 3 : 1);
  const free = (g) => guestSeats(g) - g.seats.length;
  const mine = (p, th, vk) => p.th === th || (vk != null && p.vk === vk);
  const booked = (th, vk) => live().reduce((n, g) => n + g.seats.filter(p => mine(p, th, vk)).length + g.requests.filter(p => mine(p, th, vk)).length, 0);
  const role = (g, th) => {
    if (!th) return null;
    if (g.host.th === th) return g.cancelled ? 'cancelled' : 'host';
    const involved = g.seats.some(p => p.th === th) ? 'seat' : g.requests.some(p => p.th === th) ? 'pending' : g.declined.includes(th) ? 'declined' : null;
    return g.cancelled && involved ? 'cancelled' : involved;
  };
  const newest = () => Math.max(0, ...[...games.values()].map(g => g.createdAt));

  return {
    slotTaken: (at) => live().filter(g => Math.abs(g.at - at) < L.windowMs).length,

    post({ at, players, mode, open, th, vk, name, char, level }, now) {
      if (!Number.isFinite(at) || at % (L.slotMin * M) !== 0 || at < now + L.leadMin * M || at > now + L.aheadDays * 24 * 60 * M) return { ok: false, err: ERR.time };
      if (live().some(g => mine(g.host, th, vk))) return { ok: false, err: ERR.posted };
      if (games.size >= L.maxPosts) return { ok: false, err: ERR.schedule };
      if (this.slotTaken(at) >= L.maxOverlap) return { ok: false, err: ERR.slot };
      const game = { id: newId(), at, players: players === 4 ? 4 : 2, mode: mode === 'team' ? 'team' : 'face', open: !!open, host: person({ th, vk, name, char, level }), seats: [], requests: [], declined: [], cancelled: false, started: false, createdAt: now };
      games.set(game.id, game);
      return { ok: true, game: { id: game.id, at: game.at } };
    },

    ask({ id, th, vk, name, char, level }, now) {
      const g = games.get(id);
      if (!g || g.cancelled || g.host.th === th) return { ok: false, err: ERR.missing };
      const status = role(g, th);
      if (status === 'seat') return { ok: true, status: 'accepted' };
      if (status === 'pending' || status === 'declined') return { ok: true, status };
      if (booked(th, vk) >= L.perVisitorSeats) return { ok: false, err: ERR.booked };
      if (free(g) <= 0) return { ok: false, err: ERR.full };
      if (g.open) { g.seats.push({ ...person({ th, vk, name, char, level }), joinedAt: now }); return { ok: true, status: 'accepted' }; }
      if (g.requests.length >= L.maxRequests) return { ok: false, err: ERR.requests };
      g.requests.push({ ...person({ th, vk, name, char, level }), reqId: shortId(), askedAt: now });
      return { ok: true, status: 'pending' };
    },

    answer({ id, reqId, accept, th }, now) {
      const g = games.get(id);
      if (!g || g.cancelled || g.host.th !== th) return { ok: false, err: ERR.missing };
      const i = g.requests.findIndex(r => r.reqId === reqId);
      if (i < 0) return { ok: false, err: ERR.missing };
      if (accept && free(g) <= 0) return { ok: false, err: ERR.full };
      const [r] = g.requests.splice(i, 1);
      if (accept) g.seats.push({ ...r, joinedAt: now });
      else g.declined.push(r.th);
      return { ok: true };
    },

    cancel({ id, th }) {
      const g = games.get(id);
      if (!g) return { ok: false, err: ERR.missing };
      g.seats = g.seats.filter(p => p.th !== th);
      g.requests = g.requests.filter(p => p.th !== th);
      return { ok: true };
    },

    remove({ id, th }) {
      const g = games.get(id);
      if (!g || g.host.th !== th) return { ok: false, err: ERR.missing };
      g.cancelled = true;
      return { ok: true };
    },

    list(th, now) {
      return [...games.values()]
        .filter(g => now < g.at + L.expireMin * M && (!g.cancelled || role(g, th) === 'cancelled'))
        .sort((a, b) => a.at - b.at)
        .map(g => ({
          id: g.id, at: g.at, players: g.players, mode: g.mode, open: g.open, host: pub(g.host), seats: g.seats.map(pub), free: free(g), mine: role(g, th),
          ...(th && g.host.th === th && !g.cancelled ? { requests: g.requests.map(r => ({ reqId: r.reqId, ...pub(r), ago: now - r.askedAt })) } : {}),
        }));
    },

    sweep(now) {
      const out = { started: [], expired: [] };
      if (now < newest()) return out;  // the Pi's clock before NTP: never expire or start on a wrong time
      for (const g of games.values()) {
        if (now >= g.at + L.expireMin * M) { games.delete(g.id); out.expired.push(g.id); continue; }
        if (g.cancelled) continue;
        if (now >= g.at - L.autoAcceptMin * M) while (g.requests.length && free(g) > 0) g.seats.push({ ...g.requests.shift(), joinedAt: now });
        if (now >= g.at && !g.started) { g.started = true; out.started.push({ id: g.id, at: g.at, players: g.players, mode: g.mode }); }
      }
      return out;
    },

    seatsFor(id) {
      const g = games.get(id);
      return g ? [g.host, ...g.seats].map(({ th, name, char, level }) => ({ th, name, char, level })) : [];
    },

    get: (id) => games.get(id),

    toJSON() {  // the schedule file: no visitor keys (they only live as long as the server process)
      const strip = ({ vk, ...p }) => p;
      return { games: [...games.values()].map(g => ({ ...g, host: strip(g.host), seats: g.seats.map(strip), requests: g.requests.map(strip) })) };
    },
  };
}
