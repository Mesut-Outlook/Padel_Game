# Padel Legends — agent notes

- Plain ES modules, no framework. `src/game.js`, `physics.js`, `rules.js`, `ai.js` are shared with `server/server.js` — keep them free of DOM/three imports.
- Coordinates: x across (±5), z along (±10), net z=0, y up. Team 0 (players 0,1) defends z>0, team 1 (2,3) z<0. Singles uses players 0 and 2.
- Input shape everywhere: `{ move:[x,z], swing:null|'auto'|shot, aim:-1..1 }`. Snapshot: `{t,s,b,pl:[[x,z,facing,anim,swingAnim,swingT,backhand]]}`.
- Tests: `npm test` (node:test, no framework). Add one test per rule/physics change.
- Characters: Quaternius UE-style 65-bone rig (`hand_r`, `spine_02`, `thigh_l`…). Animation clips come from `public/assets/anims/UAL1_Standard.glb`; only quaternion tracks are used so body-shape bone scales survive. Clothing is painted in `kitMaterial()` from bind-pose height.
- Target hardware: Intel HD 620 — keep pixelRatio ≤1.25, one shadow-casting light, textures ≤1024px.
- Agents: Opus coordinates/reviews; Sonnet for modules, Haiku for data; Antigravity via `agy -p "<task>" --model gemini-4-argon-high --mode plan`, tasks in `agents/tasks/`, reports in `agents/reports/`. Antigravity IDE may also edit the repo concurrently — re-read files before editing.
- rea MCP is registered for Claude Code and Antigravity (`npx rea-agents setup`). Behaviour-only analysis; never copy code/assets from analysed games. Findings go to `docs/re-findings.md`.
