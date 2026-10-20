// Friendly match selections persistence (padel.friendly.v1).
// Pure module: no DOM or Three.js imports.

export const STORAGE_KEY = 'padel.friendly.v1';

const VALID_SETS = ['1', '3', '3s', 'r16'];
const VALID_GOLDEN = ['1', '0', 'star'];
const VALID_AI = ['rookie', 'club', 'pro', 'legend'];
const VALID_PLAYERS = [2, 4];
const VALID_HUMANS = [0, 1, 2, 3, 4];

/**
 * Loads and validates saved friendly match selections from storage.
 * Drops invalid or out-of-range values. Returns an empty object on corrupt JSON or storage errors.
 *
 * @param {Storage|{ getItem: (k: string) => string|null }} [storage]
 * @param {{ charCount?: number, venueCount?: number, racketCount?: number }} [limits]
 * @returns {{ char?: number, venue?: number, racket?: number, sets?: string, golden?: string, ai?: string, humans?: number, players?: number }}
 */
export function loadPicks(storage, limits = {}) {
  if (!storage || typeof storage.getItem !== 'function') return {};

  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return {};
  }
  if (!raw || typeof raw !== 'string') return {};

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};

  const picks = {};

  // Character index validation
  if (data.char != null) {
    const c = Number(data.char);
    if (Number.isInteger(c) && c >= 0) {
      const max = limits.charCount ?? limits.characters?.length;
      if (max == null || c < max) picks.char = c;
    }
  }

  // Venue index validation
  if (data.venue != null) {
    const v = Number(data.venue);
    if (Number.isInteger(v) && v >= 0) {
      const max = limits.venueCount ?? limits.venues?.length;
      if (max == null || v < max) picks.venue = v;
    }
  }

  // Racket index validation
  if (data.racket != null) {
    const r = Number(data.racket);
    if (Number.isInteger(r) && r >= 0) {
      const max = limits.racketCount ?? limits.rackets?.length;
      if (max == null || r < max) picks.racket = r;
    }
  }

  // Sets validation
  if (data.sets != null && VALID_SETS.includes(String(data.sets))) {
    picks.sets = String(data.sets);
  }

  // Golden / deuce validation
  if (data.golden != null && (VALID_GOLDEN.includes(String(data.golden)) || data.golden === 1 || data.golden === 0)) {
    picks.golden = String(data.golden);
  }

  // AI level validation
  if (data.ai != null && VALID_AI.includes(String(data.ai))) {
    picks.ai = String(data.ai);
  }

  // Players / mode validation (accepts both players and mode, normalized to integer 2 or 4)
  const pVal = data.players != null ? Number(data.players) : (data.mode != null ? Number(data.mode) : null);
  if (pVal != null && VALID_PLAYERS.includes(pVal)) {
    picks.players = pVal;
  }

  // Humans validation (0..4, clamped to 2 if players === 2)
  if (data.humans != null) {
    const h = Number(data.humans);
    if (Number.isInteger(h) && VALID_HUMANS.includes(h)) {
      picks.humans = picks.players === 2 ? Math.min(h, 2) : h;
    }
  }

  return picks;
}

/**
 * Saves friendly match selections to storage. Silently catches errors.
 *
 * @param {Record<string, unknown>} picks
 * @param {Storage|{ setItem: (k: string, v: string) => void }} [storage]
 */
export function savePicks(picks, storage) {
  if (!storage || typeof storage.setItem !== 'function' || !picks || typeof picks !== 'object') return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(picks));
  } catch {
    // silently ignore errors (quota exceeded, private browsing, blocked)
  }
}
