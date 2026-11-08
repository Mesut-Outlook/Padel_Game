# Scheduled games ("Maç takvimi") + Training on HOME — design

Date: 2026-11-08. Status: written up after a brainstorm with the user; the user said "olur sen ne dersen, durum göre sonra yeniden gözden geçiririz", so the calls marked **(Opus)** are Opus's and may be revisited.
Mockups (local, gitignored): `.superpowers/brainstorm/131969-1794171396/content/open-games-v2.html` (4 screens) and `home-v3.html` (HOME in a busy and an empty state).

## Why
The user wants people to play **each other**, not the AI, so the site gets traffic and grows. Online play went 24/7 on 2026-11-08 (home Pi behind Tailscale Funnel, `DEFAULT_SERVER`), but the HOME "Open games" box only lists rooms whose creator is waiting *right now*. With few players it is almost always empty, which looks like a dead site and misleads. Strangers need a way to agree on a time; friends already have the invite link (agy-28…, `showInvitePanel` in `main.js`).

## Goals
1. Anyone can post a game for a time up to 7 days ahead (day + time + Singles/Doubles + Team up/Face off). It is listed publicly on HOME.
2. Others can ask to join. The host approves or declines. Optionally the host lets anyone join without approval.
3. At the game's time the people who reserved meet in a waiting room; the match starts with whoever came; empty seats get the AI.
4. HOME never shows a misleading empty box: with nothing posted it invites the visitor to post the first game with one tap.
5. Training gets a prominent card right under PLAY NOW.

## Non-goals
- No accounts, logins, e-mail, push notifications or phone numbers (project privacy rule: collect no personal data; `privacy.html`).
- No chat between players.
- No ranking/ELO for scheduled games beyond what online matches already do.
- No recurring games ("every Tuesday").
- Friends do not need this: they keep using Invite a friend.

## Anti-goals (would be a failure even if it works)
- A box that claims games exist when nobody is there, or fake/AI listings to look busy.
- One visitor able to fill the calendar or block every time slot.
- The Pi overloaded at a popular hour so quick play / invites stop working.
- Storing anything that identifies a person beyond the nickname they typed.

## Constraints
- Server: `server/server.js` on a Raspberry Pi 3 (Node 22, 32-bit). Current caps: `LIMITS.rooms: 10` matches playing at once, `waiting: 30` unstarted rooms, `playingPerIp: 1`, `roomsPerIp: 2`, per-visitor keys are `ownerKey(ip)` (keyed HMAC, key lost on restart). Shared game code stays DOM-free.
- Pi capacity: at most 10 matches at once and ~6 Mbit/s upload for 10 (unmeasured). Scheduled games must leave room for quick play and invites.
- The Pi restarts (power, updates). The server process restarts on deploys.
- i18n: every new UI text through `t()` / `N_()`, added to all 7 locale tables (`test/i18n-keys.test.js`), one sentence per key, numbers as `{placeholders}`.
- Privacy: new data flow → `privacy.html` in the same commit. Never log IPs, names or codes (server logs only `join/leave seat=` and `status`).
- Target hardware Intel HD 620 for the client; HOME is DOM, not 3D, so fine.
- Security audit (`.claude/agents/security-auditor.md`) after the server part.

## How it works (decided)

### Posting a game (host)
- From HOME: "＋ Post a game" opens a sheet (mockup screen 2): 7 day chips (today … +6), time buttons every 30 minutes, Singles/Doubles, Team up/Face off (doubles), toggle "Anyone can join without approval" (default off), nickname shown (the existing HOME name badge, `padel.onlineName`).
- One-tap shortcuts in the empty state: today 20:00 / 21:00 / 22:00 with the current Singles/Doubles pick (only future slots; after 22:00 show tomorrow's).
- Times are stored server-side as UTC instants; every viewer sees their own local time.
- **(Opus) Slot rules:** 30-minute slots. At most **8** scheduled games may start in the same slot (2 of the 10 match slots stay free for quick play and invites). A full slot is shown struck through; the sheet suggests the nearest free one.
- **(Opus)** One active posting per visitor key (posting again replaces nothing: they must delete the old one first). At most 7 days ahead, not in the past, not less than 15 minutes from now.
- **(Opus)** Total postings cap: 60 (memory/storage guard).

### Joining (guest)
- A listed game shows time, "in 2 h", host nickname, format, seat dots (taken / free). Button: "Ask to join" (approval on) or "Join" (approval off).
- Approval on: the request waits. The host sees it next to their posting (mockup screen 3) with the requester's nickname and level, ✓ / ✕. **(Opus)** Requests not answered by 1 hour before the start are accepted automatically (first come first served while seats last). If the host declines, the guest sees "Not accepted" on their row and can ask for another game.
- A guest may hold **(Opus)** at most 2 reservations/requests at once.
- A reserved row is highlighted ("Your seat is ready") with "📅 Add to calendar" (downloads a local `.ics` file generated in the browser; nothing is sent anywhere) and "Cancel".
- Guests and hosts are recognised on return by a random **reservation token** stored in their browser (`localStorage`), created when they post/ask. Same device + same browser = recognised. Clearing site data loses it (acceptable; say so in the UI help text).

### At the time (waiting room)
- From 10 minutes before the start, a reserved/host row shows "Enter". Entering opens the waiting room (mockup screen 4): who is here ✓, who is expected, countdown.
- The match starts at the scheduled time if at least 2 humans are present, else **(Opus)** it waits up to 3 minutes for more; then starts with whoever came and AI in empty seats. If only 1 human came after 3 minutes, they get the existing "Continue vs AI / Back to lobby" choice.
- The host (or, if absent, the first arrival) may press "Start now" once everyone expected has arrived.
- While waiting, the warm-up vs AI may run (same as Play now's `pend` flow).
- The match itself is a normal online room (`makeRoom`), so rejoin tokens, limits, `begin()`/`playingPerIp` all apply. Scheduled rooms count towards `rooms: 10` only once started.
- **(Opus)** A posting disappears 15 minutes after its start time (played or not) and immediately when the host deletes it. Deleting tells holders of reservations on their next visit ("The host cancelled this game").

### HOME layout (mockup `home-v3.html`)
- Right column "Open games" becomes **"Match calendar"**:
  - header: live dot + "N players on the site now" (server total of connected sockets in HOME/rooms; hidden when N ≤ 1),
  - a green "X is waiting now · Join" strip only when a real quick-play room is open (today's `openRooms`; several → the longest-waiting one + "+2 more"),
  - a 7-day strip with a count badge per day,
  - the selected day's games (default: the first day with games, else today),
  - empty day: "No games yet on this day" + post shortcuts; empty week: ball icon, "Be the first to post a game tonight", three time cards (the most-booked hour marked "Most popular" once there is data), "Pick another day or time →", and **(Opus)** "N games played this week" only when N ≥ 5.
- PLAY NOW gets a sub line that tells the truth: "X is waiting for you · start now" or "Warm up until someone joins".
- **Training card** right under PLAY NOW: blue card "🎓 Training · New here? Learn the shots in a few minutes" (`hm-btn-training` moves out of the bottom bar). **(Opus)** After the visitor has finished the tutorial once (existing tutorial completion flag, or add one), the card shrinks to a normal secondary button "Training again".
- Phones in portrait: the calendar stacks under the left column (existing responsive HOME rules, agy-34). Gamepad focus (`padnav.js`) must reach every new control.

### Persistence (Pi)
- Postings and reservations are kept in memory and written to a small JSON file on the Pi (atomic write: temp file + rename) on every change, reloaded on start, so a restart does not lose next week's games.
- **(Opus)** File holds only: posting id, UTC time, format, approval flag, host nickname + character index + level (as already sent for online looks), seats with nickname/char/level and a **hash of the reservation token** (never the token itself), request list, created-at. No IPs, no ownerKeys (they are per-restart anyway). Per-visitor posting limits that need the visitor key are in memory only (a restart resets them; acceptable).
- The service runs with `ProtectSystem=strict`; the file needs a writable state dir: `StateDirectory=padel` in `padel.service` (→ `/var/lib/padel`), path passed as env `PADEL_STATE=/var/lib/padel/schedule.json`. This needs the user's sudo once (update `padel-247.sh`/`padel-update.sh` and the service unit).

### Protocol (sketch; the builder may reshape it)
New message types on the existing websocket, all validated and capped like `join`:
- `schedule:list` → `{ games: [...] }` (public fields only; token-holder sees their own role via a `mine` flag computed from a token they send).
- `schedule:post { at, players, mode, open, name, char, level, token }`
- `schedule:ask { id, name, char, level, token }`, `schedule:cancel { id, token }`
- `schedule:answer { id, seat|requestId, accept, token }` (host only, matched by token hash)
- `schedule:delete { id, token }`
- `schedule:enter { id, token }` → joins/creates the game's room (a normal room with a fixed code derived server-side).
- Rate limits: reuse `joinsPerMin`-style counters per visitor key; payload cap as today.
- HOME polls `schedule:list` together with the existing 10 s open-games poll (one message, not a second socket).

### Privacy page
Add: scheduled games keep the host's and guests' nicknames, characters and levels on our server until 15 minutes after the game (also on its disk, so a restart keeps them); a random code saved in your browser lets the server recognise your posting/reservation (stored there only as a scrambled hash); "Add to calendar" makes a file on your device, nothing is sent. Also the player-count line ("N players on the site").

## Decisions after the builder check (all Opus's calls; the user delegated them)
1. **Capacity.** "8 per slot" means at most 8 scheduled games *running* at once: a posting reserves a match slot from its start until start + 90 min (`matchMs`), and a new posting is refused when its window would overlap 8 others. At start time a scheduled room may use a match slot only if fewer than `rooms - 2` scheduled rooms are playing; quick play and invites can use all 10.
2. **Waiting room lifecycle.** The room is created server-side lazily on the first `schedule:enter` at T-10 min or later (fixed code derived from the posting id), as a normal unstarted room with `cfg.scheduled = id`. It does **not** count towards `waiting` or `roomsPerIp` (its posting already passed the posting caps) and it counts towards `rooms`/`playingPerIp` once started like any room. Seats: the host and accepted guests own fixed seats by token; `room.host` is the posting host's seat while they are connected, else the first arrived seat (existing host hand-over rule). The scheduler, not a client, calls `begin()` at the start time / after the 3-minute wait.
3. **Level** is display-only (client-reported, like online looks today); the UI shows it as a hint, never as a guarantee. No server lookup.
4. **Identity.** One random 128-bit **browser token** per browser (`padel.scheduleToken` in localStorage), reused for every post/ask. The server stores `sha256(token)` (plain hash; the token is random, so no keyed hash needed). `schedule:list` sends the token once per poll so the server can mark `mine`. Per-visitor caps (1 posting, 2 reservations) are enforced by token hash **and** by `ownerKey(ip)` in memory (either one hitting the cap refuses).
5. **Abuse.** Accepted at hobby scale: caps above + a per-visitor `schedule:*` write rate limit (10/min) + max 8 pending requests per posting (oldest stay, new ones refused "This game has enough requests") + total 60 postings. Revisit if the status line shows abuse.
6. **Persistence missing.** If `PADEL_STATE` is unset or not writable, the server runs with in-memory schedule only and logs one line `schedule: not persistent`. Never refuse to start.
7. **Player count and static build.** The count comes in the reply to the existing 10 s HOME poll (`list` already opens a short socket; add `schedule:list` + a `clients` total in the same exchange, no persistent socket). It counts open sockets minus the poller itself; shown only when ≥ 2. The static build without a server hides the calendar entirely (same as Invite today). HOME polls only a trusted server (`trustedServer`), never a `?server=` one before `allowServer()` consent — same rule as the open-games poll today.
8. **Clock.** The Pi syncs NTP on boot; the scheduler ignores expiry/start while the clock reads earlier than the newest posting's `createdAt` (sanity check), and the server sends its `now` with every `schedule:list` so the client computes "in 2 h" and the T-10 Enter button from the server clock offset.
9. **Seats in doubles.** Seats are assigned at start, not at approval: approved people are an ordered list; at room creation they fill the room's seat order ([0,2,1,3] Face off, [0,1] Team up) in arrival order. A cancelled/declined place simply leaves the list.
10. **Tutorial flag.** Builder checks `tutorial.js` for a completion flag and adds `padel.tutorialDone` if none exists.

## Left to the builder
- Exact message names/shapes, file format, module split (suggest `server/schedule.js`, pure and unit-tested like `tournament.js`; client `src/schedule.js` pure helpers + HOME rendering in `home.js`).
- How the waiting room UI reuses `lobbyView`/`lobbyHtml` and the `pend` warm-up flow.
- Styling details, as long as it follows the mockups and the existing light theme.
- Test layout: one test per rule (slot cap, per-visitor cap, auto-accept at T-1h, expiry at T+15 min, token hash matching, persistence round-trip, 3-minute wait then AI).

## Rollout
1. Training card (client only, small) — can ship first.
2. Server schedule module + persistence + tests; security audit; Pi service change (user sudo).
3. HOME calendar UI + posting sheet + host/guest rows + `.ics`.
4. Waiting room + start rules.
5. privacy.html in the same commit as the first client build that talks to `schedule:*`; README/controls page text.
