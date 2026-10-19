# agy-19: Career Polish & Fixes Package (Kariyer Küçük İşleri / İnce Düzeltmeler)

## Summary of Completed Fixes

This package addresses all 11 items identified during the senior review of Career Mode and related online/match systems:

1. **Tournament Forfeit on Mid-Match Quit (`src/main.js` `toMenu`)**:
   - Quitting during an active match (`world?.match.winner == null && (world || net)`) with an active `onEnd` callback now calls `onEnd` with a forfeit loss (`won: false`, games `[0, 6]`, points `[0, 16]`, score text `'0-6 0-6 (forfeit)'` or `'0-16 (forfeit)'`).
   - Tournaments now record the defeat, advance other matches via `simulateOthers`, and prevent replaying the abandoned match.

2. **Template Character AI Clone Excluded (`src/career.js`, `src/careerui.js`)**:
   - `newProfile(template, look)` now saves `templateId: template.id` in `profile.player`.
   - `worldRanking(profile, aiTable)` filters out entries matching `templateId` or the player's name so Carlos/template never appears as an AI rival in world rankings.
   - Introduced `availablePartners(profile)` in `src/careerui.js` which filters out the player's template character and name from friendly partner selection (`renderPlayScreen`), friendly opponent pools (`startMatch`), tournament partner selection (`renderTournamentPartnerScreen`), and tournament entrants pool (`startTournament`).

3. **Scoreboard Grid Template `repeat(0, ...)` Guard (`src/main.js` `renderHud`)**:
   - Replaced `grid.style.gridTemplateColumns = \`14px auto repeat(${n}, 34px) 48px\`` with `${n > 0 ? \`repeat(${n}, 34px) \` : ''}`.
   - When sets length is 0 (rally scoring mode), produces valid CSS `14px auto 48px` without throwing syntax errors or breaking grid display.

4. **Shop Error Messages Cleaned (`src/careerui.js` `renderShopScreen`)**:
   - Removed raw internal reason codes `(owned)`, `(tier):`, `(credits):` from user-facing strings.
   - Now renders clean messages: `Already owned.`, `Locked: Unlocks at [tier] — [N] ranking pts`, `Not enough Credits: Need [N] more Credits`.

5. **16-Pair Knockout Tournament Duplicate AI in Same Match Fixed (`src/careerui.js` `startTournament`)**:
   - Pairs 0..11 are composed from 24 distinct characters without repeating. Pairs 12..14 combine disparate character indices.
   - A verification check against `testT.rounds[0]` confirms that no Round 1 match has intersecting members between side `a` and side `b` (both sides of the net).
   - Added unit test in `test/tournament.test.js` validating 0 duplicate AI members across round 1 matches.

6. **Online Room Form Visibility & Stuck Screen on Connection Error Fixed (`src/careerui.js` `setOnlineStatus`, `src/main.js` `startOnline`)**:
   - `setOnlineStatus(text, lobby, err)` now resets `onlineState.net = null` and `onlineState.lobby = null` when an error occurs or when the connection fails.
   - Re-renders `renderOnlineScreen()` so `joined` evaluates to false: Public rooms, Create room, and Join by code forms remain visible and interactive alongside the error banner.

7. **Remote Player Racket Visuals Preserved (`server/server.js`, `src/main.js`, `src/careerui.js`)**:
   - `server/server.js` `sanitizeLook(l)` now sanitizes and preserves `racket`, `racketColor`, and `racketShape`.
   - `src/careerui.js` `joinOnlineRoom` bundles `racket: myRacket.id, racketColor: myRacket.color, racketShape: myRacket.shape` inside `look`.
   - `src/main.js` `startOnline` reads `lk.racket`, `lk.racketColor`, and `lk.racketShape` to configure remote player avatars instead of defaulting to dummy index `rackets[id % rackets.length]`.
   - Added unit test in `test/server.test.js` verifying racket properties are whitelisted and preserved.

8. **Solo Online Match Against Bots Multiplier Fixed (`src/main.js` `handleEvents`)**:
   - In `onEnd && net`, checks `(net.lobby?.taken?.length || 0) > 1 ? 'online' : (net.lobby?.cfg?.ai || 'club')`.
   - Solo players in custom online rooms playing against AI bots now receive the normal bot difficulty multiplier instead of the inflated `x1.2` online bonus.

9. **Reward Box Vertical Margin Adjusted (`index.html`)**:
   - Changed `.cr-reward-box` from `margin: auto;` to `margin: 16px auto;` for predictable layout and vertical spacing without erratic gaps.

10. **Lobby & Profile Security & HTML Escaping (`src/main.js`, `src/careerui.js`)**:
    - Ensured `l.code` is sanitized with `escapeText` in lobby notifications.
    - Profile names and status strings remain safely handled without unescaped HTML injections.

11. **Game Speed & Control Synchronization in Career Matches (`src/main.js` `startMatch`, `startOnline`)**:
    - `startMatch` and `startOnline` now read DOM select elements `$('speed')` / `$('control')` if present, falling back to `loadSettings()`.

---

## Changed Files & Verification

- `src/career.js`: `newProfile` saves `templateId`; `worldRanking` filters out template clone.
- `src/careerui.js`: `availablePartners` helper, partner grids & pools, shop error strings, clean tournament draw generation, online error reset & racket look passing.
- `src/main.js`: forfeit handling on quit in `toMenu()`, scoreboard grid `repeat(0)` guard, remote racket look in `startOnline`, online solo bot multiplier check, input settings sync.
- `server/server.js`: `sanitizeLook` whitelists and preserves `racket`, `racketColor`, `racketShape`.
- `index.html`: `.cr-reward-box` margin changed to `16px auto`.
- `test/career.test.js`: test verifying template clone exclusion in `worldRanking`.
- `test/server.test.js`: test verifying racket look sanitization in WebSocket join.
- `test/tournament.test.js`: test verifying 0 member clashes in round 1 for 16-pair knockout draws.

### Test Results
- `npm test`: 124 tests pass (0 failures).
- `npx vite build`: build succeeds (dist artifacts generated cleanly).
