// Career profile and economy (pure: no DOM, shared with tests). Balance numbers come in as `eco` (data/economy.json).
// The profile is one JSON object saved in the browser; storage is passed in so a blocked localStorage never crashes.
export const PROFILE_KEY = 'padel.career.v1';
const VERSION = 1;
const STATS = ['speed', 'power', 'control', 'volley', 'smash', 'stamina'];

// template = a roster character (data/characters.json) whose look is the starting point; look = the player's edits
export function newProfile(template, look = {}) {
  const { stats: _s, aiLevel: _a, ...appearance } = template;
  return {
    version: VERSION,
    player: { ...appearance, ...look, id: 'me' },
    stats: Object.fromEntries(STATS.map(k => [k, 4])),
    credits: 0, rankingPoints: 0,
    inventory: ['r01', 'shoe_starter', 'kit_starter', 'ball_standard'],
    equipped: { racket: 'r01', shoes: 'shoe_starter', kit: 'kit_starter', ball: 'ball_standard', fuel: null },
    supplies: {},  // energy products (type 'fuel'): id -> count left; older profiles have no field = {}
    history: { played: 0, won: 0, pointsWon: 0 },
    circuit: {}, tournament: null,
  };
}

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const valid = (p) => isObj(p) && p.version === VERSION && isObj(p.player) && isObj(p.stats) && Array.isArray(p.inventory)
  && isNum(p.credits) && isNum(p.rankingPoints) && isObj(p.equipped) && isObj(p.history) && Object.values(p.stats).every(isNum);

export function loadProfile(storage) {
  let raw;
  try { raw = storage.getItem(PROFILE_KEY); } catch { return { profile: null, status: 'unavailable' }; }
  if (raw == null) return { profile: null, status: 'none' };
  try { const p = JSON.parse(raw); return valid(p) ? { profile: p, status: 'ok' } : { profile: null, status: 'corrupt' }; }
  catch { return { profile: null, status: 'corrupt' }; }
}

export function saveProfile(storage, profile) {
  try { storage.setItem(PROFILE_KEY, JSON.stringify(profile)); return true; } catch { return false; }
}

export const exportProfile = (profile) => JSON.stringify(profile, null, 2);
export function importProfile(text) {
  let p;
  try { p = JSON.parse(text); } catch { throw new Error('invalid profile'); }
  if (!valid(p)) throw new Error('invalid profile');
  return p;
}

// result = { won, gamesWon, pointsWon, scoring: 'sets'|'rally', ai: rookie|club|pro|legend|online, style? }
export function matchReward(result, eco) {
  const m = eco.match, lines = [{ label: 'Played', credits: m.base }];
  if (result.scoring === 'rally') lines.push({ label: `${result.pointsWon} points × ${m.perPointWon}`, credits: result.pointsWon * m.perPointWon });
  else lines.push({ label: `${result.gamesWon} games × ${m.perGameWon}`, credits: result.gamesWon * m.perGameWon });
  if (result.won) lines.push({ label: 'Win', credits: m.winBonus });
  if (result.style > 0) lines.push({ label: `Style ${result.style} pts`, credits: Math.floor(result.style / m.stylePerCredit) });
  const mult = eco.mult[result.ai] ?? 1;
  return { lines, mult, credits: Math.round(lines.reduce((n, l) => n + l.credits, 0) * mult) };
}

export function applyReward(profile, reward, result) {
  const h = profile.history;
  return {
    ...profile,
    credits: profile.credits + reward.credits,
    history: { played: h.played + 1, won: h.won + (result.won ? 1 : 0), pointsWon: h.pointsWon + (result.pointsWon || 0) },
  };
}

// Credits to raise a stat from `level` to level + 1
export const trainCost = (level, eco) => Math.round(eco.training.base * eco.training.growth ** (level - eco.training.start));

export function buyTraining(profile, stat, eco) {
  if (!STATS.includes(stat)) return { ok: false, reason: 'stat' };
  const level = profile.stats[stat];
  if (level >= eco.training.max) return { ok: false, reason: 'max' };
  const cost = trainCost(level, eco);
  if (profile.credits < cost) return { ok: false, reason: 'credits' };
  return { ok: true, profile: { ...profile, credits: profile.credits - cost, stats: { ...profile.stats, [stat]: level + 1 } } };
}

// shop: { tiers: {name: rankingPoints}, items }. Items unlock by tier; rackets come from data/rackets.json with the same fields.
export function tierOf(rankingPoints, shop) {
  return Object.entries(shop.tiers).filter(([, min]) => rankingPoints >= min).sort((a, b) => b[1] - a[1])[0][0];
}

// energy products stack (a pack of item.pack per purchase) and the first one bought goes straight into the bag
export function buyItem(profile, item, shop) {
  const fuel = item.type === 'fuel';
  if (!fuel && profile.inventory.includes(item.id)) return { ok: false, reason: 'owned' };
  if (profile.rankingPoints < shop.tiers[item.tier]) return { ok: false, reason: 'tier' };
  if (profile.credits < item.price) return { ok: false, reason: 'credits' };
  const credits = profile.credits - item.price;
  if (!fuel) return { ok: true, profile: { ...profile, credits, inventory: [...profile.inventory, item.id] } };
  const supplies = { ...profile.supplies, [item.id]: (profile.supplies?.[item.id] || 0) + item.pack };
  return { ok: true, profile: { ...profile, credits, supplies, equipped: { ...profile.equipped, fuel: profile.equipped.fuel || item.id } } };
}

// slot 'fuel' takes a product with some left, or null to play without one
const has = (profile, slot, id) => (slot === 'fuel' ? id === null || profile.supplies?.[id] > 0 : profile.inventory.includes(id));
export const equip = (profile, slot, id) => has(profile, slot, id) ? { ...profile, equipped: { ...profile.equipped, [slot]: id } } : profile;

// at the start of a career match: one of the bagged product is used up (no refund if the match is abandoned);
// fuel = { boost, tire, name } for game.js, or null. The bag empties itself when the last one goes.
export function useFuel(profile, shop) {
  const id = profile.equipped?.fuel, item = shop.items.find(i => i.id === id && i.type === 'fuel');
  if (!item || !(profile.supplies?.[id] > 0)) return { profile, fuel: null };
  const left = profile.supplies[id] - 1;
  return {
    profile: { ...profile, supplies: { ...profile.supplies, [id]: left }, equipped: { ...profile.equipped, fuel: left > 0 ? id : null } },
    fuel: { boost: item.boost, tire: item.tire, name: item.name },
  };
}

// circuit entry (data/tournaments.json): champion gets championPoints and 10x that in Credits; lower places get a share
const SHARE = [[1, 1], [2, 0.6], [4, 0.36], [8, 0.18]];
export function tournamentReward(entry, placement) {
  const share = (SHARE.find(([last]) => placement <= last) || [0, 0.09])[1];
  return { rankingPoints: Math.round(entry.championPoints * share), credits: Math.round(entry.championPoints * 10 * share) };
}

// rank = the player's current world rank (1 = top)
export function canEnter(profile, entry, rank) {
  if (entry.inviteTop && rank > entry.inviteTop) return { ok: false, reason: 'invite' };
  if (profile.rankingPoints < entry.minRankingPoints) return { ok: false, reason: 'ranking' };
  if (profile.credits < entry.entryFee) return { ok: false, reason: 'credits' };
  return { ok: true };
}

// fixed AI table: strongest roster characters (stat total) on top, points falling from 6000 to 0 on a curve
export function aiRankingTable(characters) {
  const total = (c) => Object.values(c.stats).reduce((a, b) => a + b, 0);
  const sorted = [...characters].sort((a, b) => total(b) - total(a) || a.id.localeCompare(b.id)), n = sorted.length;
  return sorted.map((c, i) => ({ id: c.id, name: c.name, points: Math.round(6000 * ((n - 1 - i) / (n - 1)) ** 2) }));
}

export const worldRanking = (profile, aiTable) =>
  [...aiTable, { id: 'me', name: profile.player.name, points: profile.rankingPoints }].sort((a, b) => b.points - a.points);
