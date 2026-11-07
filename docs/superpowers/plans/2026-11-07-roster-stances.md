# Nine players and their stances — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show 9 players from 9 countries everywhere a player picks someone. The other 24 are archived but stay available to career AI. Each of the 9 has their own stance in the preview and on the portrait cards.

**Architecture:** `data/characters.json` keeps every character in its current order. Online seats and saved picks refer to array indices, so nothing moves. Archived ones get `"archived": true`, and the 4 new players are appended at the end. A small pure module `src/roster.js` answers "who can be picked" and maps a stance to its animation clip. The pickers (`menu.js`, `main.js`, `careerui.js`) use it. AI pools (tournament draw, ranking, opponents) keep the full list. Stances are data (`stance: { yaw, idle }`), read by the 3D preview (`menu.js`) and the portraits (`thumbs.js`).

**Tech Stack:** plain ES modules, three.js (client only), `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-07-live-lobby-design.md` (goals 5–6, "Arşiv ayrıntısı", "Antigravity görüşünden alınanlar").

Plan 2 of 5. Work split (spec "İş bölümü"): Tasks 1–2 Opus (Haiku 5.5 may write the 4 JSON entries), Task 3 goes to agy as `agents/tasks/agy-27-stances.md` (visual tuning in `tools/posetest.html`), Opus reviews and ships (Task 4).

## Global Constraints

- The 9 players: Mesut 🇹🇷 `p26`, Lucía 🇪🇸 `p27`, Matteo 🇮🇹 `p25`, Camille 🇫🇷 `p28`, Daan 🇳🇱 `p31`, and the new Tomás 🇦🇷 (m), Lena 🇩🇪 (f), Diogo 🇵🇹 (m) and Elin 🇸🇪 (f).
- Never delete or reorder a character. New ones are appended with ids `p34` (Tomás), `p35` (Lena), `p36` (Diogo), `p37` (Elin).
- Archived characters disappear from the Friendly picker, the career creator and the career partner picker. They stay in the tournament draw pool, `aiRankingTable` and wherever they are reached by id. A saved Friendly pick that points at an archived character falls back to a random one of the 9. A career profile keeps its own template.
- Stances: 6 of the 9 face the camera, 3 turn to the right of the screen. Right-turned: Lucía, Tomás and Elin (Opus's choice). The preview no longer spins by itself, but dragging still turns it.
- New UI texts: none. If one appears, it goes through `t()` and into all 7 locale tables.
- Intel HD 620: no new render passes, and portraits stay 256×256.
- `npm test` passes after every task. Only Opus commits and pushes, and checks Pages after the push.

## Review Focus

1. **A visitor whose saved Friendly pick is an archived player** must see a valid one of the 9 selected, and the first click on START must not use the archived one. The test is in Task 2 (`resolvePick`).
2. **An online room where the other player still runs an older client** sends a `char` index of an archived player. The lobby and match must still draw that character, because index lookup uses the full list. Task 2 checks that `lobbyview.js` and `main.js:288` index the full array; if either filters, that is a bug.
3. **Career tournaments with a 16-pair draw** must still find enough AI players. The test is in Task 2 (pool size guard).
4. **Portrait cache.** Portraits are cached in memory per key (`thumbs.js`). A stance change in the data must not show the old pose after a reload. Task 3 makes the stance part of the cache key.
5. **Phones.** The preview's drag-to-turn must still work on touch (`pointer` events). With no auto-spin, the preview must not look frozen. The idle clip keeps it alive (Task 3 manual check on `?touch`).

---

### Task 1: The nine in the data

**Files:**
- Modify: `data/characters.json`
- Test: create `test/roster.test.js`

**Interfaces:**
- Produces: every character has an optional `archived: true`. Exactly 9 lack it. Each of the 9 has `stance: { yaw: number, idle: 'ready' | 'relaxed' | 'talk' }`, where `yaw` is in degrees and positive turns toward screen-right. The defaults: front `{ yaw: 0, idle: 'ready' }`, right `{ yaw: 30, idle: 'relaxed' }`. Task 3 may tune the numbers and idles.

- [ ] **Step 1: Write the failing test** `test/roster.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const chars = JSON.parse(fs.readFileSync(new URL('../data/characters.json', import.meta.url)));
const ACTIVE = ['p26', 'p27', 'p25', 'p28', 'p31', 'p34', 'p35', 'p36', 'p37'];

test('nine active players from nine countries, the rest archived and still in the file', () => {
  const active = chars.filter(c => !c.archived);
  assert.deepEqual(active.map(c => c.id).sort(), [...ACTIVE].sort());
  assert.equal(new Set(active.map(c => c.countryCode)).size, 9);
  assert.equal(chars.length, 37);
  assert.deepEqual(chars.slice(33).map(c => c.id), ['p34', 'p35', 'p36', 'p37']);  // appended, nothing moved
  assert.equal(chars.map(c => c.id).slice(0, 33).join(), 'p01,p02,p03,p04,p05,p07,p06,p08,p09,p10,p33,p11,p12,p18,p25,p26,p14,p13,p15,p16,p17,p20,p19,p22,p23,p21,p24,p27,p28,p29,p30,p31,p32');  // existing indices stay put (online seats send indices)
});

test('new players have the same fields as the old ones, and every active player has a stance', () => {
  const keys = (c) => Object.keys(c).filter(k => !['archived', 'stance', 'beard', 'beardColor', 'hairOpacity', 'ponytail', 'topknot', 'makeup', 'glasses', 'headwear'].includes(k)).sort();
  const mesut = chars.find(c => c.id === 'p26');
  for (const c of chars.slice(33)) assert.deepEqual(keys(c), keys(mesut), c.id);
  const active = chars.filter(c => !c.archived);
  assert.equal(active.filter(c => c.stance?.yaw === 0).length, 6);
  assert.equal(active.filter(c => c.stance?.yaw > 0).length, 3);
});
```

- [ ] **Step 2:** `node --test test/roster.test.js` → FAIL (33 characters, all of them active).
- [ ] **Step 3:** Edit the JSON. Add `"archived": true` to every character outside `ACTIVE`, and add a `stance` to the 9. Append the 4 new characters. Give each new one stats within the range of the existing pros (average 6.5–7.5, no stat over 9) and `aiLevel: "pro"`; spread `position` over `drive`/`reves`. Choose looks (`skinTone`, `hair`, `hairColor`, `body`, `outfit`, `beard` for the men if wanted) using only values `sanitizeLook` accepts in `server/server.js` (`ONE_OF`, `BODY_TYPES`, hex colours). Use these countries: `{ country: 'Argentina', countryCode: 'AR' }`, `{ 'Deutschland', 'DE' }`, `{ 'Portugal', 'PT' }`, `{ 'Sverige', 'SE' }`.
- [ ] **Step 4:** `node --test test/roster.test.js` → PASS. Then run `npm test` → all pass (`test/server.test.js` reads `ROSTER` from the file length, and `crowdplan`/`crowdatlas` use `BASE_LOOKS`, not this file).
- [ ] **Step 5:** Commit `players: nine active players from nine countries (Tomás, Lena, Diogo and Elin join), the other 24 archived; each of the nine has a stance`.

### Task 2: Pickers show the nine, AI keeps everyone

**Files:**
- Create: `src/roster.js`
- Modify: `src/menu.js:554` (`populateCharGrid`), `src/main.js:44,333` (random start, Friendly AI opponents), the place where `menu.js` applies `loadPicks()` (the picked `char` index), `src/careerui.js:187,594,602,626` (creator), `src/careerui.js:1257-1262` (`availablePartners`), `src/careerui.js:2340` (tournament pool)
- Test: `test/roster.test.js`

**Interfaces:**
- Produces in `src/roster.js` (pure, no DOM or three imports):
  - `isActive(c) -> boolean`, which returns `!c.archived`.
  - `activeIndices(list) -> number[]`
  - `resolvePick(idx, list, rnd = Math.random) -> number`: `idx` when it points at an active character, otherwise a random active index.
  - `STANCE_CLIPS = { ready: 'Sword_Idle', relaxed: 'Idle_Loop', talk: 'Idle_Talking_Loop' }`
- Produces in `careerui.js`: `availablePartners(prof = profile, all = false)`. The partner picker calls it as it does today and gets active players only. The tournament pool (`:2340`) calls `availablePartners(profile, true)`.

- [ ] **Step 1: Write the failing tests** (append to `test/roster.test.js`):

```js
import { isActive, activeIndices, resolvePick, STANCE_CLIPS } from '../src/roster.js';

test('a saved pick of an archived player falls back to one of the nine', () => {
  const act = activeIndices(chars);
  assert.equal(act.length, 9);
  assert.equal(resolvePick(15, chars), 15);                 // Mesut (index 15) stays
  assert.ok(act.includes(resolvePick(0, chars, () => 0.5))); // Ahmet is archived
  assert.ok(act.includes(resolvePick(999, chars)));          // out of range
});

test('career tournaments still find enough AI players (16 pairs need 30 besides you and your partner)', () => {
  assert.ok(chars.length - 2 >= 30);
  assert.ok(chars.filter(isActive).length < 30);  // so the draw must use the full list, not the pickable one
});

test('every stance idle names a clip in the animation file', () => {
  const glb = fs.readFileSync(new URL('../public/assets/anims/UAL1_Standard.glb', import.meta.url));
  const names = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()).animations.map(a => a.name);
  for (const c of chars.filter(isActive)) assert.ok(names.includes(STANCE_CLIPS[c.stance.idle]), c.id);
});
```

- [ ] **Step 2:** `node --test test/roster.test.js` → FAIL (`src/roster.js` does not exist).
- [ ] **Step 3:** Create `src/roster.js`. Wire the pickers listed under Files. In the grids, skip archived characters but keep `data-idx` as the full-array index. The career creator's count texts use the active count. `main.js:288` and `lobbyview.js` keep indexing the full array (Review Focus 2).
- [ ] **Step 4:** `node --test test/roster.test.js` → PASS; `npm test` → all pass; `npx vite build` succeeds.
- [ ] **Step 5:** Manual check (`npm run dev`):
  - The Friendly grid shows 9 cards.
  - A saved pick `localStorage['padel.friendly.v1'] = '{"char":0}'` loads as one of the 9.
  - The career creator shows 9 templates.
  - A career tournament with a 16-pair draw starts without an error.
- [ ] **Step 6:** Commit `players: pickers show the nine active players; career AI, tournament draws and online seats still use everyone`.

### Task 3 (agy-27): Stances in the preview and on the cards

**Files:**
- Modify: `src/player.js` (`CLIPS` gains the clips from `STANCE_CLIPS`; the avatar gets `playIdle(name)`, or an `idle` option on `createAvatar`), `src/menu.js:395-430` (preview loop and `updateAvatarPreview`), `src/thumbs.js:55-90` (portrait pose and cache key)
- Tune in: `tools/posetest.html`
- Test: `test/roster.test.js`

**Interfaces:**
- Consumes: `STANCE_CLIPS` and `ch.stance` from Tasks 1–2.
- Produces: the preview starts at `turntable = ch.stance.yaw * Math.PI / 180` and plays `STANCE_CLIPS[ch.stance.idle]`. The `turntable += 0.006` auto-spin is removed, while drag (`turntable += dx * 0.015`) stays. Portraits apply the same yaw to `avatar.holder.rotation.y` before the neck gaze fix. For a turned stance, the face follows the body halfway (the gaze target moves `0.5 × yaw` toward screen-right) instead of looking straight into the lens. The portrait cache key includes `stance.yaw` and `stance.idle`.

- [ ] **Step 1: Write the failing test:** export `portraitKey(ch)` from `thumbs.js` only if `thumbs.js` can load in node. Otherwise put `portraitKey(ch) -> string` in `src/roster.js` and have `thumbs.js` use it. Then:

```js
test('a stance change makes a new portrait key', () => {
  const c = chars.find(x => x.id === 'p27');
  assert.notEqual(portraitKey(c), portraitKey({ ...c, stance: { ...c.stance, yaw: 0 } }));
});
```

- [ ] **Step 2:** `node --test test/roster.test.js` → FAIL.
- [ ] **Step 3:** Implement as listed under Interfaces. Tune `yaw` (20–40°) and the idle per player in `tools/posetest.html` so the 3 turned players read clearly as turned, while the racket stays visible and no hand clips through the body. Write the final values back into `data/characters.json`. Pose offsets follow the rule in `CLAUDE.md` (reset posed bones to their last clip value: `posed`/`clipQ`).
- [ ] **Step 4:** `npm test` → all pass. Take screenshots of the Friendly grid (all 9 portraits) and the preview for Lucía and Mesut, on a desktop window and on `?touch` at phone size, and put them in `agents/reports/agy-27-stances/`.
- [ ] **Step 5:** Report `agents/reports/agy-27-stances.md`: changed files, final stance values, screenshots. agy does not commit.

### Task 4: Review and ship

- [ ] **Step 1:** Opus reads the agy diff and the report, and greps every name the report gives. Then run `npm test` and open the Friendly screen in a browser (`npm run dev`) to compare against the screenshots. Check that the preview at phone size still turns on drag.
- [ ] **Step 2:** Fix what is wrong (each fix with a failing test first when it is logic), then commit `players: stances — six face the camera, three turn right; the preview stands still and turns on drag; portraits follow the stance`.
- [ ] **Step 3:** `npm test` → all pass. Push, then check that the Pages run succeeded and that https://padellegends.eu shows 9 players.
- [ ] **Step 4:** Update the `AGENTS.md` task table (`agy-27`) and the "Current feature status" bullets in `CLAUDE.md` (9 active players, `src/roster.js`, `stance`). Commit `docs: …`.
