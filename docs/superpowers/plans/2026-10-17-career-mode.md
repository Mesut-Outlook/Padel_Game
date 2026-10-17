# Career Mode (Faz 3a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Browser-saved career: create your player, earn Credits/Ranking points in AI and online matches, spend them on training and equipment that really change play, climb a tournament ladder (Americano, Mexicano, Knockout, League) to Premier Finals.

**Architecture:** All rules and numbers live in DOM-free modules (`src/career.js`, `src/tournament.js`, additions to `rules.js` / `game.js` / `physics.js`) with `node:test` coverage; balance numbers live in `data/economy.json` and `data/shop.json`. UI is plain DOM screens in `src/careerui.js`, launched from the existing menu; matches run through one `startMatch(cfg)` entry in `main.js` that reports a result object at the end.

**Tech Stack:** Plain ES modules, Three.js (existing avatar/preview only), `node:test`, Node `ws` server.

**Spec:** `docs/superpowers/specs/2026-10-17-career-mode-design.md`

## Global Constraints

- `src/game.js`, `physics.js`, `rules.js`, `ai.js`, `career.js` (core), `tournament.js`: no DOM, no three imports (shared with `server/server.js` / tests).
- One test per rule/physics change; `npm test` green and `npx vite build` clean after every task.
- UI copy in English. "Credits" = spendable, "Ranking points" = not spendable.
- Profile key `padel.career.v1` in `localStorage`; every read/write wrapped in try/catch; page must work when storage throws.
- Storage notice text (exact): "Your progress is saved in this browser only. Clearing browser data deletes it. Accounts are coming later."
- Intel HD 620: no new 3D scenes; reuse menu preview.
- Free/career separation: only matches started from the Career hub (and online matches) pay out; free-play menu and training pay nothing.
- Look edits are free and never change stats.
- Agents: Opus writes the DOM-free tasks and reviews everything (UI tasks need a screenshot review before commit); agy (`--mode accept-edits`) implements UI tasks from this plan; Haiku may fill `data/shop.json` and the circuit data.

## Review Focus

- Corrupt, empty or older-version profile JSON in storage → career opens with a "profile could not be read — start new or import" choice, never a crash (Task 1 test).
- `localStorage` throwing (private window) → career playable for the session with a "not saved" banner (Task 1 test with a throwing storage stub).
- Buying with too few Credits, buying an owned item, buying above your tier → rejected with a reason, profile unchanged (Task 5 tests).
- Quitting mid-tournament (closing the tab after round 3) → reopening resumes at round 4 with the same table (Task 8 test on serialise/restore).
- Online join from an old client without `look`, or a `look` over 2 KB → server falls back to roster character index, never throws (Task 11 test).

---

## Step 1 — Profile, hub, career quick match, rewards

### Task 1: Career core (`src/career.js`) + `data/economy.json`

**Files:**
- Create: `src/career.js`, `data/economy.json`, `test/career.test.js`

**Interfaces:**
- Produces:
  - `newProfile(template: Character, look: Partial<Character>) -> Profile` — stats all 4, credits 0, rankingPoints 0, inventory `['r01','shoe_starter','kit_starter','ball_standard']`, equipped `{ racket:'r01', shoes:'shoe_starter', kit:'kit_starter', ball:'ball_standard' }`, `history:{played:0,won:0,pointsWon:0}`, `circuit:{}`, `tournament:null`, `version:1`.
  - `loadProfile(storage) -> { profile: Profile|null, status: 'ok'|'none'|'corrupt'|'unavailable' }`
  - `saveProfile(storage, profile) -> boolean` (false when storage throws)
  - `matchReward(result: MatchResult, eco) -> { lines: [{label, credits}], credits: number }`
  - `applyReward(profile, reward, result) -> Profile` (new object; updates credits and history)
  - `exportProfile(profile) -> string`, `importProfile(text) -> Profile` (throws `Error('invalid profile')` on bad input)
  - `MatchResult = { won: boolean, gamesWon: number, pointsWon: number, scoring: 'sets'|'rally', ai: 'rookie'|'club'|'pro'|'legend'|'online' }`
- `data/economy.json` (exact): `{ "match": { "base": 20, "perGameWon": 4, "perPointWon": 1, "winBonus": 40 }, "mult": { "rookie": 0.6, "club": 1, "pro": 1.4, "legend": 1.8, "online": 1.2 }, "training": { "base": 50, "growth": 1.6, "start": 4, "max": 10 } }`

- [ ] **Step 1: Write failing tests** in `test/career.test.js`:
  - `matchReward` for `{won:true, gamesWon:6, scoring:'sets', ai:'club'}` → credits `20 + 24 + 40 = 84`, 3 lines.
  - same but `ai:'pro'` → `Math.round(84 * 1.4) = 118`.
  - rally `{won:false, pointsWon:12, scoring:'rally', ai:'rookie'}` → `Math.round((20 + 12) * 0.6) = 19`.
  - `loadProfile` with storage returning `'{bad'` → status `'corrupt'`; returning `null` → `'none'`; getItem throwing → `'unavailable'`; a v1 profile round-trips through `saveProfile`/`loadProfile`.
  - `importProfile('{"version":99}')` throws; `importProfile(exportProfile(p))` deep-equals `p`.
- [ ] **Step 2:** `npm test` → new tests FAIL (module missing).
- [ ] **Step 3:** Implement `src/career.js` (reads economy via argument, no imports of JSON so the server/tests can pass it in).
- [ ] **Step 4:** `npm test` → all pass.
- [ ] **Step 5:** Commit `feat(career): profile storage, rewards, economy data`.

### Task 2: One match entry point in `main.js`

**Files:**
- Modify: `src/main.js` (the `$('start').onclick` body at ~line 102, match-end handling at ~lines 328 and 471)

**Interfaces:**
- Produces: `export async function startMatch(cfg)` with `cfg = { players: 2|4, humans: number, ai, match: matchOpts, roster: {[id]: Character}, rackets: {[id]: racketStats & {color, shape}}, venue, ball?: BallSpec, shoes?: {[id]: ShoeSpec}, onEnd?: (result: MatchResult & { score }) => void }`. The legacy start button builds this cfg from the form exactly as today.
- At match end, when `cfg.onEnd` is set: call it once with `MatchResult` for team 0 (the local human's team), then Enter/Start navigates to `location.pathname + '#career'` instead of a plain reload.

- [ ] **Step 1:** Refactor; free-play behaviour unchanged.
- [ ] **Step 2:** Verify in browser: free-play doubles and tutorial still start and end as before; `npm test` green.
- [ ] **Step 3:** Commit `refactor(main): startMatch(cfg) with onEnd result`.

### Task 3 (agy, Opus screenshot review): Career hub, character creator, profile screen, reward screen

**Files:**
- Create: `src/careerui.js`
- Modify: `src/menu.js` (a CAREER button on the top bar of the visual menu), `index.html` (styles, matching `.pl-*` look)

**Interfaces:**
- Consumes: Task 1 API, Task 2 `startMatch`, `data/characters.json`, `data/rackets.json`, `data/venues.json`.
- Produces: `openCareer()` (also auto-opens when `location.hash === '#career'`).

Screens:
- **No profile:** pick a template from the 26 characters → creator. Creator edits: name (1–16 chars), country, skin tone, body type + height, face width, hair model (`Hair_SimpleParted`, `Hair_Buzzed`, `Hair_BuzzedFemale`, `Hair_Long` with optional `hairCut`, `Hair_Buns`, ponytail, topknot, `none`), hair colour (colour input + 8 presets), beard (`none|stubble|full|goatee`) + beard colour, glasses + colour, makeup, headwear, hand. Live 3D preview (reuse the menu preview canvas). Storage notice shown under "Create".
- **Corrupt/unavailable status:** banner + "Start new" / "Import".
- **Hub:** profile card (preview, name, Credits, Ranking points, world rank placeholder until Task 9) and cards Play · Tournaments (disabled until Task 10) · Training (until Task 6) · Shop (until Task 6) · Locker (until Task 6) · Ranking (until Task 9) · Profile.
- **Play:** singles/doubles, AI level, venue, partner pick for doubles (Task 5 adds equipment) → `startMatch({... onEnd: save reward })`, scoring 1 set to 6 games with golden point.
- **Reward screen** (after `#career` reload): lines from `matchReward`, total, new Credits balance.
- **Profile:** Edit look (same creator, free), Export (downloads `padel-career.json`), Import (file input → `importProfile`), storage notice, Delete profile (confirm in-page, no `confirm()` dialog).
- Keyboard/mouse/Xbox navigation like the existing menu (D-pad/stick move, A select, B back).

- [ ] **Step 1:** agy implements from this task text (prompt lists allowed commands).
- [ ] **Step 2:** Opus review: screenshots of creator, hub, reward screen; play one career match end-to-end and confirm Credits increase and persist after reload; `npm test`, `npx vite build`.
- [ ] **Step 3:** Commit `feat(career): hub, character creator, profile, rewards`.

## Step 2 — Training, shop, equipment effects

### Task 4: Training + volley/smash/stamina effects

**Files:**
- Modify: `src/career.js`, `src/game.js` (`strike`, ~lines 74–140), `test/career.test.js`, `test/game.test.js`

**Interfaces:**
- Produces: `trainCost(level, eco) -> number` = `Math.round(base * growth ** (level - start))` for raising `level → level+1`; `buyTraining(profile, stat, eco) -> { ok: true, profile } | { ok: false, reason: 'max'|'credits'|'stat' }`.
- `game.js`: `volley` stat scales error for shots struck before the bounce (`rally.bouncesSinceHit === 0`); `smash` stat scales error and flight time for `smash|bandeja|vibora|bajada|rulo`; `stamina` reduces an accuracy penalty that grows with `w.rally` beyond 8 hits. Each factor centred so stat 6 = today's behaviour.

- [ ] **Step 1: Failing tests:** `trainCost(4)=50`, `trainCost(5)=80`, `trainCost(9)=524`; `buyTraining` at 10 → `'max'`, with 10 Credits → `'credits'`, success deducts and increments. Game test: with seeded `Math.random`, 200 volleys by a volley-10 player land closer to target on average than volley-2 (mean |error| smaller); same for smash; stamina-10 at rally 14 has smaller error than stamina-2.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS (existing 38 still pass — stat 6 unchanged). **Step 5:** Commit `feat(career): training and volley/smash/stamina effects`.

### Task 5: Shop, inventory, shoes and ball effects

**Files:**
- Create: `data/shop.json` (Haiku may fill), `test/shop.test.js`
- Modify: `src/career.js`, `data/rackets.json` (add `core`, `face`, `weightG` kept, `price` per tier below), `src/game.js` (player speed/turn), `src/physics.js` (`stepBall` bounce), `test/physics.test.js`

**Interfaces:**
- `data/shop.json`: `{ "tiers": { "amateur": 0, "club": 10, "regional": 60, "national": 200, "pro": 600, "elite": 1500 }, "items": [ { "id", "type": "shoes"|"kit"|"headwear"|"ball", "name", "tier", "price", ...effect } ] }` — shoes `{ speed: 0..0.12, agility: 0..0.3 }`; ball `{ speed: 1|1.06|1.12, bounce: 1|1.04|1.07 }` for `ball_standard`, `ball_pro`, `ball_pro_s`; kit `{ shirt, shorts, shoes }` colours; headwear `{ type: 'headband'|'visor', color }`. Racket price bands: amateur 0–400, club 1200–1800, regional 2500–3500, national ~5000, pro ~8000, elite ~12000.
- `career.js`: `tierOf(rankingPoints, shop) -> tierName`, `buyItem(profile, item, shop) -> { ok, profile } | { ok:false, reason:'owned'|'credits'|'tier' }`, `equip(profile, slot, id) -> Profile` (only owned ids).
- `game.js` `newWorld(opts)`: `opts.shoes?.[id] = {speed, agility}` → `pl.shoes`; run speed × `(1 + speed)`, faster facing turn with agility. `opts.ball = {speed, bounce}` → `w.ballSpec`; `strike` divides flight time by `ballSpec.speed`.
- `physics.js`: `stepBall` multiplies floor/glass restitution by `b.bounce ?? 1`; `game.js` sets `b.bounce` from `ballSpec` whenever it creates the ball.

- [ ] **Step 1: Failing tests:** `buyItem` rejections (`owned`, `credits`, `tier`) leave the profile deep-equal to the input; success deducts price and appends id. `tierOf(59)='club'`, `tierOf(60)='regional'`. Physics: ball dropped from 2.54 m with `bounce 1.07` rebounds higher than with `bounce 1` (both within 1.2–1.7 m). Game: player with shoes `speed 0.12` covers more distance in 1 s than with `0`.
- [ ] **Step 2:** FAIL. **Step 3:** implement + data. **Step 4:** PASS. **Step 5:** Commit `feat(career): shop, inventory, shoes and ball effects`.

### Task 6 (agy, Opus screenshot review): Training, Shop, Locker screens; equipment into matches

**Files:** Modify `src/careerui.js`, `index.html` (styles)

- Training: 6 stat bars with level, next cost, Buy (disabled with reason).
- Shop: tabs Rackets / Shoes / Balls / Kit / Headwear; card shows stats (rackets: power/control/spin/sweet spot bars + core, face, shape, weight text), price, tier lock ("Unlocks at Club — 10 ranking pts"), Owned/Equipped badges; Buy uses `buyItem` and shows the reason on failure.
- Locker: equip racket/shoes/ball/kit/headwear; preview updates.
- Career Play passes equipped racket stats, shoes, ball spec, kit colours and headwear into `startMatch`.
- [ ] **Step 1:** agy implements. **Step 2:** Opus review (screenshots of each screen; buy → equip → play → racket colour/shape and kit visible in match). **Step 3:** Commit `feat(career): training, shop and locker screens`.

## Step 3 — Rally scoring, tournaments, ladder

### Task 7: Rally scoring in `rules.js`

**Files:** Modify `src/rules.js` (`newMatch`, `point`, `scoreText`, `scoreBoard`), `src/main.js` HUD render, `test/rules.test.js`

**Interfaces:** `newMatch({ pointsTo: 16|24|32 })`: every rally adds one to `m.points[team]`; no games/sets/deuce; serve passes to the next in `serveOrder` every 4 points (`serveIdx` += 1 when `(p0+p1) % 4 === 0`); `winner` set when either team reaches `pointsTo`; `scoreBoard` returns `{ pts: [String(p0), String(p1)], label: 'RALLY TO ' + pointsTo, sets: [], server, setNo: 1 }`.

- [ ] **Step 1: Failing tests:** 16-point match ends 16–9 with winner team 0; serve changes after points 4, 8, 12; tennis-scored matches unchanged (existing tests).
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(rules): rally scoring to N points`.

### Task 8: `src/tournament.js`

**Files:** Create `src/tournament.js`, `test/tournament.test.js`

**Interfaces:**
- `createTournament({ format: 'americano'|'mexicano'|'knockout'|'league', entrants: Entrant[], rng }) -> T` (plain JSON-serialisable object). `Entrant = { id, name, rating }` (players for americano/mexicano, pairs for knockout/league; the human's id is `'me'` / pair containing `'me'`).
- `currentMatches(T) -> [{ court, a: [id,id]|pairId, b }]`, `myMatch(T) -> match|null`, `reportResult(T, match, { a: score, b: score }) -> T`, `simulateOthers(T, rng) -> T` (fills every non-human match of the round), `standings(T) -> [{ id, points|wins, diff }]`, `isFinished(T)`, `placement(T, id) -> 1..n`.
- `simulateMatch(ratingA, ratingB, { pointsTo } | { sets }, rng)`: per-rally win chance `clamp(0.5 + (ratingA - ratingB) * 0.03, 0.2, 0.8)`.
- Americano: 8 players, 7 rounds, 2 courts, 16-point rally matches; partners from the circle method so every pair partners exactly once; individual points = team points.
- Mexicano: 8 players, 5 rounds; round 1 random; later rounds sort by points, courts `[1,2,3,4]` and `[5,6,7,8]`, teams `(1+4) vs (2+3)`.
- Knockout: 8 or 16 pairs, seeded by rating, 1 set to 6 (golden point).
- League: 4–6 pairs round robin, 1 set; table by wins then game difference.

- [ ] **Step 1: Failing tests:** americano — every player partners each other exactly once over 7 rounds; mexicano — round 2 puts the top 4 on court 1 as (1+4) vs (2+3); knockout of 8 pairs finishes after 7 matches with one champion; league of 5 pairs plays 10 matches; `JSON.parse(JSON.stringify(T))` after round 3 continues identically (resume); `simulateMatch` with seeded rng and ratings 8 vs 4 wins > 70% of 200 runs.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(tournament): americano, mexicano, knockout, league engine`.

### Task 9: Circuit ladder + world ranking

**Files:** Modify `data/tournaments.json` (`circuit`), `src/career.js`, `test/career.test.js`

**Interfaces:**
- Circuit entries (in order): Club Americano (min 0, amateur AI rookie), Club League (min 10), FIP Bronze (min 30, mexicano), FIP Silver (min 80), FIP Gold (min 180), FIP Platinum (min 350, knockout), P2 (min 700), P1 (min 1300), Major (min 2500), Premier Finals (invite: world rank ≤ 8). Champion ranking points: 10, 20, 40, 80, 150, 300, 600, 1000, 2000, 1500. Placement share: 1st 1, 2nd 0.6, 3–4 0.36, 5–8 0.18, rest 0.09. Credits prize champion = 10 × champion ranking points (same shares); `entryFee` = 10% of champion credits. AI level rookie → club → pro → legend as the ladder rises. Format/venue per entry chosen by the builder.
- `career.js`: `tournamentReward(entry, placement) -> { credits, rankingPoints }`, `canEnter(profile, entry, rank) -> { ok, reason? }`, `worldRanking(profile, aiTable) -> [{ id, name, points }]` where `aiTable` is built once from `characters.json` with fixed points spread 0–6000.

- [ ] **Step 1: Failing tests:** `tournamentReward(P1, 2)` = `{ rankingPoints: 600, credits: 6000 }`; `canEnter` rejects below `min` with reason `'ranking'` and with too few Credits `'credits'`; Premier Finals only when rank ≤ 8.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(career): circuit ladder and world ranking`.

### Task 10 (agy, Opus screenshot review): Tournament and Ranking screens

**Files:** Modify `src/careerui.js`, `index.html`

- Tournaments: ladder list (locked entries show the requirement), entry fee, prizes table, format explainer (one line each from spec §4.7–4.8).
- In a tournament: round header, table/bracket, "Play your match" → `startMatch` with that match's teams, rally scoring for americano/mexicano; on return `reportResult` + `simulateOthers` + save profile (`profile.tournament = T`); final placement screen with rewards; resume on reopen.
- Ranking: world table with the player highlighted.
- [ ] **Step 1:** agy implements. **Step 2:** Opus review: play a full Americano (7 matches may be shortened with a dev `?quick` flag that sets `pointsTo: 4`), quit after round 3 and resume, see rewards. **Step 3:** Commit `feat(career): tournaments and ranking screens`.

## Step 4 — Online lobby

### Task 11: Public room list + profile look on the server

**Files:** Modify `server/server.js`, `src/net.js`; Create `test/server.test.js`

**Interfaces:**
- Client → server `{ type: 'list' }` → `{ type: 'rooms', rooms: [{ code, players, venue, free, host }] }` (only `public`, not started, with a free seat).
- `join` gains optional `public: boolean`, `name: string (≤16)`, `look: object` (stored as `room.looks[seat]` only if `JSON.stringify(look).length ≤ 2048`), `shoes`, `ball` (host only → `w.ballSpec`). Lobby message adds `looks`, `names`.
- `net.js`: `listRooms(url) -> Promise<Room[]>` (opens, sends `list`, resolves on `rooms`, closes; rejects after 4 s).

- [ ] **Step 1: Failing tests** (start the server on a random port in-process via an exported `startServer(port)`): public room appears in `list`, private does not, started room disappears; oversized `look` is dropped and join still succeeds; join without `look` succeeds.
- [ ] **Step 2–4:** FAIL → implement (`server.js` exports `startServer`, CLI still runs it) → PASS. **Step 5:** Commit `feat(online): public room list and player looks`.

### Task 12 (agy, Opus review): Online screen in career

**Files:** Modify `src/careerui.js`, `src/main.js` (render remote players from `looks`), `index.html`

- Career → Play Online: room list (refresh), Join; Create room (public/private, mode, venue, ball); Join by code. Your profile look, stats, racket, shoes go with `join`. Match end pays `matchReward` with `ai: 'online'`.
- Static GitHub Pages build keeps today's "requires a game server" message.
- [ ] **Step 1:** agy implements. **Step 2:** Opus review with two browser tabs against `npm run server`. **Step 3:** Commit `feat(career): online lobby in career`.

### Task 13: Docs

**Files:** `README.md`, `CLAUDE.md`, `AGENTS.md`, `agents/reports/*` for agy tasks
- [ ] Update feature list, roadmap (Faz 3a done, Faz 3b: accounts/login, reservations, online tournaments, paid shortcuts), CLAUDE.md notes (career modules, economy file). Commit `docs: career mode`.
