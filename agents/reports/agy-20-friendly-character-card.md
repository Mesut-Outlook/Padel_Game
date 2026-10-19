# agy-20: Friendly Karakter Kartı (Güçlü/Zayıf Yanlar + Oyun İpucu)

## Summary of Implementation

Implemented the Friendly match character card feature per spec `docs/superpowers/specs/2026-10-19-career-progression-design.md` §9 and task `agents/tasks/agy-20-friendly-character-card.md`.

1. **Pure Module (`src/charcard.js`)**:
   - `STAT_ORDER`: `['speed', 'power', 'control', 'volley', 'smash', 'stamina']`.
   - `STAT_NAMES`: Human-readable capitalized labels (`Speed`, `Power`, `Control`, `Volley`, `Smash`, `Stamina`).
   - `STRENGTH_TIPS`: Short actionable advice for player's top stat (`speed` → `chase every ball down`, `power` → `go for winners with hard drives`, `control` → `place the ball into the corners`, `volley` → `take the net early`, `smash` → `finish at the net`, `stamina` → `wear them down in long rallies`).
   - `WEAKNESS_TIPS`: Short actionable advice to cover player's weakest stat (`speed` → `stay central and let your partner cover`, `power` → `play for placement, not pace`, `control` → `keep rallies short`, `volley` → `let the ball bounce off the glass`, `smash` → `play a bandeja instead of a full smash`, `stamina` → `keep points short and eat at changeovers`).
   - `charCard(stats)`: Evaluates stats array. Strengths are top 2 stats descending, with stable sort tie-breaking following `STAT_ORDER`. Weakness is the lowest stat among remaining stats not in strengths, with tie-breaking picking the earlier stat in `STAT_ORDER`. Returns `{ strengths, weakness, tip }` where `tip` follows the required format: `"<Strongest Name> <Val> · <Weakest Name> <Val> — <strength suggestion>, <weakness suggestion>"`.

2. **Menu Character Info Panel Integration (`src/menu.js`)**:
   - Added `STAMINA` row to stat list via `statRow('STAMINA', s.stamina || 6)`.
   - Added strength pills (`💪 SMASH 9`, `💪 VOLLEY 8`) and weakness pill (`⚠ CONTROL 5`) using existing `.pl-meta-pill` class.
   - Added formatted `tip` line using `.pl-card-sub`.
   - Added `Build your own player in Career →` action button setting `location.hash = '#career'`.
   - Uses `escapeHtml` for safe rendering of player name and tip text.
   - Character card updates dynamically whenever character selection changes via keyboard, gamepad, or mouse.

3. **Isolated Scope**:
   - Maintained strict isolation: did not touch `src/main.js`, `src/input.js`, `src/careerui.js`, or `index.html`.

---

## Changed Files & Exported Functions

- `src/charcard.js`:
  - `STAT_ORDER`
  - `STAT_NAMES`
  - `STRENGTH_TIPS`
  - `WEAKNESS_TIPS`
  - `charCard(stats)`
- `src/menu.js`:
  - `initMenu` (updated `#pl-char-info` card rendering and added `#pl-to-career-btn` handler)
- `test/charcard.test.js`:
  - Tests `charCard` selection of top 2 strengths and lowest weakness.
  - Tests tie-breaking behavior preserving `STAT_ORDER`.
  - Tests tip string format matching specification.
  - Tests all 26 roster characters in `data/characters.json` produce valid cards and non-empty tips.

---

## Test & Build Verification

### `npm test` Output (Last lines)
```
✔ charCard: selects top 2 strengths and lowest weakness (0.741005ms)
✔ charCard: tie-breaking respects STAT_ORDER (speed, power, control, volley, smash, stamina) (0.334057ms)
✔ charCard: tip string format matches specification (0.245229ms)
✔ charCard: produces valid strengths, weakness, and non-empty tip for all roster characters (1.751682ms)
...
ℹ tests 171
ℹ suites 0
ℹ pass 171
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4710.482182
```

### `npx vite build` Output (Last lines)
```
dist/tools/padtest.html            2.27 kB │ gzip:   1.02 kB
dist/index.html                   83.72 kB │ gzip:  16.42 kB
dist/assets/padtest-BTU__seH.js    2.15 kB │ gzip:   1.13 kB
dist/assets/input-DWr3VDEY.js      3.14 kB │ gzip:   1.49 kB
dist/assets/main-CwmLMB2-.js     940.47 kB │ gzip: 264.64 kB
✓ built in 4.37s
```
