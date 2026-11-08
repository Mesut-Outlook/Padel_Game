# Scheduled Games + Training Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Players can post games for a time up to 7 days ahead, others ask to join (host approves or open join), everyone meets in a waiting room at the time; HOME shows a "Match calendar" that is never a misleading empty box, and a Training card sits under PLAY NOW.

**Architecture:** A pure, unit-tested `server/schedule.js` holds postings/reservations and all rules (caps, auto-accept, expiry, due games); `server/schedulestore.js` persists it atomically to `PADEL_STATE`; `server/server.js` wires `schedule:*` websocket messages and starts scheduled rooms through the existing `makeRoom`/`begin`. On the client, pure helpers in `src/schedule.js` (token, server-clock offset, slot list, day groups, `.ics`) feed the HOME rendering in `src/home.js`; `src/main.js` polls and enters rooms through the existing `startOnline`/`pend` flow.

**Tech Stack:** Plain ES modules, Node 22 (`node:test`, `node:crypto`, `node:fs`), `ws`, vanilla DOM. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-08-scheduled-games-design.md` (read it; the "Decisions after the builder check" section is binding).

## Global Constraints
- Shared modules (`src/game.js`, `physics.js`, `rules.js`, `ai.js`) stay DOM-free; `server/schedule.js` imports nothing from the DOM or three.
- Every new UI text: `t('English text', {n})` (or `N_()` where defined in a table), one sentence per key, never a `${}`-built key, added to all 7 tables `src/locales/{de,es,fr,it,nl,pt,tr}.js`; run `node tools/extract-keys.js`; `test/i18n-keys.test.js` must pass.
- Privacy: no personal data beyond the typed nickname, character index and level; tokens stored server-side only as `sha256` hex; never log IPs, names, codes or tokens (log lines only `schedule: …` counts).
- Values from the spec: 7 days ahead max; 30-minute slots; posting not earlier than now + 15 min; a posting reserves its start..start+90 min (`LIMITS.matchMs`); at most 8 overlapping scheduled windows; scheduled rooms may start only while fewer than `rooms - 2` scheduled rooms play; 1 active posting and 2 reservations/requests per visitor (token hash OR `ownerKey`); 8 pending requests per posting; 60 postings total; 10 `schedule:*` writes per visitor per minute; auto-accept pending requests at start − 60 min; Enter from start − 10 min; wait up to 3 min for more humans after start; posting disappears at start + 15 min or on delete.
- Tests: `npm test` (node:test). One test per rule. Commit after each task with the repo's attribution trailer.
- Client target Intel HD 620; HOME is DOM only. Gamepad focus (`padnav.js`) must reach new buttons (they are `<button>`s inside `#home`).
- Static build without server (`serverUrl()` null): calendar hidden, like Invite today. Poll only `trustedServer` URLs.

## Review Focus
1. **Time zones / DST:** a viewer in another zone sees the posting in their local time and the slot buttons are local — test `slotsFor(dayOffset, nowMs, tz)` returns local half-hours and `postAt` converts to the same UTC instant.
2. **Server restart mid-week:** postings survive (`schedulestore` round-trip) and a corrupt or missing file starts empty with one log line, never crashes — test both.
3. **Host never comes:** at start the room is opened by whoever enters first, host hand-over works, `begin()` is called by the scheduler after the 3-minute wait — server test with only a guest entering.
4. **Client clock wrong by hours:** "in 2 h" and the Enter button use the server `now` offset — test `relTime(atMs, serverOffsetMs, nowMs)`.
5. **Cancelled/declined seats:** a guest cancels after acceptance → seat frees, a pending request can take it; a declined guest's row shows "Not accepted" — schedule tests for both.

---

### Task 1: Training card under PLAY NOW

**Files:**
- Modify: `src/home.js:~305-342` (left column markup; remove `#hm-btn-training` from the bottom bar row; keep the id on the new card so `main.js` `onTraining` keeps working), `src/tutorial.js` (export), `index.html` (CSS near `.hm-sub-actions`), `src/locales/*.js`, `data/i18n-keys.json`
- Test: `test/home.test.js`, `test/tutorial.test.js` (create)

**Interfaces:**
- Produces: `export function tutorialFinished(storage = globalThis.localStorage): boolean` in `src/tutorial.js` (true when every `LESSONS[].id` is in `JSON.parse(storage.getItem('padel.tutorial'))`; false on missing/garbage/throwing storage).

- [ ] **Step 1: Write failing tests**
  - `test/tutorial.test.js` › `tutorialFinished: all lesson ids done → true; one missing, empty, garbage JSON or throwing storage → false` (build the "all" set from a list you read via a small exported `LESSON_IDS` constant).
  - `test/home.test.js` › `HOME shows the Training card under PLAY NOW; after the tutorial it is a plain 'Training again' button`: render with empty storage → `#hm-btn-training` has class `hm-train-card` and contains `New here? Learn the shots in a few minutes`; with all ids done → class `hm-btn-sec` and text `Training again`; the bottom bar no longer contains `#hm-btn-training` twice.
- [ ] **Step 2:** `npm test` → both new tests FAIL.
- [ ] **Step 3:** Export `LESSON_IDS` and `tutorialFinished` from `src/tutorial.js` (it must not touch the DOM at import time). In `home.js` render, right after `#hm-btn-play-now`: card `<button id="hm-btn-training" class="hm-train-card"><span class="hm-train-ic">🎓</span><span><b>${t('Training')}</b><small>${t('New here? Learn the shots in a few minutes')}</small></span><span class="hm-train-arr">›</span></button>`, or when finished `<button id="hm-btn-training" class="hm-btn-sec">${t('Training again')}</button>`. CSS copies the mockup `.train` look (blue `--court` icon tile, `#bfdbfe` border, gradient `#eff6ff→#fff`, 44 px min height). Add the 2 keys to all 7 locales; extract keys.
- [ ] **Step 4:** `npm test` → PASS. Build `VITE_STATIC=1 npx vite build`, open HOME at 1288 px and 390 px portrait, check the card and that Training starts.
- [ ] **Step 5:** Commit `home: Training card under PLAY NOW (plain 'Training again' after the tutorial)`.

### Task 2: Pure schedule model

**Files:**
- Create: `server/schedule.js`
- Test: `test/schedule.test.js`

**Interfaces:**
- Produces (all pure; `now` is ms; tokens arrive already hashed as hex `th`; `vk` = visitor key string):
  - `export const SCHEDULE = { aheadDays: 7, slotMin: 30, leadMin: 15, windowMs: 5400000, maxOverlap: 8, perVisitorPosts: 1, perVisitorSeats: 2, maxRequests: 8, maxPosts: 60, autoAcceptMin: 60, enterMin: 10, graceMin: 3, expireMin: 15 }`
  - `export function createSchedule(limits = {}, state = null)` → object `s` with:
    - `post({ at, players, mode, open, name, char, level, th, vk }, now) → { ok: true, game } | { ok: false, err }` — `err` is one of the fixed sentences below.
    - `ask({ id, name, char, level, th, vk }, now) → { ok, status: 'accepted'|'pending', err? }` (open games accept at once while seats are free)
    - `answer({ id, reqTh, accept, th }, now) → { ok, err? }` (only the host's `th`)
    - `cancel({ id, th }, now) → { ok }` (guest leaves: seat or request removed)
    - `remove({ id, th }, now) → { ok }` (host deletes; game kept as `cancelled` until expiry so guests see it)
    - `list(th, now) → [{ id, at, players, mode, open, host: { name, char, level }, seats: [{ name, char, level }], free, mine: 'host'|'seat'|'pending'|'declined'|'cancelled'|null, requests?: [{ reqId, name, char, level, ago }] }]` (requests only for the host; `reqId` = first 8 hex of the requester's `th`)
    - `sweep(now) → { started: [game], expired: [id] }` — auto-accepts pending requests at `at − autoAcceptMin` (FIFO while seats free), drops games at `at + expireMin`, ignores everything when `now < newest createdAt` (clock sanity).
    - `seatsFor(id) → [{ th, name, char, level }]` host first, then accepted in acceptance order.
    - `slotTaken(at) → number` overlapping windows at `at`.
    - `toJSON() → plain object`; `createSchedule(limits, json)` restores it.
  - Fixed error sentences (exported `N_`-free plain strings; the client translates them via `NET_TEXTS`): `'That time is not available.'`, `'That time slot is full. Pick another time.'`, `'You already have a game posted.'`, `'You already have two games booked.'`, `'This game has enough requests.'`, `'This game is full.'`, `'Game not found.'`, `'The schedule is full. Try again later.'`

- [ ] **Step 1: Write failing tests** in `test/schedule.test.js`, one per rule, e.g.:
  - `post: only half-hour slots from now+15 min to 7 days ahead` (`at` not on :00/:30, past, now+10 min, now+8 days → `'That time is not available.'`; now+1 day on :30 → ok)
  - `post: 9th overlapping game in a 90-minute window is refused` (8 posts by 8 visitors at 21:00 → ok; 9th at 21:30 → `'That time slot is full. Pick another time.'`; one at 22:30 → ok)
  - `post: one posting per visitor by token hash or visitor key` (same `th` different `vk` → refused; same `vk` different `th` → refused)
  - `ask: open game seats at once, closed game queues; 2 bookings per visitor; 8 pending max; full game refused`
  - `answer: only the host decides; declined shows mine 'declined' to that guest`
  - `cancel after acceptance frees the seat; a pending request can then be accepted`
  - `sweep: pending requests auto-accepted 60 min before start in arrival order while seats last`
  - `sweep: game expires 15 min after start; remove() keeps it as cancelled for guests until then`
  - `sweep: a clock earlier than the newest posting changes nothing`
  - `list: host sees requests with reqId; others never see tokens; free count right for singles and doubles`
  - `toJSON round-trip keeps games, seats, requests and createdAt`
- [ ] **Step 2:** `node --test test/schedule.test.js` → FAIL (module missing).
- [ ] **Step 3:** Implement `server/schedule.js`. Games in a `Map` by id (`randomBytes`-free: take `id` from an injected `newId()` option defaulting to `crypto.randomUUID().slice(0,8)` so tests can pass deterministic ids). Names go through the caller (server passes `cleanName`), store as given.
- [ ] **Step 4:** `node --test test/schedule.test.js` → PASS; `npm test` → PASS.
- [ ] **Step 5:** Commit `server: pure schedule model for posted games (caps, approvals, auto-accept, expiry)`.

### Task 3: Persistence

**Files:**
- Create: `server/schedulestore.js`
- Test: `test/schedulestore.test.js`

**Interfaces:**
- Produces: `export function loadSchedule(path, log = () => {}) → object|null` (null + one `log('schedule: not persistent')` when `path` falsy or unreadable/not JSON; never throws) and `export function saveSchedule(path, data) → boolean` (write `path + '.tmp'` then `renameSync`; false on error, never throws).

- [ ] **Step 1: Tests:** `saveSchedule then loadSchedule returns the same object (tmp dir via fs.mkdtempSync)`; `missing path, garbage file, unwritable dir → null/false and no throw`; `no .tmp file left behind after save`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5:** Commit `server: atomic schedule file (PADEL_STATE)`.

### Task 4: Server wiring (`schedule:*`, scheduled rooms)

**Files:**
- Modify: `server/server.js` (startServer: create schedule from `loadSchedule(process.env.PADEL_STATE)`; message handlers; sweep timer; `begin()` capacity rule; `list` reply gains `clients` and `now`), `src/net.js` (`NET_TEXTS` gains the 8 schedule sentences; `listRooms` keeps working and additionally returns `{ clients, now }` via a new function below)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: Task 2 `createSchedule`, Task 3 `loadSchedule/saveSchedule`.
- Produces (wire protocol; every message JSON on the existing socket):
  - client → `{ type: 'schedule:list', token }` ⇒ server → `{ type: 'schedule', games: list(th), clients: <open sockets − 1>, now }`
  - `{ type: 'schedule:post', at, players, mode, open, name, char, level, token }`, `schedule:ask {id,…}`, `schedule:answer {id, reqId, accept, token}`, `schedule:cancel {id, token}`, `schedule:delete {id, token}` ⇒ `{ type: 'schedule:ok', games, now }` or `{ type: 'error', msg }`
  - `{ type: 'schedule:enter', id, token, char, stats, racket, name, look }` ⇒ joins the game's room (code = `'S' + id.slice(0,5).toUpperCase()`), replies like `join` (`seat`, `lobby`); refused before `at − enterMin` or for a token without a seat (`'Game not found.'`).
  - `token` is any string ≤ 64 chars; the server hashes it `createHash('sha256')`, never stores or logs it.
  - `startServer(port, limits)` returns `{ …, schedule }` so tests can inspect it.
- Rules to implement: scheduled room `cfg = { players, mode, scheduled: id, auto: false, public: false }` from the posting; it is excluded from the `waiting` and `roomsPerIp` counts; seats assigned in arrival order from `seatsFor(id)` tokens only; the sweep timer (every 5 s) calls `schedule.sweep(now)` and for each due room: `begin()` at `at` if ≥ 2 humans, else at `at + graceMin` with whoever is there (AI fills seats as in auto rooms); `begin()` refuses a scheduled room when `startedScheduled ≥ rooms − 2`; write the file after every successful mutation; per-visitor `schedule:*` writes limited to 10/min (`'The server is full. Try again later.'`).

- [ ] **Step 1: Tests** (use `startServer(0, { … })`, fake `now` via a `clock` option `limits.now = () => t` that `schedule` and the sweep use):
  - `schedule: post, list and ask over the socket; the token never comes back`
  - `schedule: enter only from 10 min before and only with a seat; host and guest get seats 0 and 2 (singles)`
  - `schedule: room starts at the time with two humans; with one human it starts after the 3-minute grace`
  - `schedule: a guest alone opens the room and becomes host when the host never comes`
  - `schedule: scheduled rooms leave two match slots free (rooms: 3 → the 2nd scheduled start waits)`
  - `schedule: writes over 10 a minute are refused`
  - `schedule: PADEL_STATE file is written on post and reloaded by a new server`
  - `list reply carries clients (others) and now`
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** `npm test` → PASS (all old server tests unchanged).
- [ ] **Step 5:** Commit `server: schedule:* messages, scheduled rooms with a 3-minute grace, two match slots kept free, schedule file`.

### Task 5: Client helpers

**Files:**
- Create: `src/schedule.js` (pure except `scheduleToken()` storage access with try/catch)
- Modify: `src/net.js` (`export function scheduleCall(url, msg) → Promise<reply>`: one short socket like `listRooms`, 4 s timeout, resolves the first `schedule`/`schedule:ok`/`error` reply, sanitising fields to plain strings/numbers)
- Test: `test/schedule-client.test.js`

**Interfaces:**
- Produces:
  - `scheduleToken(storage = localStorage) → string` (`padel.scheduleToken`, 22-char base64url from `crypto.getRandomValues`; created once)
  - `clockOffset(serverNow, clientNow) → number`
  - `relTime(atMs, offsetMs, nowMs) → { key: 'in {h} h {m} min'|'in {m} min'|'now'|'started', h, m }` (keys are `t()` keys)
  - `slotsFor(dayOffset, nowMs, offsetMs) → [{ at, label: 'HH:MM' }]` local half-hours from now+15 min (day 0) or 00:00, up to 23:30
  - `dayStrip(games, nowMs, offsetMs) → [{ dayOffset, weekday, date, count }]` ×7
  - `quickSlots(nowMs, offsetMs) → [{ at, label, dayOffset }]` ×3: today 20:00/21:00/22:00 that are still ≥ 15 min away, filled from tomorrow's same hours
  - `icsFor(game, title) → string` (VCALENDAR/VEVENT, UTC `DTSTART`, 90-min `DTEND`, `URL:https://padellegends.eu/`, no names)
- [ ] **Step 1: Tests:** one per function, including `slotsFor` in `TZ=America/New_York` vs `Europe/Amsterdam` (run the sub-test with `process.env.TZ` set before `Date` use, or pass an explicit `tzOffsetMin` parameter if simpler — choose one and test it), `relTime` with a client clock 3 h fast, `quickSlots` at 21:50 → 22:00 dropped? (22:00 is 10 min away → replaced by tomorrow 20:00), `icsFor` contains `DTSTART:` in `Z` and no host name.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `client: schedule helpers (token, server clock, slots, day strip, .ics) and scheduleCall`.

### Task 6: HOME Match calendar, posting sheet, host/guest rows

**Files:**
- Modify: `src/home.js` (right column → "Match calendar"; `export function setSchedule({ games, clients, offset, now, serverReady })`; sheet; rows; events go out through new callbacks), `src/main.js` (poll: in `refreshOpenGames` also `scheduleCall(url, { type: 'schedule:list', token })` and pass to `setSchedule`; callbacks `onPost/onAsk/onAnswer/onCancel/onDelete/onEnter`), `index.html` (CSS from `home-v3.html` / `open-games-v2.html`), `src/locales/*.js`, `data/i18n-keys.json`, `privacy.html`
- Test: `test/home.test.js`

**Interfaces:**
- Consumes: Task 5 helpers, Task 4 protocol.
- Produces: `initHome` callbacks `onPost({ at, players, mode, open })`, `onAsk(id)`, `onAnswer(id, reqId, accept)`, `onCancel(id)`, `onDelete(id)`, `onEnter(id)`; `setSchedule(...)`.
- UI copy (English keys, translate into 7 tables): `Match calendar`, `{n} players on the site now`, `{name} is waiting now`, `Post a game`, `Ask to join`, `Join`, `Your seat is ready`, `Add to calendar`, `Cancel`, `Not accepted`, `The host cancelled this game.`, `Enter`, `No games yet on this day.`, `Be the first to post a game tonight`, `Pick a time and your game shows here for everyone.`, `Pick another day or time`, `Anyone can join without approval`, `If this is off, you approve requests.`, `Post game`, `Requests`, `Unanswered requests are accepted 1 hour before the game.`, `Delete game`, `{name} is waiting for you · start now`, `Warm up until someone joins`, `Your nickname is shown. One game at a time.` (plus the 8 server sentences in `NET_TEXTS`).
- Behaviour pinned: the "waiting now" strip only when `openRooms` rows exist; player count only when `clients ≥ 1` other; quick-slot cards use the current Singles/Doubles pick; "N games played this week" and the "Most popular" badge are left out of this release (no server counter yet; note it in docs/next-steps.md); host row shows requests with ✓/✕; reserved row has `.ics` download via a Blob link (`download="padel-legends.ics"`); Enter button from start − 10 min (server clock); static build hides the whole calendar column content and shows today's "Online play is not open yet." line.
- [ ] **Step 1: Tests** in `test/home.test.js`: `calendar empty state shows three quick slots and no misleading list`; `waiting strip appears only with a real open room`; `player count hidden when alone`; `host row lists requests with accept/decline buttons`; `reserved row offers Add to calendar and Cancel`; `PLAY NOW sub line says who waits, else 'Warm up until someone joins'`.
- [ ] **Step 2–4:** FAIL → implement → PASS; extract keys; `npm test`.
- [ ] **Step 5:** Manual check on a local static build against a local server (`npm run server` + `?server=ws://localhost:8080` is refused on https, so use the Vite dev server): post, ask from a 2nd browser profile, approve, see rows, download `.ics`, 390 px portrait, gamepad focus reaches the new buttons.
- [ ] **Step 6:** `privacy.html` paragraph (spec "Privacy page") in this commit. Commit `home: Match calendar with posted games, requests and bookings; privacy page`.

### Task 7: Waiting room and start

**Files:**
- Modify: `src/main.js` (`enterScheduled(id)` → `startOnline({ … , schedule: id, warmup })` sending `schedule:enter` instead of `join`), `src/net.js` (`connect` accepts `enter: { id, token }` and sends `schedule:enter`), `src/lobbyview.js` (countdown line when `lobby.cfg.scheduled`: `Starts in {m}:{ss}` / `Waiting {m}:{ss} for the others, then the AI takes empty seats`), locales
- Test: `test/lobbyview.test.js`, `test/server.test.js` (already covers start rules)

**Interfaces:**
- Consumes: Task 4 `schedule:enter`, lobby message gains `at` and `graceUntil` for scheduled rooms (add to `lobby()` payload in `server.js`).
- [ ] **Step 1: Tests:** `lobbyView for a scheduled room shows the start countdown, then the grace countdown`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Manual: local server, two browser profiles, post for the next free slot (≥ 15 min away) and wait; check Enter appears at −10 min, warm-up runs, the room starts at the time, AI fills a no-show seat after 3 min. No lead-time override ships.
- [ ] **Step 6:** Commit `online: waiting room for posted games (warm-up, countdown, AI after 3 minutes)`.

### Task 8: Pi state dir, docs, security audit

**Files:**
- Modify: Pi scripts are not in the repo; update `docs/online-server.md` with the one-time sudo step: add `StateDirectory=padel` and `Environment=PADEL_STATE=/var/lib/padel/schedule.json` to `padel.service`, `systemctl daemon-reload && systemctl restart padel` (Opus writes `~/padel-state.sh` on the Pi for the user to run). `CLAUDE.md` status line, `README.md` roadmap line, `kontroller.html` nothing.
- [ ] **Step 1:** Run the `security-auditor` agent on the branch diff + Pi (read-only); fix blockers; save its report to `agents/reports/security-<date>-schedule.md` (gitignored).
- [ ] **Step 2:** Deploy to the Pi (`git archive` → `~/padel`, tests there, user runs the update + state script), verify `schedule: …` status, post a game from the live site, restart `padel`, the game is still listed.
- [ ] **Step 3:** Commit docs; push; check the Pages run and the live site.
