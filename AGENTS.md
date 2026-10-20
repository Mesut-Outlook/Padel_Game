# Agents

Read `CLAUDE.md` — it is the shared guide for every agent (Claude, Antigravity/Gemini, others). Key rules:

1. Shared simulation files (`src/game.js`, `physics.js`, `rules.js`, `ai.js`) run on the server too: no DOM or three.js imports there.
2. Run `npm test` after any change; add a test for new rules or physics.
3. Claude Opus reviews Antigravity work: put task results in `agents/reports/<task-id>.md` and list changed files there.
4. Never copy code or assets from commercial games; rea is for behaviour analysis only.
5. Roles (user, 2026-10-19 and 2026-10-21): Claude Opus is the manager and senior developer. Work Antigravity can do goes to Antigravity (task file in `agents/tasks/`); Claude Sonnet 5.5 subagents take well-specified modules and Claude Haiku 5.5 subagents take data or mechanical edits whenever useful. Opus keeps game rules, physics, shared client/server code and server work, reviews everything, and is the only one who commits and pushes.

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
| `agy-09` | Crowd reactions, 3D stand wave, motivational callouts & style rewards | `agents/reports/agy-09-crowd-hype-rewards.md` | Completed, Opus reviewed |
| `agy-10` | Career Mode: Hub, Character Creator, Profile & Reward screens | `agents/reports/agy-10-career-hub.md` | Completed, Opus reviewed (partner grid fix) |
| `agy-11` | Career: Training, Shop, Locker; equipment into matches | `agents/reports/agy-11-career-shop.md` | Completed, Opus reviewed |
| `agy-12` | Career: Tournaments, tournament run, Ranking (done by a Sonnet subagent — agy quota) | `agents/reports/agy-12-career-tournaments.md` | Completed, Opus reviewed (partner fix) |
| `agy-13` | Career: Play Online (room list, create/join, looks) (Sonnet subagent — agy quota) | `agents/reports/agy-13-career-online.md` | Completed, Opus reviewed |
| `agy-14` | Jersey styles (polo, vneck, tank, patterns) & kit shop items | `agents/reports/agy-14-jerseys.md` | Completed, Opus reviewed (accents painted on the body, no tank armhole, side-seam panels, shallower sash, Kerim accent) |
| `agy-15` | Opening splash animation, HOME screen, settings modal & PS controller hints | `agents/reports/agy-15-splash-home.md` | Completed, Opus reviewed (wizard no longer disposed by HOME, Back from career, escaped name) |
| `agy-16` | Fullscreen toggle button (⛶), F in menus | `agents/reports/agy-16-fullscreen.md` | Completed, Opus reviewed (F is the slice shot in a match: menus only) |
| `agy-17` | Pause yalnızca Esc + tüm oyuncuların enerji çubukları | `agents/reports/agy-17-esc-pause-energy-hud.md` | Completed, Opus reviewed (energy rows = teams like the scoreboard, smash banner moved below the taller HUD) |
| `agy-18` | Sayı bildiriminde tek oyuncunun adı | `agents/reports/agy-18-point-call-player-name.md` | Completed, Opus reviewed (`pointcall.js` table instead of six copied branches) |
| `agy-19` | Career Polish & Fixes Package (forfeit on quit, template clone filter, clean 16-pair draw, online form recovery, remote racket, bot multiplier) | `agents/reports/agy-19-career-fixes.md` | Completed, Opus reviewed (a forfeit pays 0 Credits, otherwise quit-farming paid "Played") |
| `agy-20` | Friendly karakter kartı: güçlü/zayıf yanlar + oyun ipucu (`src/charcard.js`) | `agents/reports/agy-20-friendly-character-card.md` | Completed, Opus reviewed |
| `agy-21` | Telefon/tablet + Xbox/PS kumandası: pad varken dokunmatik kontroller gizli, ekran kararmaz, sesi aç rozeti, uygulama modu (manifest) | `agents/reports/agy-21-mobile-gamepad.md` | Completed, Opus reviewed (the `createFx` import was dropped — every match start crashed; duplicate audio-unlock listeners removed) |
| `agy-22` | Çok dil (8 dil), aşama 2: bütün arayüz metinlerini `t()` / `data-i18n` ile sar (`src/i18n.js`) | `agents/reports/agy-22-i18n-strings.md` | Completed, Opus reviewed (776 `t()` + 155 `data-i18n*`, wording kept; review: the coach tip had numbers inside the sentence, so `coachTip` now also returns `msg` template pieces — translated by `coachLine` in careerui.js) |
| `agy-23` | Gerçek insan görünümlü seyirciler (16 görünüş, 11'i kadın) + stadyum koltukları + 14 ülke bayrağı (`src/crowdatlas.js`, `crowdplan.js`, `flags.js`) | `agents/reports/agy-23-crowd.md` | Completed, Opus reviewed (debug hooks `?match=`, `?nocrowd`, `window.takeScreenshot/measureFps/switchVenue` removed from main.js/splash.js; the atlas renderer now drops its WebGL context; the atlas takes ~5 s on HD 620, the old crowd shows meanwhile) |
| `agy-24` | Skor tablosu sol üst, yardım sağ üst, kamera rozeti sağ alt + Friendly seçimleri hatırlansın (`padel.friendly.v1`) | `agents/reports/agy-24-hud-layout-remember-picks.md` | Completed |
