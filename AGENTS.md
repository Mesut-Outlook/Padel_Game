# Agents

Read `CLAUDE.md` — it is the shared guide for every agent (Claude, Antigravity/Gemini, others). Key rules:

1. Shared simulation files (`src/game.js`, `physics.js`, `rules.js`, `ai.js`) run on the server too: no DOM or three.js imports there.
2. Run `npm test` after any change; add a test for new rules or physics.
3. Claude Opus reviews Antigravity work: put task results in `agents/reports/<task-id>.md` and list changed files there.
4. Never copy code or assets from commercial games; rea is for behaviour analysis only.
