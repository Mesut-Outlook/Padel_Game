# agy-21: Telefon / Tablette Yatay + Xbox / PlayStation Kumandası ile Oynama

## Summary of Completed Tasks

Implemented all 6 items specified in `agents/tasks/agy-21-mobile-gamepad.md` for seamless mobile & tablet landscape gameplay with Bluetooth Xbox & PlayStation controllers:

1. **Touch Controls Hidden When Gamepad Active (`src/main.js`, `index.html`)**:
   - In `padButtonDown()`, when gamepad buttons or stick movements are detected, `device` becomes `'pad'`. On touch screens (`isTouch()`), `document.body.classList.add('pad')` is added and `$('touchUi').hidden = true`.
   - On screen touch (`pointerdown`), `document.body.classList.remove('pad')` restores the touch stick and touch buttons (`#touchUi.hidden = false` during an active match).
   - In `index.html` CSS: modified `body.touch:not(.pad) #help, body.touch:not(.pad) #cam kbd, body.touch:not(.pad) #shotHint kbd { display: none !important; }`. When `body.touch.pad` is active, key and controller button prompts (shot hints, `#cam` view switch badge, and control help) become visible on mobile.
   - `#touchUi` starts hidden if `body.classList.contains('pad')` when starting a match in `setupScene`.

2. **Food / Nutrition Offer Box Action Label (`src/touch.js`, `src/main.js`)**:
   - Exported pure helper `offerKeyLabel({ pid, humans, device, control, touch })` in `src/touch.js`.
   - On touch devices, if gamepad is active (`device === 'pad'`, player 2 on pad, or control set to `'pad'`), renders `padText('LT')` (`LT` on Xbox, `L2` on PlayStation).
   - Only displays `'tap'` when gamepad is not in use on a touch device. Displays `'E'` on desktop keyboard.
   - When switching between keyboard/touch and gamepad during active offers, `renderOffers()` re-renders dynamically.

3. **Screen Wake Lock API (`src/wakelock.js`, `src/main.js`)**:
   - Created `src/wakelock.js` providing `keepAwake(on)` and `isKeepAwakeActive()`.
   - Requests `navigator.wakeLock.request('screen')` on match start (`setupScene` and `startOnline`).
   - Automatically releases lock on match finish (`handleEvents` with `winner != null`) and on returning to menu (`toMenu()`).
   - Handles tab visibility changes via `visibilitychange` to reacquire lock when tab regains focus during an active match. Wrapped in `try/catch` with safe fallbacks when API is unsupported.

4. **Audio Unlock & Unmute Notification Badge (`src/audio.js`, `src/main.js`, `index.html`)**:
   - In `src/audio.js`, added one-time global listeners for `pointerdown`, `touchend`, and `keydown` to call `unlockAudio()`.
   - Exported `isAudioSuspended()` returning `!ctx || ctx.state === 'suspended'`.
   - Added `#unmuteBadge` button (`🔇 Tap for sound`) in `index.html`.
   - When a match starts without prior touch interaction (e.g. launching with Bluetooth controller only), `updateUnmuteBadge()` surfaces `#unmuteBadge`.
   - Tapping `#unmuteBadge` (or anywhere on screen) resumes `AudioContext` and hides the badge immediately.

5. **Fullscreen Web App Mode & Manifest (`public/manifest.webmanifest`, `index.html`, `public/icon-*.png`)**:
   - Created `public/manifest.webmanifest` with `name: "Padel Legends"`, `short_name: "Padel"`, `display: "fullscreen"`, `orientation: "landscape"`, `background_color: "#0b1520"`, `theme_color: "#0b1520"`, and icon entries.
   - Generated clean PNG icons: `public/icon-192.png` (192x192) and `public/icon-512.png` (512x512) with `#0b1520` background and neon padel ball graphics.
   - In `index.html` `<head>`, added:
     - `<meta name="theme-color" content="#0b1520">`
     - `<meta name="apple-mobile-web-app-capable" content="yes">`
     - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
     - `<meta name="apple-mobile-web-app-title" content="Padel Legends">`
     - `<link rel="manifest" href="manifest.webmanifest">`
     - `<link rel="apple-touch-icon" href="icon-192.png">`

6. **Controller Help Text (`src/helpkeys.js`)**:
   - In `src/helpkeys.js` (`hk-foot` pad-only span), added the instruction:
     `Phone or tablet: pair an Xbox or PlayStation controller over Bluetooth, then press any button · 2 players: keyboard + a pad, or a pad each · `

---

## Changed Files & Functions / Symbols

- `src/wakelock.js`:
  - `keepAwake`
  - `isKeepAwakeActive`
- `src/touch.js`:
  - `isTouch`
  - `offerKeyLabel`
- `src/audio.js`:
  - `unlockAudio`
  - `isAudioSuspended`
- `src/helpkeys.js`:
  - `mountKeyHelp`
- `src/main.js`:
  - `setupScene`
  - `startOnline`
  - `toMenu`
  - `handleEvents`
  - `renderOffers`
  - `padButtonDown`
  - `updateUnmuteBadge`
- `index.html`:
  - Added manifest link, theme-color, and iOS meta tags in `<head>`.
  - Added `#unmuteBadge` element and styles.
  - Updated `body.touch:not(.pad)` CSS rules to display pad hints when `body.touch.pad` is active.
- `public/manifest.webmanifest`: PWA manifest.
- `public/icon-192.png`, `public/icon-512.png`: PWA icons.
- `test/mobile_gamepad.test.js`: Unit tests for `offerKeyLabel`, `keepAwake`, `isAudioSuspended`.

---

## Testing & Verification

1. **Unit Testing (`npm test`)**:
   - `test/mobile_gamepad.test.js`: Verified `offerKeyLabel` returns `'tap'` on touch with no pad, and `padText('LT')` when gamepad is active, as well as `'E'` on desktop keyboard. Verified `keepAwake` state transitions and `isAudioSuspended` response.
   - All 175 tests pass without regressions.
2. **Production Build (`npx vite build`)**:
   - Build succeeds; `manifest.webmanifest`, `icon-192.png`, and `icon-512.png` are copied into `dist/`.
3. **Manual Simulation**:
   - Desktop with `?touch`: touch controls appear; on simulated pad activation, `#touchUi` hides and `body.pad` enables prompts; clicking on screen clears `pad` and restores `#touchUi`. (Physical gamepad verification on mobile devices to be confirmed by user on actual hardware).

### `npm test` Output (Last lines)
```
✔ offerKeyLabel: returns tap on touch devices only when pad is not active (2.239967ms)
✔ offerKeyLabel: returns E or LT on non-touch devices (0.746538ms)
✔ wakelock: keepAwake toggles active state cleanly in headless environments (0.395216ms)
✔ audio: isAudioSuspended returns boolean (0.237955ms)
...
ℹ tests 175
ℹ suites 0
ℹ pass 175
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3402.449379
```

### `npx vite build` Output (Last lines)
```
dist/tools/padtest.html            2.27 kB │ gzip:   1.02 kB
dist/index.html                   85.18 kB │ gzip:  16.75 kB
dist/assets/padtest-BTU__seH.js    2.15 kB │ gzip:   1.13 kB
dist/assets/input-DWr3VDEY.js      3.14 kB │ gzip:   1.49 kB
dist/assets/main-BKshzA_k.js     939.42 kB │ gzip: 264.07 kB
✓ built in 3.22s
```
