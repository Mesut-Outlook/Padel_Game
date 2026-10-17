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
    equipped: { racket: 'r01', shoes: 'shoe_starter', kit: 'kit_starter', ball: 'ball_standard' },
    history: { played: 0, won: 0, pointsWon: 0 },
    circuit: {}, tournament: null,
  };
}

const valid = (p) => p && typeof p === 'object' && p.version === VERSION && p.player && p.stats && Array.isArray(p.inventory);

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

// result = { won, gamesWon, pointsWon, scoring: 'sets'|'rally', ai: rookie|club|pro|legend|online }
export function matchReward(result, eco) {
  const m = eco.match, lines = [{ label: 'Played', credits: m.base }];
  if (result.scoring === 'rally') lines.push({ label: `${result.pointsWon} points × ${m.perPointWon}`, credits: result.pointsWon * m.perPointWon });
  else lines.push({ label: `${result.gamesWon} games × ${m.perGameWon}`, credits: result.gamesWon * m.perGameWon });
  if (result.won) lines.push({ label: 'Win', credits: m.winBonus });
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
