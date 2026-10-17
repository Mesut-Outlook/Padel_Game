# Task Report: agy-09 — Realistic Crowd Reactions, Motivational Callouts & Style Rewards

## Changed Files
- `src/audio.js`: Added `sfxCrowdReact('gasp' | 'roar')` for deep-rally gasps and big-winner/marathon-rally stadium roars, plus `sfxReward(tier)` harmonic D-major/Dorian chime for style points and medal unlocks.
- `src/court.js`: Added zero-extra-draw-call 3D spectator bounce/wave animation (`venueGroup.userData.exciteCrowd(intensity)` and `venueGroup.userData.updateCrowd(dt)`) on existing `InstancedMesh` spectator groups, returning immediately (`0ms`) when idle.
- `index.html`: Added `.hud-style` footer bar inside `#hud` (`STYLE 0 PTS`, `🔥 x1.5 / x2.0 ON FIRE` streak badge, earned medal icons), `#hypeToast` micro-callout pill below the scoreboard, and `.msg-kicker` / `.msg-sub` broadcast styling for point-end motivational headlines.
- `src/main.js`: Wired mid-rally micro-callouts, progressive crowd excitement (`6+` cheer, `10+` gasp, glass-save gasp, epic point roar), point-end motivational headlines (`👑 CLUTCH POINT!`, `🔥 MARATHON RALLY!`, `💥 UNSTOPPABLE WINNER!`, `🧱 GLASS MASTERPIECE!`, `⚡ CLEAN WINNER!`), streak multiplier (`x1.5` / `x2.0`), 4 match medals (`🧱 WALL WIZARD`, `⚡ SMASH MASTER`, `🔥 IRON LUNG`, `👑 CLUTCH KING`), and end-of-match style/medal summary.

## Design & Restraint Notes
- **No simulation / server impact**: Shared files (`src/game.js`, `src/physics.js`, `src/rules.js`, `src/ai.js`) are untouched.
- **No visual clutter**: Ordinary rallies and routine errors do not spam banners; micro-callouts appear as a compact pill right below `#hud` for `~0.95s` without obstructing the court or ball trajectory.
- **Intel HD 620 friendly**: 3D crowd wave reuses the existing 4 `InstancedMesh` draw calls and only updates instance matrices during the `~1.2s` celebration window.
