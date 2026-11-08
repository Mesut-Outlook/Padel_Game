# Report: agy-28 — `✕ Exit` düğmesi ve "Leave the match?" penceresi

## Changed Files & Symbols

### 1. `index.html`
- **`#exitBtn` CSS & HTML**:
  - Added `<button type="button" id="exitBtn" hidden><span aria-hidden="true">✕</span> <span data-i18n="Exit">Exit</span></button>` directly above `#hud`.
  - Styled `#exitBtn` in the top-left corner (`top: max(10px, env(safe-area-inset-top))`, `left: max(10px, env(safe-area-inset-left))`, `min-height: 44px`, `min-width: 44px`, `background: #fff`, `color: #0b1520`, `z-index: 25`, only `transform` and `opacity` transitions, no `backdrop-filter`).
- **`#hud`, `#help[data-pos="tl"]`, `#tutorial` layout**:
  - Shifted `#hud` down to `top: calc(max(10px, env(safe-area-inset-top)) + 52px); left: max(10px, env(safe-area-inset-left));` so the scoreboard never overlaps `#exitBtn` on desktop or `body.touch`.
  - Updated `#help[data-pos="tl"]` and `#tutorial` from `top: 125px` to `top: 180px` so top-left help / tutorial cards stay clear of the shifted scoreboard.
  - Added `#help .hk-wide small { max-width: 38px; }` so longer localized `"Exit menu"` key labels fit cleanly.
- **`#pause` modal HTML & `.pz-loss` CSS**:
  - Updated `.pz-title` to `data-i18n="Leave the match?"` (`Leave the match?`).
  - Added `<div id="pzLoss" class="pz-loss" hidden data-i18n="Leaving counts as a loss.">Leaving counts as a loss.</div>` above `#pzItems` with `.pz-loss` styling (`color: #ff9f43; font-size: 13px; font-weight: 700; margin: -8px 0 12px;`).

### 2. `src/main.js`
- **`setupScene()`**:
  - Added `'exitBtn'` to the match HUD elements unhidden on match start (`for (const id of ['exitBtn', 'hud', 'cam', 'help', 'fsBtn']) $(id).hidden = false;`).
  - Wired `$('exitBtn')` inside `setupScene`: sets its label span to `t('Exit')`, and on click calls `toMenu()` if the match is already over, or ends active replay and calls `setPaused(!paused)`.
  - Updated `createTutorial` `onExit` callback to call `toMenu()` after `track('tutorial-end')`.
- **`toMenu()`**:
  - Kept `#career` navigation and `onEnd({ winner: 1, sets: ..., forfeit: true })` unchanged for career matches.
  - Changed non-career matches (Friendly, online, Training) to return to `#home` (`history.replaceState(history.state, '', '#home')`) instead of `#friendly`.
- **`pauseItems()`**:
  - Renamed the first item from `t('Resume')` to `t('Keep playing')` (selected by default when opening via `setPaused(true)` since `pauseIdx = 0`) and the last item from `t('Main menu')` to `t('Leave')`.
  - Preserved `Restart match` (offline non-Training), `Skip lesson` (Training), and `Fullscreen` / `Exit Fullscreen` in between.
- **`drawPause()`**:
  - Sets `.pz-title` text to `t('Leave the match?')`.
  - Shows `#pzLoss` (`Leaving counts as a loss.`) only when `onEnd` is set (career matches) and hides it otherwise.
  - Preserves `#pzNote` (`Match continues in the background`) for online matches and `pauseInput()` keyboard/gamepad/touch handling.

### 3. `src/touch.js`
- **`TOP`**:
  - Removed `['Escape', '⏸', N_('Pause')]` from the top touch bar (`TOP`), since `#exitBtn` is always visible in the top-left during matches.
- **`mountTouch()` (`.tc-tips` / `.tt-top`)**:
  - Updated the top-bar coach tip from `t('pause · camera · replay · sound · scoreboard · these tips')` to `t('✕ Exit · camera · replay · sound · scoreboard · these tips')`.

### 4. `src/helpkeys.js` & `kontroller.html`
- **`src/helpkeys.js` (`K`, `PAD`, `mountKeyHelp`)**:
  - Changed `K.Escape` caption from `N_('pause')` to `N_('Exit menu')`.
  - Changed `PAD` button `9` (`Start`) description from `N_('pause (Start)')` to `N_('Exit menu (Start)')`.
  - Changed `.hk-foot` keyboard summary from `<b>Esc</b>: pause` to `<b>Esc</b>: Exit menu`.
- **`kontroller.html`**:
  - Updated all 5 pause references (`Esc` table cell, `Start` gamepad table cell, touch top-row description, keyboard summary, and inline `K.Escape` diagram label) to `Exit menu` with matching `data-i18n` attributes.

### 5. `data/i18n-keys.json` & `src/locales/{de,es,fr,it,nl,pt,tr}.js`
- Added all 14 new translation keys (`Exit`, `Leave the match?`, `Keep playing`, `Leave`, `Leaving counts as a loss.`, `Exit menu`, `Exit menu (Start)`, `✕ Exit · camera · replay · sound · scoreboard · these tips`, and the updated `kontroller.html` / `helpkeys.js` strings) across all 7 locale files (`de.js`, `es.js`, `fr.js`, `it.js`, `nl.js`, `pt.js`, `tr.js`), using the exact required Turkish translations in `src/locales/tr.js` (`"Maçtan çıkılsın mı?"`, `"Oynamaya devam et"`, `"Çık"`, `"Çıkmak yenilgi sayılır."`, `"Çıkış"`).
- Removed the 13 obsolete keys (`PAUSED`, `Main menu`, `Resume`, `Pause`, `pause`, `pause (Start)`, etc.) from all 7 locale files.
- Regenerated `data/i18n-keys.json` via `node tools/extract-keys.js` (`1039 keys -> data/i18n-keys.json`).

### 6. `test/mobile_gamepad.test.js`
- Added unit test `mountTouch: top bar omits pause button and coach tips reference ✕ Exit` verifying that the touch top bar no longer renders a `Pause` button (`data-k="Escape"`) and that `.tt-top` displays the `✕ Exit` tip.

---

## Verification Output

### `node tools/extract-keys.js && node --test test/i18n-keys.test.js test/mobile_gamepad.test.js`
```text
1039 keys -> data/i18n-keys.json
✔ de: 1039 keys, 0 missing, 0 unused, placeholders match (31.592023ms)
✔ es: 1039 keys, 0 missing, 0 unused, placeholders match (4.307503ms)
✔ fr: 1039 keys, 0 missing, 0 unused, placeholders match (3.733071ms)
✔ it: 1039 keys, 0 missing, 0 unused, placeholders match (4.426706ms)
✔ nl: 1039 keys, 0 missing, 0 unused, placeholders match (3.658487ms)
✔ pt: 1039 keys, 0 missing, 0 unused, placeholders match (4.205456ms)
✔ tr: 1039 keys, 0 missing, 0 unused, placeholders match (3.730268ms)
✔ every key has a non-empty string translation in all 7 locales (3.11284ms)
✔ mountTouch: top bar omits pause button and coach tips reference ✕ Exit (1.132831ms)
ℹ tests 13
ℹ pass 13
ℹ fail 0
```

### `npm test` (note on concurrent `server/` / `test/server.test.js` work)
- All 246 non-server tests across the test suite pass (`0 fail`).
- Note for Opus: `server/server.js` currently has `LIMITS.roomsPerIp = 2` while `test/server.test.js` lines 597 (`a room counts for its creator after they leave`) and 820 (`quick: joins the longest-waiting matching public room`) open 3 rooms from the same IP without overriding `roomsPerIp`, causing `test/server.test.js` to hang on `c.next('lobby')` (and line 846 in `auto rooms start themselves` fails with a timestamp vs `null`). Per task rules (`server/ dosyalarına dokunma`), neither `server/` nor `test/server.test.js` was modified.

### `npx vite build` (last lines)
```text
dist/assets/it-DCYyuvYD.js                       61.88 kB │ gzip:  24.53 kB
dist/assets/es-BbaVacS5.js                       62.12 kB │ gzip:  25.03 kB
dist/assets/fr-BY5nyyM3.js                       62.68 kB │ gzip:  25.00 kB
dist/assets/main-DeFdUh_G.js                    991.50 kB │ gzip: 279.55 kB
✓ built in 3.63s
```

### Visual / Browser Verification Note
- No browser / screenshot tool is available in this CLI environment (`allowed shell commands: ls, cat, find, grep, node, npm test, npx vite build, wc, sed`), so live browser screenshots could not be captured (`agents/reports/agy-28/` was not created) and visual verification in a headless/GUI browser was not performed. Layout rules (`#exitBtn` at `top: 10px`, `#hud` shifted to `top: calc(max(10px, env(safe-area-inset-top)) + 52px)`, `#help[data-pos="tl"]` and `#tutorial` at `top: 180px`) and DOM behavior were verified via static inspection, unit tests, and `npx vite build`.
