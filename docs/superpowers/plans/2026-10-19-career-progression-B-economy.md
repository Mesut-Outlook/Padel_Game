# Career Progression B — Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** "One more match" rewards (first win of the day, streak, tier-up Credits), prices that put the next good item 6–20 matches away, form that rusts when idle, ranking points that expire after 90 days.

**Architecture:** Pure rules in `src/career.js` (numbers in `data/economy.json`); `careerui.js` swaps its `matchReward` + `applyReward` pair for one `settleMatch` call at the three match ends; form reaches `game.js` as `opts.form`.

**Spec:** `docs/superpowers/specs/2026-10-19-career-progression-design.md` §6, §7, §12.6

## Global Constraints
- Every number lives in `data/economy.json` (tier-up Credits too).
- `game.js` stays DOM-free; form applies to offline career matches only (§12.6).
- Missing new fields on existing v2 profiles = defaults (no VERSION bump): `form` 0, `streak` 0, `lastWinDay` null, `pointsLog` back-filled with today.
- Nothing the player owns is lost: level, tier, stats, items, Credits never decay (§7.3).

## Review Focus
- A v2 profile saved before B (no `pointsLog`, `form`) loads, plays, and its points do not vanish at once.
- Forfeit: no bonus, streak resets.
- Training while rusty must not double-count idle days.
- Streak uses the match *start* time against the previous match end.
- Tier-up pays once per new best tier.

---

### Task 1: Rules in `career.js` (+ `economy.json`)
- `economy.json`: `bonus: { firstWin: 2, streakStep: 0.1, streakMax: 0.5, streakMinutes: 20 }`, `form: { graceDays: 7, perDay: 0.01, min: -0.1, match: 0.03, training: 0.02 }`, `pointsDays: 90`, `tierUp: 150`.
- `matchReward(result, eco, bonus = {})`: bonus `{ firstWin, streak }` adds lines "First win of the day ×2" (credits = subtotal) and "Streak +N%" (credits = round(subtotal × streak)) before the AI multiplier.
- `settleMatch(profile, result, eco, startedAt, now)` → `{ reward, profile }`: streak +1 when `startedAt − lastCareerMatch ≤ streakMinutes` (forfeit → 0); first win when `won && lastWinDay !== local day`; form +0.03 (cap 0).
- `formNow(profile, eco, now)`: decay 0.01/day from `max(formAt, lastCareerMatch + 7 d)`, floor −0.10.
- `buyTraining(profile, stat, eco, now)`: form +0.02.
- `applyRating(…, now, tierUpCredits)`: on tier-up adds `tierUpCredits × tier.index` Credits, returns `bonus`.
- `addPoints(profile, pts, now)`, `expirePoints(profile, eco, now)` (back-fills a missing log with today), `expiringSoon(profile, eco, now, days = 7)`; `loadProfile(storage, now)` expires and saves when changed.
- Tests: one per rule above in `test/career.test.js`.

### Task 2: Game + screens
- `game.js`: `pl.form` from `opts.form[id]`; speed × (1 + form/2), error × (1 − form). Test in `test/game.test.js`.
- `main.js` `startMatch`: pass `cfg.form`.
- `careerui.js`: three match ends call `settleMatch` with the launch time; `withRating` passes `eco.tierUp` and shows "Tier up bonus +N"; `settleTournament` uses `addPoints`; offline career + tournament matches pass `form: { 0: formNow }`; left panel shows "Form: Sharp" / "Rusty (−6%)"; hub banners "Play a match to shake off the rust" and "Points expiring in 7 days: N".

### Task 3: Prices (`data/rackets.json`, `data/shop.json`)
Per §6.3 table: rackets r02 450, r03 850, r04 900, r05 1150, r06 1450, r07 1250, r08 1650, r09 2000, r10 2100, r11 2400, r12 2800; shoes grip 350, herringbone 700, flash 850, tour 1000, elite 1200; balls pro 600, pro_s 950; kits regional 700/800, national 900/1000, elite 1300/1500. Fuel prices wait for part C (bag).
