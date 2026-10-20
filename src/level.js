// Career level (Playtomic-style 0.50-7.00 + reliability), tiers and AI levels. Pure: no DOM, shared with tests.
// Design: docs/superpowers/specs/2026-10-19-career-progression-design.md §4-§5, §12.

import { N_ } from './i18n.js';

// index, id, name, lowest level, shop tier (data/shop.json item.tier), base-stat cap, recommended AI difficulty
export const TIERS = [
  ['rookie', N_('Rookie'), 0.5, 'amateur', 6, 'rookie'], ['beginner', N_('Beginner'), 1, 'amateur', 6, 'rookie'],
  ['club', N_('Club'), 1.5, 'club', 7, 'club'], ['intermediate', N_('Intermediate'), 2.5, 'regional', 7, 'club'],
  ['advanced', N_('Advanced'), 3.5, 'national', 8, 'pro'], ['competition', N_('Competition'), 4.5, 'pro', 9, 'pro'],
  ['master', N_('Master'), 5.5, 'elite', 10, 'legend'], ['legend', N_('Legend'), 6.5, 'elite', 10, 'legend'],
].map(([id, name, min, shop, cap, ai], i) => ({ index: i + 1, id, name, min, shop, cap, ai }));

export const tierAt = (level) => TIERS.findLast(t => level >= t.min) || TIERS[0];

export const AI_LEVEL = { rookie: 1.0, club: 2.5, pro: 4.0, legend: 5.8 };
export const AI_AVG = { rookie: 5, club: 6, pro: 7, legend: 8 };  // career opponents' stat average per difficulty

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round2 = (v) => Math.round(v * 100) / 100;
const mean = (s) => { const v = Object.values(s); return v.reduce((a, b) => a + b, 0) / v.length; };

// shift every stat by the same amount so the average hits the difficulty's target (shape kept, integers 1-10);
// rounding hands the leftover points to the stats with the largest fractions so the total stays exact
export function scaleStats(stats, ai) {
  const keys = Object.keys(stats), off = (AI_AVG[ai] ?? 6) - mean(stats);
  const raw = keys.map(k => stats[k] + off), out = raw.map(Math.floor);
  let need = Math.round((AI_AVG[ai] ?? 6) * keys.length) - out.reduce((a, b) => a + b, 0);
  for (const i of raw.map((v, i) => i).sort((a, b) => (raw[b] % 1) - (raw[a] % 1))) if (need-- > 0) out[i]++;
  return Object.fromEntries(keys.map((k, i) => [k, clamp(out[i], 1, 10)]));
}

export const aiLevel = (stats, ai) => (AI_LEVEL[ai] ?? 2.5) + (mean(stats) - (AI_AVG[ai] ?? 6)) * 0.25;

// my side's share of the games (rally scoring: points); unknown score: 0.6 for a win, 0.4 for a loss
export function matchShare(r) {
  for (const [a, b] of [r.games, r.points].filter(Boolean)) if (a + b > 0) return a / (a + b);
  return r.won ? 0.6 : 0.4;
}

// Elo-style update on pair averages; low reliability = big steps (spec §4.2)
export function rateMatch({ level, reliability }, myPair, oppPair, won, share) {
  const E = 1 / (1 + 10 ** ((oppPair - myPair) / 1.5));
  const S = 0.75 * (won ? 1 : 0) + 0.25 * share;
  const delta = 0.25 * (1 - 0.75 * reliability) * (S - E);
  return { level: round2(clamp(level + delta, 0.5, 7)), reliability: Math.min(1, reliability + 0.05), delta };
}

// 5 answers scored 0-3 (time played, back glass, bandeja/víbora, holding the net, tournaments)
export const questionnaireLevel = (answers) => round2(clamp(0.5 + answers.reduce((a, b) => a + b, 0) * 3.5 / 15, 0.5, 4));

// the level typed from the Playtomic app ("4,25" or "4.25"); a high one starts at 4.50 at most
export function playtomicStart(input) {
  const s = String(input ?? '').trim().replace(',', '.'), x = Number(s);
  if (!s || !Number.isFinite(x)) return null;
  return { level: round2(clamp(Math.min(x, 4.5), 0.5, 7)), reliability: 0.3 };
}

export const startCredits = (level) => (level >= 2.5 ? 250 * (tierAt(level).index - 1) : 0);

// level never decays; after 14 idle days the reliability slips 0.01 a day down to 0.30
export const idleReliability = (rel, idleDays) =>
  idleDays <= 14 || rel <= 0.3 ? rel : Math.max(0.3, Math.round((rel - 0.01 * (idleDays - 14)) * 1000) / 1000);
