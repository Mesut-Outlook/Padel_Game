// Career profile and economy (pure: no DOM, shared with tests). Balance numbers come in as `eco` (data/economy.json).
// The profile is one JSON object saved in the browser; storage is passed in so a blocked localStorage never crashes.
import { TIERS, tierAt, rateMatch, matchShare, idleReliability, startCredits } from './level.js';
import { xpFromTally } from './matchstats.js';

export const PROFILE_KEY = 'padel.career.v1';
const VERSION = 2;  // 2: level / reliability / bestTier, stats start at 5 (v1 profiles migrate on load)
const STATS = ['speed', 'power', 'control', 'volley', 'smash', 'stamina'];
const STARTER_BAG = { bag_water: 4, bag_banana: 3 };
const DRINKS = ['bag_water', 'bag_isotonic'], FOODS = ['bag_banana', 'bag_gel'];

// template = a roster character (data/characters.json) whose look is the starting point; look = the player's edits;
// start = the level from the questionnaire / Playtomic entry (level.js), a high start comes with some Credits
export function newProfile(template, look = {}, start = { level: 1.5, reliability: 0.2 }) {
  const { stats: _s, aiLevel: _a, ...appearance } = template;
  return {
    version: VERSION,
    player: { ...appearance, ...look, id: 'me', templateId: template.id },
    stats: Object.fromEntries(STATS.map(k => [k, 5])),
    level: start.level, reliability: start.reliability, bestTier: tierAt(start.level).index, lastCareerMatch: null,
    credits: startCredits(start.level), rankingPoints: 0,
    inventory: ['r01', 'shoe_starter', 'kit_starter', 'ball_standard'],
    equipped: { racket: 'r01', shoes: 'shoe_starter', kit: 'kit_starter', ball: 'ball_standard' },
    bag: { ...STARTER_BAG },  // food and drinks (shop type 'bag'): id -> count; game.js BAG has the effects
    history: { played: 0, won: 0, pointsWon: 0 },
    circuit: {}, tournament: null,
  };
}

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const valid = (p, version = VERSION) => isObj(p) && p.version === version && isObj(p.player) && isObj(p.stats) && Array.isArray(p.inventory)
  && isNum(p.credits) && isNum(p.rankingPoints) && isObj(p.equipped) && isObj(p.history) && Object.values(p.stats).every(isNum);

export function loadProfile(storage, now = new Date(), eco = null) {  // eco: expire old ranking points (data/economy.json)
  let raw;
  try { raw = storage.getItem(PROFILE_KEY); } catch { return { profile: null, status: 'unavailable' }; }
  if (raw == null) return { profile: null, status: 'none' };
  let p;
  try { p = JSON.parse(raw); } catch { return { profile: null, status: 'corrupt' }; }
  if (valid(p, 1)) {  // one-time v1 -> v2 migration; the v1 JSON stays next to it as a backup
    p = migrateProfile(p);
    try { storage.setItem(PROFILE_KEY + '.bak', raw); storage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* best effort: migrates again next load */ }
  }
  if (valid(p)) {
    const q = normalizeProfile(p);
    if (q !== p) { p = q; saveProfile(storage, p); }
  }
  if (valid(p) && eco) {
    const q = expirePoints(p, eco, now);
    if (q !== p) { p = q; saveProfile(storage, p); }
  }
  return valid(p) ? { profile: p, status: 'ok' } : { profile: null, status: 'corrupt' };
}

// v1 had no level: estimate it from the old ranking-point tier; stats below the new average start (5) come up to 5
const V1_LEVELS = [[10, 1], [60, 2], [200, 3], [600, 4], [1500, 5]];
const V1_ENTRY_TIERS = [[1300, 7], [180, 5]];  // FIP Gold / Premier P1 were open at these ranking points: keep them open
export function migrateProfile(p) {
  const level = (V1_LEVELS.find(([below]) => p.rankingPoints < below) || [0, 6])[1];
  const entryTier = (V1_ENTRY_TIERS.find(([from]) => p.rankingPoints >= from) || [0, 1])[1];
  return {
    ...p, version: VERSION, level, reliability: 0.5, bestTier: Math.max(tierAt(level).index, entryTier), lastCareerMatch: null,
    stats: Object.fromEntries(Object.entries(p.stats).map(([k, v]) => [k, Math.max(5, v)])),
  };
}

// profiles from before the bag: the starter bag plus their old energy products (fuel_x -> bag_x); a count above the
// limit is kept, only buying more is blocked
export function normalizeProfile(p) {
  if (isObj(p.bag)) return p;
  const { supplies, ...rest } = p, { fuel: _f, ...equipped } = p.equipped, bag = { ...STARTER_BAG };
  for (const [id, n] of Object.entries(supplies || {})) if (n > 0) { const k = id.replace('fuel_', 'bag_'); bag[k] = (bag[k] || 0) + n; }
  return { ...rest, equipped, bag };
}

export const bagLimit = (profile) => (profile.inventory.includes('bag_pro') ? 16 : 8);
// free places for this item's kind (drinks or food)
export function bagRoom(profile, item) {
  const kind = DRINKS.includes(item.id) ? DRINKS : FOODS;
  return Math.max(0, bagLimit(profile) - kind.reduce((n, k) => n + (profile.bag?.[k] || 0), 0));
}
// items = { id: count } added as far as the bag has room
function addToBag(profile, items) {
  let p = profile;
  for (const [id, n] of Object.entries(items)) p = { ...p, bag: { ...p.bag, [id]: (p.bag?.[id] || 0) + Math.min(n, bagRoom(p, { id })) } };
  return p;
}

// after a career match: myPair / oppPair = the two sides' average levels (level.js aiLevel for AI players)
// a new best tier pays tierUpCredits × its number (economy.json tierUp), once, and puts tierUpBag into the bag
export function applyRating(profile, myPair, oppPair, result, now = new Date(), tierUpCredits = 0, tierUpBag = {}) {
  const idle = profile.lastCareerMatch ? (now - new Date(profile.lastCareerMatch)) / 864e5 : 0;
  const r = rateMatch({ level: profile.level, reliability: idleReliability(profile.reliability, idle) }, myPair, oppPair, !!result.won, matchShare(result));
  const tier = tierAt(r.level), bestTier = Math.max(profile.bestTier || 1, tier.index);
  const old = profile.bestTier || 1, tierUp = bestTier > old ? tier : null;
  let bonus = 0;
  for (let i = old + 1; i <= bestTier; i++) bonus += tierUpCredits * i;  // a jump over several tiers pays each of them
  const next = { ...profile, level: r.level, reliability: r.reliability, bestTier, lastCareerMatch: now.toISOString(), credits: profile.credits + bonus };
  return {
    profile: tierUp ? addToBag(next, tierUpBag) : next,
    delta: r.delta, tierUp, bonus,
  };
}

export function saveProfile(storage, profile) {
  try { storage.setItem(PROFILE_KEY, JSON.stringify(profile)); return true; } catch { return false; }
}

export const exportProfile = (profile) => JSON.stringify(profile, null, 2);
export function importProfile(text) {
  let p;
  try { p = JSON.parse(text); } catch { throw new Error('invalid profile'); }
  if (valid(p, 1)) p = migrateProfile(p);  // exports saved before v2 (and the history.state backup)
  if (!valid(p)) throw new Error('invalid profile');
  return normalizeProfile(p);
}

// result = { won, gamesWon, pointsWon, scoring: 'sets'|'rally', ai: rookie|club|pro|legend|online, style? }
// bonus = { firstWin, streak: 0..streakMax } from settleMatch; both are added before the AI multiplier
export function matchReward(result, eco, bonus = {}) {
  const mult = eco.mult[result.ai] ?? 1;
  if (result.forfeit) return { lines: [{ label: 'Forfeit', credits: 0 }], mult, credits: 0 };  // quitting must not farm the 'Played' Credits
  const m = eco.match, lines = [{ label: 'Played', credits: m.base }];
  if (result.scoring === 'rally') lines.push({ label: `${result.pointsWon} points × ${m.perPointWon}`, credits: result.pointsWon * m.perPointWon });
  else lines.push({ label: `${result.gamesWon} games × ${m.perGameWon}`, credits: result.gamesWon * m.perGameWon });
  if (result.won) lines.push({ label: 'Win', credits: m.winBonus });
  if (result.style > 0) lines.push({ label: `Style ${result.style} pts`, credits: Math.floor(result.style / m.stylePerCredit) });
  const sub = lines.reduce((n, l) => n + l.credits, 0);
  if (bonus.firstWin) lines.push({ label: `First win of the day ×${eco.bonus.firstWin}`, credits: sub * (eco.bonus.firstWin - 1) });
  if (bonus.streak > 0) lines.push({ label: `Streak +${Math.round(bonus.streak * 100)}%`, credits: Math.round(sub * bonus.streak) });
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

const round2 = (v) => Math.round(v * 100) / 100;
const DAY = 864e5;
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// form (0 .. eco.form.min) rusts a little each day once the grace days after the last career match are over;
// formAt = when form was last set (a match or training), so idle days are never counted twice
export function formNow(profile, eco, now = new Date()) {
  const f = eco.form, form = profile.form || 0;
  if (!profile.lastCareerMatch || !profile.formAt) return form;  // no formAt: a profile from before form, rust starts after its next match
  const from = Math.max(profile.formAt ? +new Date(profile.formAt) : 0, +new Date(profile.lastCareerMatch) + f.graceDays * DAY);
  return round2(Math.max(f.min, form - f.perDay * Math.max(0, Math.floor((now - from) / DAY))));
}
const formUp = (profile, eco, gain, now) => ({ form: round2(Math.min(0, formNow(profile, eco, now) + gain)), formAt: now.toISOString() });

// one career match end (quick match, tournament, online): Credits with the day's first win and the session streak,
// streak = matches started within streakMinutes of the previous one's end (a forfeit breaks it)
export function settleMatch(profile, result, eco, startedAt, now = new Date()) {
  const b = eco.bonus, gap = profile.lastCareerMatch ? (startedAt - new Date(profile.lastCareerMatch)) / 6e4 : Infinity;
  const streak = !result.forfeit && gap <= b.streakMinutes ? (profile.streak || 0) + 1 : 0;
  const today = dayKey(now), firstWin = !!result.won && !result.forfeit && profile.lastWinDay !== today;
  const reward = matchReward(result, eco, { firstWin, streak: Math.min(b.streakMax, round2(streak * b.streakStep)) });
  const grown = result.forfeit || !result.tally ? { profile, ups: [] } : growStats(profile, xpFromTally(result.tally, eco), eco);
  return {
    reward, ups: grown.ups,  // ups = [[stat, from, to]] raised by match play
    profile: { ...applyReward(grown.profile, reward, result), bag: settleBag(profile.bag, result.bag), streak, lastWinDay: firstWin ? today : (profile.lastWinDay ?? null), ...formUp(profile, eco, result.forfeit ? 0 : eco.form.match, now) },  // a forfeit pins the rust, no gain
  };
}

// result.bag = what is left of the bag after the match (counted from the match's consume events)
const settleBag = (bag, left) => (isObj(left) ? { ...bag, ...Object.fromEntries(Object.entries(left).filter(([k]) => k in bag).map(([k, n]) => [k, Number.isFinite(+n) ? Math.max(0, Math.floor(+n)) : 0])) } : bag);

// ranking points from tournaments are logged with their date and drop out after eco.pointsDays (FIP's 52 weeks, shortened);
// a profile from before the log starts it today with its whole total
const pointsLog = (p, now) => Array.isArray(p.pointsLog) ? p.pointsLog : (p.rankingPoints > 0 ? [{ at: now.toISOString(), pts: p.rankingPoints }] : []);
export const addPoints = (p, pts, now = new Date()) =>
  ({ ...p, rankingPoints: p.rankingPoints + pts, pointsLog: [...pointsLog(p, now), { at: now.toISOString(), pts }] });

export function expirePoints(p, eco, now = new Date()) {
  const log = pointsLog(p, now), live = log.filter(e => now - new Date(e.at) < eco.pointsDays * DAY);
  if (log === p.pointsLog && live.length === log.length) return p;
  return { ...p, rankingPoints: Math.max(0, p.rankingPoints - log.reduce((n, e) => n + e.pts, 0) + live.reduce((n, e) => n + e.pts, 0)), pointsLog: live };
}

export const expiringSoon = (p, eco, now = new Date(), days = 7) =>
  pointsLog(p, now).filter(e => { const left = +new Date(e.at) + eco.pointsDays * DAY - now; return left > 0 && left <= days * DAY; }).reduce((n, e) => n + e.pts, 0);

// stats grow to the best tier's cap (spec §9, §12.2); a stat already above it (migrated) is kept, never lowered
export const statCap = (profile) => TIERS[(profile.bestTier || 1) - 1].cap;
const STAT_NAME = { speed: 'Speed', power: 'Power', control: 'Control', volley: 'Volley', smash: 'Smash', stamina: 'Stamina' };

// match XP: a stat goes up when its XP reaches eco.xp.per × the stat; nothing is gained at the cap
// (the cap is the one before this match's tier-up: the new tier lifts it from the next match on)
function growStats(profile, gain, eco) {
  const cap = statCap(profile), stats = { ...profile.stats }, xp = { ...profile.xp }, ups = [];
  for (const k of STATS) {
    if (stats[k] >= cap || !gain[k]) continue;
    const from = stats[k];
    xp[k] = (xp[k] || 0) + gain[k];
    while (stats[k] < cap && xp[k] >= eco.xp.per * stats[k]) { xp[k] -= eco.xp.per * stats[k]; stats[k]++; }
    if (stats[k] > from) ups.push([k, from, stats[k]]);
  }
  return { profile: { ...profile, stats, xp }, ups };
}

// one line after a match on the worst measured area + what to do: { text, msg, action: { train: stat } | { restock: true } | null }
// msg = the same line as [template, vars] pieces (lead — rest[ alt]) for the UI's t(); `stat` / `tier` vars are names to translate too
const fill = ([s, v = {}]) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);
const tip = (lead, rest, alt, action) => ({ text: `${fill(lead)} — ${fill(rest)}${alt ? ' ' + fill(alt) : ''}`, msg: { lead, rest, alt }, action });
export function coachTip(t, profile, eco) {
  const cap = statCap(profile), next = TIERS.find(x => x.cap > cap);
  const train = (k, lead, alt = null) => profile.stats[k] >= cap
    ? tip(lead, next ? ['reach {tier} to train beyond {cap}', { tier: next.name, cap }] : ['keep playing'], null, null)
    : tip(lead, ['Train {stat} ({cost} Credits)', { stat: STAT_NAME[k], cost: trainCost(profile.stats[k], eco) }], alt, { train: k });
  const food = (profile.bag?.bag_banana || 0) + (profile.bag?.bag_gel || 0);
  if (t.drySec >= 30) return tip(['You were dehydrated for {s} s', { s: Math.round(t.drySec) }], ['keep water in your bag'], null, { restock: true });
  const tired = ['You were exhausted for {s} s', { s: Math.round(t.tiredSec) }];
  if (t.tiredSec >= 30) return food ? train('stamina', tired, ['or eat at changeovers'])
    : tip(tired, ['keep food in your bag and eat at changeovers'], null, { restock: true });
  const [vm, vx] = t.volley, [sm, sx] = t.smash;
  if (vm + vx >= 5 && vx / (vm + vx) >= 0.4) return train('volley', ['Your volleys missed {x} of {n}', { x: vx, n: vm + vx }], ['or play at the net more']);
  if (sm + sx >= 4 && sx / (sm + sx) >= 0.4) return train('smash', ['Your smashes missed {x} of {n}', { x: sx, n: sm + sx }], ['or let more lobs bounce off the glass']);
  const weak = STATS.reduce((a, k) => (profile.stats[k] < profile.stats[a] ? k : a));
  return train(weak, ['Your weakest skill is {stat} ({v})', { stat: STAT_NAME[weak], v: profile.stats[weak] }]);
}

// Credits to raise a stat from `level` to level + 1
export const trainCost = (level, eco) => Math.round(eco.training.base * eco.training.growth ** (level - eco.training.start));

export function buyTraining(profile, stat, eco, now = new Date()) {
  if (!STATS.includes(stat)) return { ok: false, reason: 'stat' };
  const level = profile.stats[stat];
  if (level >= eco.training.max) return { ok: false, reason: 'max' };
  if (level >= statCap(profile)) return { ok: false, reason: 'cap' };
  const cost = trainCost(level, eco);
  if (profile.credits < cost) return { ok: false, reason: 'credits' };
  return { ok: true, profile: { ...profile, credits: profile.credits - cost, stats: { ...profile.stats, [stat]: level + 1 }, ...formUp(profile, eco, eco.form.training, now) } };
}

// shop: { tiers: {name: lowest level-tier index}, items }. Items unlock by the best tier reached (level.js TIERS);
// rackets come from data/rackets.json with the same fields

// bag items (type 'bag') stack up to the bag's limit: a pack that does not fit is filled up and charged in proportion;
// the Pro bag (upgrade) is owned like gear
export function buyItem(profile, item, shop) {
  const consumable = item.type === 'bag' && !item.upgrade;
  if (!consumable && profile.inventory.includes(item.id)) return { ok: false, reason: 'owned' };
  if ((profile.bestTier || 1) < shop.tiers[item.tier]) return { ok: false, reason: 'tier' };
  const n = consumable ? Math.min(item.pack, bagRoom(profile, item)) : 1;
  if (!n) return { ok: false, reason: 'bagfull' };
  const price = consumable ? Math.ceil(item.price * n / item.pack) : item.price;
  if (profile.credits < price) return { ok: false, reason: 'credits' };
  const credits = profile.credits - price;
  if (!consumable) return { ok: true, profile: { ...profile, credits, inventory: [...profile.inventory, item.id] } };
  return { ok: true, profile: { ...profile, credits, bag: { ...profile.bag, [item.id]: (profile.bag?.[item.id] || 0) + n } } };
}

export const equip = (profile, slot, id) => profile.inventory.includes(id) ? { ...profile, equipped: { ...profile.equipped, [slot]: id } } : profile;

// circuit entry (data/tournaments.json): champion gets championPoints and 10x that in Credits; lower places get a share
const SHARE = [[1, 1], [2, 0.6], [4, 0.36], [8, 0.18]];
export function tournamentReward(entry, placement) {
  const share = (SHARE.find(([last]) => placement <= last) || [0, 0.09])[1];
  return { rankingPoints: Math.round(entry.championPoints * share), credits: Math.round(entry.championPoints * 10 * share) };
}

// rank = the player's current world rank (1 = top)
export function canEnter(profile, entry, rank) {
  if ((profile.bestTier || 1) < (entry.minTier || 1)) return { ok: false, reason: 'tier' };
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

export const worldRanking = (profile, aiTable) => {
  const tid = profile?.player?.templateId;
  const pname = profile?.player?.name;
  const filtered = (aiTable || []).filter(r => r.id !== 'me' && (!tid || r.id !== tid) && (!pname || r.name !== pname));
  return [...filtered, { id: 'me', name: profile.player.name, points: profile.rankingPoints }].sort((a, b) => b.points - a.points);
};
