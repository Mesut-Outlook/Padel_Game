# Career Progression A — Player Level & Tiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Playtomic-style 0.50–7.00 player level with reliability, eight tiers (Rookie → Legend) that gate the shop and tournaments, tier-scaled AI opponents, and a v1 → v2 profile migration.

**Architecture:** All rules live in a new pure module `src/level.js` (no DOM; tested in Node) and in `src/career.js` (profile shape, migration, shop/tournament gating). `src/careerui.js` only calls them: it scales AI stats before a career match, rates the match in `onEnd`, and shows level/tier. Parts B (economy), C (bag + hydration) and D (stat growth) get their own plans after this one ships.

**Tech Stack:** plain ES modules, `node:test`, Vite; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-19-career-progression-design.md` (§4, §5, §9 start/caps, §10, §12.1–12.5)

## Global Constraints

- Level range 0.50–7.00, shown with two decimals; reliability 0–1, shown as a whole %.
- Formula (spec §4.2): `E = 1 / (1 + 10^((oppPair − myPair) / 1.5))`, `S = 0.75·won + 0.25·share`, `K = 0.25·(1 − 0.75·reliability)`, `Δ = K·(S − E)`, reliability `+0.05` per match (cap 1).
- Only career matches (quick match, tournament, online from career) rate; Friendly/tutorial never.
- Tiers (index, id, name, min level, shop tier, stat cap, recommended AI): 1 rookie Rookie 0.50 amateur 6 rookie · 2 beginner Beginner 1.00 amateur 6 rookie · 3 club Club 1.50 club 7 club · 4 intermediate Intermediate 2.50 regional 7 club · 5 advanced Advanced 3.50 national 8 pro · 6 competition Competition 4.50 pro 9 pro · 7 master Master 5.50 elite 10 legend · 8 legend Legend 6.50 elite 10 legend.
- AI base levels rookie 1.0, club 2.5, pro 4.0, legend 5.8; career AI stat averages rookie 5, club 6, pro 7, legend 8; AI level = base + (scaled avg − target avg) × 0.25.
- Start: questionnaire 0.5–4.0; Playtomic entry → `min(x, 4.50)`, reliability 0.30; skip → 1.50, reliability 0.20. New careers: all stats 5, `training.start` 5. Start Credits `250 × (tier − 1)` when start level ≥ 2.50, else 0.
- Shop: buyable when `profile.bestTier ≥ tier index of the item's shop tier`; owned items never lock. Inactivity: reliability −0.01/day after 14 idle days, floor 0.30; level never decays.
- UI copy is English (the game UI is English); spec texts quoted below are exact.

## Review Focus

- A v1 profile loaded from storage must migrate once, keep every item/credit/stat ≥ its old value, and leave a `padel.career.v1.bak` copy → Task 2 test `migrateProfile keeps everything and backs up`.
- A player whose level drops below a tier they once reached can still buy that tier's items → Task 2 test `bestTier never goes down`.
- Online career result has no `games` today; the share must still be computed (from the board) and never be NaN when 0–0 → Task 1 test `matchShare handles empty and missing scores`.
- Playtomic entry typed as text ("4,25", "", "9") must clamp/parse safely → Task 1 test `playtomicStart parses comma decimals and clamps`.
- Rating against an opponent far above/below must never push the level outside 0.50–7.00 → Task 1 test `rateMatch clamps at both ends`.

---

### Task 1: `src/level.js` — tiers, AI levels, rating

**Files:**
- Create: `src/level.js`
- Test: `test/level.test.js`

**Interfaces:**
- Produces:
  - `TIERS: { index, id, name, min, shop, cap, ai }[]` (8 entries, constants above)
  - `tierAt(level: number) → TIERS entry`
  - `AI_LEVEL`, `AI_AVG` (objects keyed rookie/club/pro/legend)
  - `scaleStats(stats: {speed,power,control,volley,smash,stamina}, ai: string) → same keys, integers 1–10, average ≈ AI_AVG[ai], shape kept (add the same offset to every stat, then clamp/round)`
  - `aiLevel(stats, ai) → number`
  - `matchShare(result) → 0..1` (from `result.games`, else `result.points`, else `won ? 0.6 : 0.4`)
  - `rateMatch({ level, reliability }, myPair, oppPair, won: boolean, share: number) → { level, reliability, delta }` (level rounded to 0.01)
  - `questionnaireLevel(answers: number[]) → number` (5 answers each 0–3 → `0.5 + sum × 3.5 / 15`, rounded 0.01, clamp 0.5–4.0)
  - `playtomicStart(input: string|number) → { level, reliability } | null` (accepts "4,25"/"4.25"; null when not a number)
  - `startCredits(level) → number`
  - `idleReliability(reliability, idleDays) → number`

- [ ] **Step 1: Write the failing tests** in `test/level.test.js`:
  - `tierAt maps the band edges`: `tierAt(0.5).id === 'rookie'`, `tierAt(0.99).id === 'rookie'`, `tierAt(1).id === 'beginner'`, `tierAt(2.49).id === 'club'`, `tierAt(6.5).id === 'legend'`, `tierAt(7).index === 8`.
  - `scaleStats keeps the shape and hits the target average`: `{speed:9,power:8,control:6,volley:7,smash:9,stamina:6}` with `'rookie'` → average 5 (±0.2), speed still ≥ control, all 1–10 integers.
  - `aiLevel`: `aiLevel(scaleStats(s,'club'),'club')` within 0.1 of 2.5; legend within 0.1 of 5.8.
  - `rateMatch example from the spec`: `rateMatch({level:2.5,reliability:0.2},2.5,2.5,true,6/9)` → `delta ≈ 0.0885` (±0.002), `level 2.59`, `reliability 0.25`; the same loss with share 3/9 → `delta ≈ −0.0885`.
  - `rateMatch clamps at both ends`: `rateMatch({level:6.99,reliability:0},1,7,true,1).level === 7`; `rateMatch({level:0.52,reliability:0},7,0.5,false,0).level === 0.5`.
  - `matchShare handles empty and missing scores`: `{games:[6,3]}` → 0.667 (±0.01); `{points:[16,10]}` → 0.615 (±0.01); `{games:[0,0],won:true}` → 0.6; `{won:false}` → 0.4.
  - `questionnaire`: all 0 → 0.5; all 3 → 4.0.
  - `playtomicStart parses comma decimals and clamps`: `'4,25'` → `{level:4.25,reliability:0.3}`; `'6.8'` → level 4.5; `'0.1'` → 0.5; `''` and `'abc'` → null.
  - `startCredits`: 1.5 → 0; 2.5 → 750; 4.5 → 1250.
  - `idleReliability`: (0.8, 10) → 0.8; (0.8, 24) → 0.7; (0.5, 400) → 0.3.

- [ ] **Step 2: Run `node --test test/level.test.js`** — Expected: FAIL (module not found).
- [ ] **Step 3: Implement `src/level.js`** with the exports above (one-line header comment, terse style like `src/pointcall.js`).
- [ ] **Step 4: Run `node --test test/level.test.js`** — Expected: all pass.
- [ ] **Step 5: Commit** `feat(level): Playtomic-style level, tiers, AI levels (pure + tests)`.

### Task 2: Profile v2, migration, shop and tournament gating

**Files:**
- Modify: `src/career.js` (VERSION, `newProfile`, `loadProfile`, `buyItem`, `canEnter`; remove `tierOf`)
- Modify: `data/shop.json` (`tiers` become minimum tier indexes: `{"amateur":1,"club":3,"regional":4,"national":5,"pro":6,"elite":7}`)
- Modify: `data/tournaments.json` (each `circuit` entry gets `minTier`: club_americano 1, club_league 2, fip_bronze 3, fip_silver 4, fip_gold 5, fip_platinum 5, p2 6, p1 7, major 7, premier_finals 7)
- Modify: `data/economy.json` (`training.start` 5)
- Test: `test/career.test.js`, `test/shop.test.js`

**Interfaces:**
- Consumes: Task 1 `tierAt`, `rateMatch`, `idleReliability`.
- Produces:
  - profile v2 fields: `level`, `reliability`, `bestTier` (index), `lastCareerMatch` (ISO date string | null); stats start at 5.
  - `newProfile(template, look, start = { level: 1.5, reliability: 0.2 })` (also sets `bestTier` and `credits = startCredits(level)`)
  - `migrateProfile(v1) → v2` (level from old ranking tier: rankingPoints <10 → 1.0, <60 → 2.0, <200 → 3.0, <600 → 4.0, <1500 → 5.0, else 6.0; reliability 0.5; stats below 5 raised to 5; `bestTier = tierAt(level).index`)
  - `loadProfile(storage)` migrates a valid v1 profile, writes the raw v1 JSON to `PROFILE_KEY + '.bak'` (try/catch), returns `{ profile, status: 'ok' }`.
  - `applyRating(profile, myPair, oppPair, result, now = new Date()) → { profile, delta, tierUp: TIERS entry | null }` (idle reliability first, then `rateMatch` with `matchShare(result)`; `bestTier = max`; `lastCareerMatch = now ISO`).
  - `buyItem` reason `'tier'` when `(profile.bestTier || 1) < shop.tiers[item.tier]`.
  - `canEnter` reason `'tier'` (checked first) when `(profile.bestTier || 1) < (entry.minTier || 1)`.

- [ ] **Step 1: Write the failing tests:**
  - career.test.js `newProfile v2 starts average`: every stat 5, `level 1.5`, `reliability 0.2`, `bestTier 3`, `credits 0`; with start `{level:2.5,reliability:0.3}` → credits 750, bestTier 4.
  - `migrateProfile keeps everything and backs up`: a v1 object (`version:1`, stats all 4 but power 7, rankingPoints 70, credits 1733, inventory with 'r04') through a mock storage `loadProfile` → version 2, level 3.0, power 7, other stats 5, credits 1733, inventory unchanged, storage has `padel.career.v1.bak` equal to the raw v1 JSON.
  - `applyRating updates level, bestTier and date`: from a fresh profile, a 6-3 win vs 2.5 → level > 1.5, `lastCareerMatch` set; driving the level to 2.6 returns `tierUp.id === 'intermediate'`.
  - `bestTier never goes down`: after a tier-up, a loss that drops the level below 2.5 keeps `bestTier 4`.
  - Replace the `tierOf` test in shop.test.js with `shop gating follows bestTier`: bestTier 3 can buy a `club` item, not a `regional` one (`reason 'tier'`); update the existing `buyItem rejects…` test to use `bestTier` instead of `rankingPoints: 10`.
  - Extend `canEnter` test: `{...p, bestTier:4, rankingPoints:999, credits:9999}` with `p1` → `{ ok:false, reason:'tier' }`.
  - Update `training cost` test to `[5, 6, 9].map(l => trainCost(l, eco)) → [50, 80, 328]`.
- [ ] **Step 2: Run `npm test`** — Expected: the new/changed tests fail.
- [ ] **Step 3: Implement** in `src/career.js` and the three data files as listed.
- [ ] **Step 4: Run `npm test`** — Expected: all pass (fix any other test that relied on `tierOf` or stat 4).
- [ ] **Step 5: Commit** `feat(career): profile v2 with level, migration, tier-gated shop and tournaments`.

### Task 3: Rate every career match, tier-scaled AI

**Files:**
- Modify: `src/careerui.js` (`launchCareerMatch`, `launchTournamentMatch`, `joinOnlineRoom`, reward screen)
- Modify: `src/main.js:612` (online `done()` also passes `games` for my team first, from `net.score.board.sets`)
- Modify: `server/server.js` `sanitizeLook` (keep `level` when a number, clamped 0.5–7)
- Test: `test/server.test.js` (look level clamp)

**Interfaces:**
- Consumes: Task 1 `scaleStats`, `aiLevel`; Task 2 `applyRating`.
- Produces: `profile.lastReward.level = { from, to, delta, tierUp: name | null }` for the reward screen.

- [ ] **Step 1: Write the failing test** in server.test.js `join: look level is clamped to 0.5–7`: join with `look: { level: 12 }` → lobby look level 7; `look: { level: 'x' }` → no level.
- [ ] **Step 2: Run `npm test`** — Expected: that test fails.
- [ ] **Step 3: Implement:**
  - In the three launches, AI partners and opponents get `{ ...char, stats: scaleStats(char.stats, aiId) }` (tournaments use `entry.ai`, online none).
  - In each `onEnd`: `myPair` = average of my level and (doubles) the partner's `aiLevel`; `oppPair` = average of opponents' `aiLevel` (online: their `look.level` from the lobby, else 2.5); then `applyRating(...)`; persist; store `lastReward.level`.
  - Career `look` sent online includes `level: profile.level`.
  - `sanitizeLook`: `if (typeof l.level === 'number') out.level = clamp(l.level, 0.5, 7)`.
  - Reward screen: a line `Level 2.47 → 2.56 (+0.09)` and, on `tierUp`, a highlighted `TIER UP: Intermediate`.
- [ ] **Step 4: Run `npm test` and `npx vite build`** — Expected: pass. In the browser (dev server, a copy of the user's profile backed up and restored as in earlier sessions), finish a quick career match with `?quick` and see the level line on the reward screen.
- [ ] **Step 5: Commit** `feat(career): every career match rates the level; AI opponents scaled to their difficulty`.

### Task 4: Level start step and level/tier display (UI — delegate to Sonnet or agy, Opus reviews)

**Files:**
- Modify: `src/careerui.js` (new screen `levelstart` after the creator for new careers; top bar, hub, left panel, profile; shop pill text; tournament requirement text; Play screen "Recommended" AI)
- Modify: `index.html` (styles for the new screen, reuse `.pl-card`/`.cr-*` classes)

**Interfaces:**
- Consumes: Task 1 `TIERS`, `tierAt`, `questionnaireLevel`, `playtomicStart`; Task 2 `newProfile(template, look, start)`.

- [ ] **Step 1: Level start screen** (`What's your padel level?`) with three choices: **Answer 5 quick questions** (each 4 answers scored 0–3: how long you've played; using the back glass; bandeja/víbora; holding the net; tournaments) · **I have a Playtomic level** (number input + the exact note "We can't read your Playtomic account; type the level shown in the app.") · **Skip — start at 1.50**. Result shown as "Level 2.73 · Intermediate" with Continue → `newProfile(template, look, start)`.
- [ ] **Step 2: Display:** top bar `Level 2.73 · Intermediate · 45%` replaces the ranking-tier pill (keep Credits and Ranking pts); left panel and profile show the same plus "Padel Legends level — Playtomic-style, not synced"; shop locked pill `Unlocks at Advanced`; tournament card shows `Requires Master` when tier-locked; Play screen marks `tierAt(level).ai` as **Recommended**.
- [ ] **Step 3: Verify** `npm test`, `npx vite build`, and in the browser: new career → level start → each of the three paths → hub shows the level; shop shows a tier-locked item; a tier-locked tournament; restore the user's real profile afterwards.
- [ ] **Step 4: Commit** `feat(career-ui): level start step, level and tier everywhere`.

### Task 5: Docs and release

- [ ] **Step 1:** README roadmap: add `[x] Kariyer seviyesi ve kademeler (A)` with one line; CLAUDE.md feature status: `level.js`, profile v2, `bestTier`.
- [ ] **Step 2:** `npm test`, `npx vite build`; ask the user before pushing (push needs their OK).
