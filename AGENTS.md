# Agents

Read `CLAUDE.md` — it is the shared guide for every agent (Claude, Antigravity/Gemini, others). Key rules:

1. Shared simulation files (`src/game.js`, `physics.js`, `rules.js`, `ai.js`) run on the server too: no DOM or three.js imports there.
2. Run `npm test` after any change; add a test for new rules or physics.
3. Claude Opus reviews Antigravity work: put task results in `agents/reports/<task-id>.md` and list changed files there.
4. Never copy code or assets from commercial games; rea is for behaviour analysis only.
5. Roles (user, 2026-10-19 and 2026-10-21): Claude Opus is the manager and senior developer. Work Antigravity can do goes to Antigravity (task file in `agents/tasks/`); Claude Sonnet 5.5 subagents take well-specified modules and Claude Haiku 5.5 subagents take data or mechanical edits whenever useful. Opus keeps game rules, physics, shared client/server code and server work, reviews everything, and is the only one who commits and pushes.
6. Online server (user, 2026-11-01): the home Raspberry Pi 3 is the planned host, Hetzner stays postponed. Status: `docs/online-server.md` "Raspberry Pi". Server work stays with Opus. Never write the Pi's addresses, username or the home IP in tracked files.

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
| `agy-24` | Skor tablosu sol üst, yardım sağ üst, kamera rozeti sağ alt + Friendly seçimleri hatırlansın (`padel.friendly.v1`) | `agents/reports/agy-24-hud-layout-remember-picks.md` | Completed, Opus reviewed (help corner key bumped to `padel.helpPos.v2`: the old key was written on every mount, so nobody would have seen the new default) |
| `agy-26` | Canlı lobi tasarımına görüş (salt okunur) | `agents/reports/agy-26-lobby-design-review.md` | Completed, Opus verified every claim (the career-tournament crash with 9 players was real) |
| `agy-27` | Oyuncu duruşları: önizleme ve portre kartları | `agents/reports/agy-27-stances.md` | Completed, Opus reviewed (portraits use the head-up `Idle_Loop` so front stances look into the lens; the turn sign flipped to screen-right; the same-character preview path no longer resets drag/idle) |
| `agy-25` | Seyircilerin sahaya bakacak şekilde yönlendirilmesi (kullanıcı fotoğrafı referanslı) | `agents/reports/agy-25-crowd-facing.md` | Completed, Opus reviewed (cards turned to the court instead of camera billboards; review: the yaw moved to `crowdYaw()` in crowdplan.js so the test checks the real code) |
| `agy-28` | ✕ Exit düğmesi ve "Leave the match?" penceresi | `agents/reports/agy-28-exit-button.md` | Completed, Opus reviewed (online Leave sends `leave`, Team up AI seats get avatars) |
| `agy-29` | Açık renk tema (maç dışı ekranlar) | `agents/reports/agy-29-light-theme.md` | Completed, Opus reviewed (match overlays keep white text: the HUD team names had turned dark on dark) |
| `agy-30` | Ana sayfa = canlı lobi (görsel düzen) | `agents/reports/agy-30-home-live-lobby.md` | Completed, Opus reviewed and wired (PLAY NOW / Invite / Join → `playNow`, the open list polls a trusted server every 4 s, an invite link joins with no menus) |
