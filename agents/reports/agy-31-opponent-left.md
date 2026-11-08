# Report: agy-31 — Rakip çıkınca: "Continue vs AI / Back to lobby"

## Changed Files & Functions

### 1. `src/lobbyview.js`
- **`aloneOnline(l, seat = null, leftSeat = null)`**:
  - Pure function that inspects the lobby state `l.taken` to determine if no other human players remain in the match.
  - Takes `seat` (own seat) and optional `leftSeat` (the seat of the player who just left via `onLeft` before the server's updated lobby state arrives).
  - Returns `true` only when the remaining human seats in `taken` contain solely `seat` (or at most one player if `seat` is omitted). Returns `false` if `l` is invalid, if `seat` is not in `taken`, or if other human seats are still taken.

### 2. `test/lobbyview.test.js`
- Imported `aloneOnline`.
- Added unit test suite `aloneOnline: true only when no other human players remain in the match`:
  - Verifies invalid/empty lobbies (`null`, `{}`, `taken: []`, seat not in taken) return `false`.
  - Verifies single human in room (`taken: [0]`, seat `0`) returns `true`.
  - Verifies multiple humans (`taken: [0, 2]`) returns `false`.
  - Verifies `leftSeat` handling: `aloneOnline({ taken: [0, 2] }, 0, 2)` returns `true` (opponent left, only player 0 remains).
  - Verifies doubles with 3+ humans: `aloneOnline({ taken: [0, 1, 2] }, 0, 2)` returns `false` (player 1 is still present).

### 3. `index.html`
- **CSS**:
  - Updated `#pause` styles to also target `#leftCard` (`#pause, #leftCard`, `.pz-card`, `.pz-title`, `.pz-item`, `.pz-item.sel`, `.pz-hint`).
  - Same visual design family as `#pause` without `backdrop-filter`.
- **HTML**:
  - Added `<div id="leftCard" hidden><div class="pz-card"><div class="pz-title" id="lcTitle"></div><div id="lcItems"></div></div></div>` right after `#pause`.

### 4. `src/main.js`
- **Imports**:
  - Added `aloneOnline` from `./lobbyview.js`.
- **`startOnline()`**:
  - Added `pendingLeft` tracking for handling race/ordering between `left` and `lobby` WebSocket messages.
  - In `onLeft({ seat, name })`:
    - Checks if in an active match (`me.lobby?.started || avatars.length`).
    - If `aloneOnline(me.lobby, me.seat, seat)` is `true`: calls `showLeftCard(leftName)`.
    - Else if other human players definitely remain in `taken`: calls `flash(t('{name} left the match. The AI plays for them.', { name: leftName }), 4)` (card does NOT open).
    - Else saves `pendingLeft = { seat, name: leftName }` to resolve when `lobby` arrives immediately next.
  - In `onLobby(l)`:
    - If `pendingLeft` is waiting: checks `aloneOnline(l, me.seat)`. If alone, opens `showLeftCard(pendingLeft.name)`; otherwise shows `flash(...)`.
- **`showLeftCard(name)` & `hideLeftCard()`**:
  - `showLeftCard`: sets `leftCardName`, resets selection `leftCardSel = 0`, calls `drawLeftCard()`, unhides `#leftCard`, arms edge guards for gamepad buttons, and clears pressed inputs.
  - `hideLeftCard`: hides `#leftCard`, sets `leftCardOpen = false`, clears pressed inputs.
- **`drawLeftCard()` & `updateLeftCardSel()` & `leftCardItems()`**:
  - Sets `titleEl.textContent = t('{name} left the match.', { name: leftCardName })` (using `textContent` to strictly prevent XSS from opponent names).
  - Generates two buttons in `#lcItems`:
    1. `Continue vs AI` -> `hideLeftCard()` (closes card, match continues)
    2. `Back to lobby` -> `toMenu()`
  - Handles mouse clicks and hover (`onmousemove`) selection updates.
  - Outside click on `#leftCard` backdrop dismisses the card (`hideLeftCard()`).
- **`leftCardInput()`**:
  - Keyboard navigation: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD` select between buttons.
  - Gamepad navigation: D-pad / left stick horizontal (`dx`) and vertical (`dy`) with auto-repeat.
  - Confirmation: `Enter`, `Space`, gamepad `A` (button 0) confirms the selected button.
  - Dismiss: `Escape`, `Pause`, gamepad `B` (button 1), gamepad `Start` (button 9) triggers "Continue vs AI" (`hideLeftCard()`).
- **`loop(now)`**:
  - When `leftCardOpen`: calls `leftCardInput()`.
  - Online match simulation and rendering continue uninterrupted behind the card (`net.view()`, avatars update, ball physics).
  - While `leftCardOpen`: sends neutral movement `{ move: [0, 0], swing: null, aim: 0 }` so player does not run around while navigating card.
  - Closes card automatically if the match ends (`over && leftCardOpen`).
- **`setPaused(on)` / `toMenu()` / `setupScene()`**:
  - Added `hideLeftCard()` calls to clean up the card dialog whenever pause opens, leaving to menu, or setting up a new scene.

### 5. `src/locales/{de,es,fr,it,nl,pt,tr}.js` & `data/i18n-keys.json`
- Added the 3 required strings across all 7 locale files:
  1. `"{name} left the match."`:
     - `tr`: `"{name} maçtan ayrıldı."`
     - `de`: `"{name} hat das Match verlassen."`
     - `es`: `"{name} ha abandonado el partido."`
     - `fr`: `"{name} a quitté le match."`
     - `it`: `"{name} ha lasciato la partita."`
     - `nl`: `"{name} heeft de wedstrijd verlaten."`
     - `pt`: `"{name} saiu da partida."`
  2. `"Continue vs AI"`:
     - `tr`: `"AI'a karşı devam et"`
     - `de`: `"Weiter gegen KI"`
     - `es`: `"Continuar contra la IA"`
     - `fr`: `"Continuer contre l'IA"`
     - `it`: `"Continua contro l'IA"`
     - `nl`: `"Doorgaan tegen de AI"`
     - `pt`: `"Continuar contra a IA"`
  3. `"Back to lobby"`:
     - `tr`: `"Lobiye dön"`
     - `de`: `"Zurück zur Lobby"`
     - `es`: `"Volver al lobby"`
     - `fr`: `"Retour au lobby"`
     - `it`: `"Torna alla lobby"`
     - `nl`: `"Terug naar lobby"`
     - `pt`: `"Voltar ao lobby"`
- Extracted and updated keys via `node tools/extract-keys.js` (`1044 keys -> data/i18n-keys.json`).

---

## Test & Build Outputs

### `npm test`
```text
ℹ tests 293
ℹ suites 0
ℹ pass 293
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8020.687746
```

### `npx vite build`
```text
✓ 80 modules transformed.
dist/tools/padtest.html                             2.37 kB │ gzip:   1.04 kB
dist/privacy.html                                   6.10 kB │ gzip:   2.76 kB
dist/kontroller.html                               23.92 kB │ gzip:   6.15 kB
dist/index.html                                   104.93 kB │ gzip:  20.26 kB
dist/assets/modulepreload-polyfill-B5Qt9EMX.js      0.71 kB │ gzip:   0.40 kB
dist/assets/main-DAgix3V8.js                        0.83 kB │ gzip:   0.49 kB
dist/assets/padtest-B953dsqX.js                     2.20 kB │ gzip:   1.16 kB
dist/assets/input-CbguLTEv.js                       2.45 kB │ gzip:   1.18 kB
dist/assets/i18n-DPQj21u5.js                        3.05 kB │ gzip:   1.50 kB
dist/assets/controls-B-5LA3O4.js                    3.57 kB │ gzip:   1.77 kB
dist/assets/helpkeys-Dgfq0pYs.js                    9.47 kB │ gzip:   4.21 kB
dist/assets/tr-Buc9zyZh.js                         58.63 kB │ gzip:  25.01 kB
dist/assets/nl-ChismCEH.js                         60.87 kB │ gzip:  24.02 kB
dist/assets/pt-BS2_dn_2.js                         61.78 kB │ gzip:  24.77 kB
dist/assets/de-C-q9Rf1K.js                         61.85 kB │ gzip:  24.95 kB
dist/assets/it-C7CHLsRp.js                         62.02 kB │ gzip:  24.43 kB
dist/assets/es-BEWM_H_G.js                         62.30 kB │ gzip:  24.96 kB
dist/assets/fr-DwJ1Y9qB.js                         62.85 kB │ gzip:  24.92 kB
dist/assets/main-DQn6M5Lv.js                    1,002.69 kB │ gzip: 282.76 kB
✓ built in 4.13s
```

---

## What Was Tested

1. **Integration test with real WebSocket server & two clients**:
   - Spun up local server via `startServer(0, { countdownMs: 50 })`.
   - Connected client A (`Alice`) and client B (`Bob`) in a quick 2-player match.
   - Client A called `leave()`.
   - Client B received `onLeft({ seat: 0, name: 'Alice' })`.
   - Verified `aloneOnline(b.lobby, b.seat, 0)` returned `true`, triggering `showLeftCard('Alice')`.
   - Verified that when Alice left, Bob was alone and the card was shown with Alice's name (`cardShown=true, cardName=Alice`).

2. **Unit tests in `test/lobbyview.test.js`**:
   - Verified all cases of `aloneOnline`:
     - `aloneOnline({ taken: [0] }, 0)` -> `true`
     - `aloneOnline({ taken: [0, 2] }, 0)` -> `false`
     - `aloneOnline({ taken: [0, 2] }, 0, 2)` -> `true`
     - `aloneOnline({ taken: [0, 1, 2] }, 0, 2)` -> `false`
     - Invalid lobbies (`null`, `{}`, `taken: []`, seat not in taken) -> `false`.

3. **Manual multi-tab test statement**:
   - Tarayıcıda iki ayrı sekme açıp manuel olarak `?server=ws://localhost:8080` ile test edilmedi (GUI tarayıcı oturumu yerine doğrudan Node.js ortamında yerel WebSocket sunucusu ve iki gerçek istemci `connect()` ile uçtan uca otomatik test çalıştırılarak doğrulandı).
