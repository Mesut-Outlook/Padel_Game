# Agents

Read `CLAUDE.md` — it is the shared guide for every agent (Claude, Antigravity/Gemini, others). Key rules:

1. Shared simulation files (`src/game.js`, `physics.js`, `rules.js`, `ai.js`) run on the server too: no DOM or three.js imports there.
2. Run `npm test` after any change; add a test for new rules or physics.
3. Claude Opus reviews Antigravity work: put task results in `agents/reports/<task-id>.md` and list changed files there.
4. Never copy code or assets from commercial games; rea is for behaviour analysis only.

## Task Status

| Task | Topic | Report | Status |
|---|---|---|---|
| `agy-01` | Padel research & asset guide | `agents/reports/agy-01-research.md` | Completed |
| `agy-02` | Balance simulator & FIP bounce | `agents/reports/agy-02-balance-sim.md` | Completed |
| `agy-03` | Rules verification | `agents/reports/agy-03-rule-verification.md` | Completed |
| `agy-04` | 3D visual menu & player preview | `agents/reports/agy-04-menu.md` | Completed |
| `agy-05` | FIP court doors & door padding | `agents/reports/agy-05-court-doors.md` | Completed |
| `agy-06` | Pause menu fixes (DOM churn & restart) | `agents/reports/agy-06-pause-menu.md` | Completed |
| `agy-07` | Smash slow-mo, banner/sfx, music, English UI | `agents/reports/agy-07-smash-english-audio.md` | Completed (`d40bd89`) |
| `agy-08` | Full-body procedural strokes + `tools/posetest.html` | `agents/reports/agy-08-fullbody-strokes.md` | Completed, Opus fixes (bone reset, crouch knob) |
| `agy-09` | Crowd reactions, 3D stand wave, motivational callouts & style rewards | `agents/reports/agy-09-crowd-hype-rewards.md` | Completed |


