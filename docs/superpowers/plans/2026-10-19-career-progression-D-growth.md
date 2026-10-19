# Career Progression D — Stat Growth, Tier Cap, Coach Tip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Career stats grow slowly from match play (XP) and fast from training, both stopped by the best tier's stat cap. After each match a one-line coach tip names the worst area, with a Train or Restock button.

**Architecture:**
- `src/matchstats.js` (pure) tallies the career player's match from world events and per-frame state. It runs offline and online.
- `career.js` turns the tally into XP (`settleMatch`) and into a coach tip (`coachTip`), and caps training (`statCap`).
- `main.js` feeds the tally.
- `careerui.js` shows stat-ups, the tip and the cap.

**Spec:** `docs/superpowers/specs/2026-10-19-career-progression-design.md` §9, §12.2. The Friendly character card is `agy-20`.

## Global Constraints
- **Cap:** the cap is `TIERS[bestTier].cap` and applies to base stats only. A stat already above the cap is kept (ruling from part A).
- **XP:** a stat levels up at XP ≥ `eco.xp.per × stat`. The XP weights live in `eco.xp`, tuned with AI play so a typical stat gains ~12–20 XP per one-set match.
- **Forfeit:** gives no XP.
- **Hit events:** they gain `volley` (no bounce since the opponent's hit).

## Review Focus
- A player at the cap gets no XP for that stat, and training says which tier lifts it.
- Online matches tally too: events plus snapshot rows.
- A Restart mid-match must not double-count: the tally resets with the match.
- A migrated profile above the cap is never lowered.

---

### Task 1: `matchstats.js` + `game.js` volley flag
- `newTally()`, `tallyEvents(t, events, me)`, `tallyFrame(t, { p, energy, hyd }, dt)`.
- What it counts:
  - volley / smash made and missed (a point lost on my error moves my last shot to missed)
  - hard clean drives
  - clean rallies of 4+ shots
  - long rallies of 8+ shots
  - distance run
  - seconds tired (energy < 0.25) and seconds dry (hyd < 0.3)
- `xpFromTally(t, eco)`.
- Tests, plus a sim to calibrate `eco.xp`.

### Task 2: `career.js`
- `statCap(profile)`.
- `buyTraining` returns `'cap'`.
- `settleMatch` applies `result.tally` XP and returns `ups`.
- `coachTip(tally, profile, eco)` → `{ text, action: { train: stat } | { restock: true } | null }`.
  - Order: dry ≥ 30 s, tired ≥ 30 s, volley misses, smash misses, weakest stat.
- Tests.

### Task 3: screens
- `main.js`: the tally lives with the match and goes into `result.tally` (forfeit too).
- `careerui.js`:
  - Reward screen: "📈 Volley 6 → 7" lines and the coach tip with its button.
  - Training screen: `level/cap`, and at the cap "Reach <tier> to train beyond N".
