# Security fixes before the 24/7 server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 2026-11-07 red-team findings R1–R8 so the home Pi can run the game server 24/7.

**Architecture:** Server-side limits and timeouts live in `server/server.js` (`LIMITS`, `sweep()`, the `connection` handler); client fixes are in `src/careerui.js`, `src/career.js`, `src/serverurl.js`, `src/net.js`, `index.html`. Every fix gets one test in the existing `node:test` files. No protocol change: messages and their fields stay as they are.

**Tech Stack:** Node 22, `ws`, `node:test`, plain ES modules.

**Spec:** `docs/superpowers/specs/2026-11-07-live-lobby-design.md` (goal 8 and "Sıra"). Finding details: `agents/reports/security-2026-11-07-redteam.md` (gitignored — never quote it in commits, docs or issues).

This is plan 1 of 5 for the spec. The others follow in order: 2 roster + poses, 3 live lobby (server protocol, home page, warm-up, invite, Exit), 4 light theme, 5 24/7 operation. Each is written when the previous one ships.

## Global Constraints

- Commit messages describe behaviour ("a socket that never joins a room is closed after 15 s"), never the attack or the finding id.
- Never log an IP, a name or a room code; never keep a raw IP longer than its socket.
- `src/game.js`, `physics.js`, `rules.js`, `ai.js` stay free of DOM/three imports (none of them change here).
- Every new UI text goes through `t()` and into all 7 locale tables (`node tools/extract-keys.js`, `test/i18n-keys.test.js`). This plan adds none.
- `npm test` passes after every task. Only Opus commits and pushes; after the push check the Pages run.
- The repo is public: no Pi address, user name or home network detail in tracked files.

## Review Focus

1. **A finished online match must not show "Connection closed".** The server now closes rooms after the winner. The client must stay quiet when the close comes after `winner`. Test in Task 4.
2. **A legitimately slow match must not be cut.** The idle close counts only time with no input from any connected human. One player moving resets it. Test in Task 4.
3. **The rejoin flow must survive the new limits.** A rejoin counts as one join. 20 joins a minute leaves room for the client's 5 retries (`RETRY` in `net.js`). A rejoined socket is `inRoom`, so the ghost sweep never closes it. The existing rejoin tests in `test/server.test.js` (lines 378–485) must pass unchanged with default `LIMITS`, plus one assertion in Task 3's ghost test: a joined socket survives `sweep(now + ghostMs + 1)`.
4. **A room whose creator left must still count against that creator.** Without this, room quotas can be dodged. The room must not keep a raw IP, so it keeps an in-memory keyed hash instead. Test in Task 5.
5. **The static server must still serve the game where it is used (`npm run online`).** Only GET/HEAD are served, from a file list read once at start. A file built after start is not served until restart. That is acceptable. Test in Task 6.

---

### Task 1: Career reward score is text, never HTML

**Files:**
- Modify: `src/career.js` (new export near `applyRating`)
- Modify: `src/careerui.js:2019` (render), `src/careerui.js:2704` (store)
- Test: `test/career.test.js`

**Interfaces:**
- Produces: `safeScore(s: unknown) -> string` in `src/career.js`. Returns `s` when it is a string matching `/^[0-9 -]{0,40}$/` (the `scoreText().sets` shape, e.g. `"6-4  3-6  7-5"`), otherwise `''`.

- [ ] **Step 1: Write the failing test** in `test/career.test.js`:

```js
test('safeScore keeps a set score and drops anything else', () => {
  assert.equal(safeScore('6-4  3-6  7-5'), '6-4  3-6  7-5');
  assert.equal(safeScore('<img src=x onerror=alert(1)>'), '');
  assert.equal(safeScore({ sets: '6-4' }), '');
  assert.equal(safeScore('6'.repeat(41)), '');
});
```

- [ ] **Step 2:** `node --test test/career.test.js` → FAIL (`safeScore` is not exported).
- [ ] **Step 3:** Add `safeScore` to `src/career.js`. In `careerui.js:2704` store `score: safeScore(result.score?.sets)`. In `careerui.js:2019` render `escapeHtml(r.score || '—')` inside the `t()` placeholder, so profiles that already hold a bad value are safe too.
- [ ] **Step 4:** `node --test test/career.test.js` → PASS; `npm test` → all pass.
- [ ] **Step 5:** Commit `career: the reward screen's score is plain text (set scores only, escaped when shown)`.

### Task 2: Client side of the server link

**Files:**
- Modify: `src/serverurl.js` (`trustedServer`, `allowServer`), `src/net.js` (`open()`), `index.html:18` (inline script), `src/career.js` (`applyRating`)
- Test: `test/serverurl.test.js`, `test/career.test.js`

**Interfaces:**
- Produces: `allowServer(url, loc)` returns `false` for a `ws:` URL when `loc.protocol === 'https:'` (no prompt). When the visitor says no, it also runs `sessionStorage.removeItem('padel.server')` and `delete globalThis.__padelServer` (each in try/catch).
- Produces: `connect()` in `net.js` catches a throwing `new WebSocket(url)` and calls `onError('Could not connect to the game server.')`.
- Produces: `applyRating(profile, myPair, oppPair, result, …)`. When `result.ai === 'online'`, it first clamps `myPair` and `oppPair` to `[profile.level - 1.5, profile.level + 1.5]`.

- [ ] **Step 1: Write the failing tests:**

```js
// test/serverurl.test.js
test('an https page never connects to a plain ws: server and does not ask', () => {
  let asked = false; globalThis.confirm = () => { asked = true; return true; };
  assert.equal(allowServer('ws://example.org:8080', { protocol: 'https:', hostname: 'padellegends.eu' }), false);
  assert.equal(asked, false);
});
test('a refused ?server= is forgotten for the tab', () => {
  const store = new Map([['padel.server', 'wss://evil.example']]);
  globalThis.sessionStorage = { removeItem: (k) => store.delete(k), getItem: (k) => store.get(k) ?? null };
  globalThis.__padelServer = 'wss://evil.example'; globalThis.confirm = () => false;
  assert.equal(allowServer('wss://evil.example', { protocol: 'https:', hostname: 'padellegends.eu' }), false);
  assert.equal(store.has('padel.server'), false);
  assert.equal(globalThis.__padelServer, undefined);
});
// test/career.test.js
test('an online opponent\'s claimed level moves the rating no more than a 1.5-level gap', () => {
  const p = newProfile(chars[0], {}, { level: 3, reliability: 0.5 });
  const far = applyRating(p, 3, 0.5, { won: true, ai: 'online' });
  const near = applyRating(p, 3, 1.5, { won: true, ai: 'online' });
  assert.equal(far.profile.level, near.profile.level);
});
```

- [ ] **Step 2:** `node --test test/serverurl.test.js test/career.test.js` → the three new tests FAIL.
- [ ] **Step 3:** Implement the three changes listed under Interfaces. The `allowServer` answer cache (`answers`) stays per URL. Leave `index.html` as it is: it is right to store the address before anyone is asked, because `allowServer` now removes it on a no.
- [ ] **Step 4:** Same command → PASS; `npm test` → all pass.
- [ ] **Step 5:** Commit `online: an https page never uses a plain ws: server, a refused server address is forgotten, a failed socket shows the connect error; online career ratings cap the opponent gap at 1.5 levels`.

### Task 3: Sockets that do nothing, joins in a burst, slow readers, log volume

**Files:**
- Modify: `server/server.js` (`LIMITS`, `connection` handler, `sweep`, `tick`, `lobby`, `status`)
- Test: `test/server.test.js`

**Interfaces:**
- Produces: `LIMITS` gains `ghostMs: 15000` (a socket with no room is closed after this), `joinsPerMin: 20` (join messages per visitor key per minute; beyond it `fail('The server is full. Try again later.')`), `logsPerMin: 60` (join/leave/rejoin lines per minute; later ones are dropped), `sendSkip: 65536`, `sendDrop: 524288` (bytes queued in `ws.bufferedAmount`).
- Produces: `sweep(now)` also closes, with code `1000` and reason `'no room'`, every socket in `wss.clients` that has `!ws.inRoom && now - ws.born > lim.ghostMs`. The `connection` handler sets `ws.born = Date.now()` and sets `ws.inRoom = true` on any successful join or rejoin.
- Produces: one helper `send(ws, msg)`, used by `tick` and `lobby`. It skips `msg` when `ws.bufferedAmount > lim.sendSkip` and terminates the socket when `> lim.sendDrop`.

- [ ] **Step 1: Write the failing tests:**

```js
test('a socket that never joins a room is closed after ghostMs', async () => {
  const srv = await startServer(0, { ghostMs: 50 });
  try {
    const c = client(srv.port);
    await new Promise(r => c.ws.once('open', r));
    const closed = new Promise(r => c.ws.once('close', (code) => r(code)));
    await new Promise(r => setTimeout(r, 80));
    srv.sweep();
    assert.equal(await closed, 1000);
    // a socket in a room is never a ghost
    const host = client(srv.port); await create(host, { cfg: { players: 2 } });
    srv.sweep(Date.now() + 1000);
    assert.equal(host.ws.readyState, 1);
  } finally { await srv.close(); }
});
test('joins beyond joinsPerMin from one visitor are refused, a rejoin inside the limit still works', async () => {
  const srv = await startServer(0, { joinsPerMin: 3 });
  try {
    const host = client(srv.port);
    const { code } = await create(host, { cfg: { players: 4 } });
    const a = client(srv.port), b = client(srv.port), c = client(srv.port);
    await join(a, code); await join(b, code);
    const err = c.next('error'); await c.send({ type: 'join', code });
    assert.equal((await err).msg, 'The server is full. Try again later.');
  } finally { await srv.close(); }
});
```

The slow-reader limit gets a unit test: export `send` as `sendCapped(ws, msg, lim)` and call it with a fake `{ bufferedAmount, send, terminate, readyState: 1 }`. Assert: 70 000 bytes queued → no send, no terminate. 600 000 → terminate.

- [ ] **Step 2:** `node --test test/server.test.js` → the new tests FAIL.
- [ ] **Step 3:** Implement as listed under Interfaces. Count joins in a `Map` cleared each minute by the `status()` timer, next to `badLines`. Gate the join/leave/rejoin `console.log` calls through one `logLine(s)` helper that counts against `logsPerMin`.
- [ ] **Step 4:** `node --test test/server.test.js` → PASS; `npm test` → all pass.
- [ ] **Step 5:** Commit `server: a socket that never joins a room is closed after 15 s, joins per visitor are rate limited, a socket that stops reading is skipped and then dropped, join/leave log lines are capped per minute`.

### Task 4: Rooms that never end

**Files:**
- Modify: `server/server.js` (`LIMITS`, `makeRoom`, `tick`, `sweep`, the `input` branch), `src/net.js` (`ws.onclose`)
- Test: `test/server.test.js`

**Interfaces:**
- Produces: `LIMITS` gains `idleMs: 180000` (a started room where no connected human sent an `input` for this long closes), `overMs: 60000` (a room closes this long after `world.match.winner` is set), `matchMs: 5400000` (a started room closes after 90 minutes whatever happens). The close is done by one helper `closeRoom(room, reason)`: it clears the timer, deletes the room, and closes each socket with code `1000` and the reason.
- Produces: `room.lastInput` (set at `start` and on every `input`), `room.overAt` (set in `tick` the first time `winner != null`), `room.startedAt`. `sweep(now)` checks all three.
- Produces: in `net.js`, `ws.onclose` returns silently when `net.winner != null`. No retry and no `onError`.

- [ ] **Step 1: Write the failing tests:**

```js
test('a started room nobody plays in closes after idleMs, any input keeps it open', async () => {
  const srv = await startServer(0, { idleMs: 1000 });
  try {
    const a = client(srv.port), b = client(srv.port);
    const { code } = await create(a, { cfg: { players: 2 } }); await join(b, code);
    const lob = a.next('lobby'); await a.send({ type: 'start' }); await lob;
    const t0 = srv.rooms.get(code).lastInput;
    await a.send({ type: 'input', move: [1, 0] }); await new Promise(r => setTimeout(r, 20));
    srv.sweep(t0 + 900); assert.ok(srv.rooms.has(code));
    srv.sweep(srv.rooms.get(code).lastInput + 1001); assert.ok(!srv.rooms.has(code));
  } finally { await srv.close(); }
});
test('a finished match closes its room after overMs and the client shows no error', async () => {
  const { connect } = await import('../src/net.js');
  const srv = await startServer(0, { overMs: 1000 });
  try {
    const host = client(srv.port);
    const { code } = await create(host, { cfg: { players: 2 } });
    const errors = [];
    const net = connect({ url: `ws://127.0.0.1:${srv.port}`, code, char: 0, onError: (e) => errors.push(e) });
    while (!net.lobby) await new Promise(r => setTimeout(r, 10));
    await host.send({ type: 'start' });
    while (!net.lobby.started) await new Promise(r => setTimeout(r, 10));
    const room = srv.rooms.get(code);
    room.world.match.winner = 0;
    while (room.overAt == null) await new Promise(r => setTimeout(r, 10));  // tick sets it and sends the winner
    while (net.winner == null) await new Promise(r => setTimeout(r, 10));
    const closed = new Promise(r => net.ws.addEventListener('close', r));
    srv.sweep(room.overAt + 1001);
    await closed;
    assert.ok(!srv.rooms.has(code));
    assert.deepEqual(errors, []);
  } finally { await srv.close(); }
});
```

- [ ] **Step 2:** `node --test test/server.test.js` → FAIL.
- [ ] **Step 3:** Implement as listed under Interfaces. Replace the existing room-closing code in `sweep`, `tick`'s catch and `ws.on('close')` with `closeRoom`.
- [ ] **Step 4:** `node --test test/server.test.js` → PASS; `npm test` → all pass.
- [ ] **Step 5:** Commit `server: a started room closes after 3 minutes with no input from anyone, a minute after the match ends, or after 90 minutes; the client stays quiet when a finished match's room closes`.

### Task 5: Room quota follows the creator without keeping their IP

**Files:**
- Modify: `server/server.js` (`makeRoom`, the `create` branch, `ws.on('close')`)
- Test: `test/server.test.js:587-610` (rewrite this test)

**Interfaces:**
- Produces: `ownerKey(ip: string) -> string`, an HMAC-SHA256 (`node:crypto` `createHmac`) of `ip` with a 32-byte key from `randomBytes` made once per process, base64url, first 22 characters. `room.owner = ownerKey(ip)` replaces `room.ip`. The quota counts `r.owner === ownerKey(ip)`. The line that hands `room.ip` to the next player is removed. The comment says the room keeps only a keyed hash, lost on restart.

- [ ] **Step 1:** Rewrite the test at `test/server.test.js:587` as `'a room counts for its creator after they leave, and keeps no IP'`. Use the existing `open(ip)` helper. `203.0.113.1` creates 3 rooms (`roomsPerIp: 3`), `203.0.113.2` joins one of them, then `.1` closes all its sockets. Assert: `.1` still gets `'The server is full. Try again later.'` on a 4th create while those rooms live; `.2` can create its own room; `JSON.stringify([...srv.rooms.values()].map(r => r.owner))` does not contain `'203.0.113'`.
- [ ] **Step 2:** `node --test test/server.test.js` → FAIL.
- [ ] **Step 3:** Implement as listed under Interfaces.
- [ ] **Step 4:** `node --test test/server.test.js` → PASS; `npm test` → all pass.
- [ ] **Step 5:** Commit `server: a room keeps counting for the visitor who made it, stored as an in-memory keyed hash instead of an IP`.

### Task 6: Static files without disk calls per request

**Files:**
- Modify: `server/server.js` (the `http.createServer` handler, `startServer` start-up)
- Test: `test/server.test.js`

**Interfaces:**
- Produces: at `startServer`, a recursive walk of `DIST` builds `files: Map<urlPath, { file, size, type }>`. It is empty when `dist/` does not exist. The request handler answers `405` for any method other than `GET` and `HEAD`, and `404` for a path not in `files`. For `HEAD` it sends only headers (`content-length` from `size`). It never calls `existsSync` or `statSync` per request.

- [ ] **Step 1: Write the failing test:**

```js
test('the static server answers GET/HEAD from its start-up file list and refuses other methods', async () => {
  const srv = await startServer(0);
  try {
    const base = `http://127.0.0.1:${srv.port}`;
    assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
    assert.equal((await fetch(base + '/nope-' + Date.now())).status, 404);
    const h = await fetch(base + '/', { method: 'HEAD' });
    assert.ok([200, 404].includes(h.status));  // 404 when dist/ was never built
  } finally { await srv.close(); }
});
```

- [ ] **Step 2:** `node --test test/server.test.js` → the 405 assertion FAILS.
- [ ] **Step 3:** Implement as listed under Interfaces.
- [ ] **Step 4:** `node --test test/server.test.js` → PASS; `npm run build && npm run online` serves the game at `http://localhost:8080` (manual check); `npm test` → all pass.
- [ ] **Step 5:** Commit `server: static files come from a list read at start (GET and HEAD only), so a request never waits on the disk`.

### Task 7: Which proxy header is trusted

**Files:**
- Modify: `server/server.js` (`clientIp`)
- Test: `test/server.test.js`

**Interfaces:**
- Produces: `clientIp(req)` trusts a header only when the peer is loopback or `TRUST_PROXY=1`. The header is named by `PROXY_HEADER` (default `cf-connecting-ip`), and there is no fallback chain. `x-forwarded-for` is read only when `PROXY_HEADER=x-forwarded-for`, and then its **last** element. Export `clientIp` for the test.

- [ ] **Step 1: Write the failing test:**

```js
test('clientIp trusts only the configured proxy header from a local peer', () => {
  const req = (peer, headers) => ({ socket: { remoteAddress: peer }, headers });
  assert.equal(clientIp(req('127.0.0.1', { 'cf-connecting-ip': '198.51.100.7', 'x-forwarded-for': '1.2.3.4' })), '198.51.100.7');
  assert.equal(clientIp(req('127.0.0.1', { 'x-forwarded-for': '1.2.3.4' })), '127.0.0.1');
  assert.equal(clientIp(req('203.0.113.9', { 'cf-connecting-ip': '1.2.3.4' })), '203.0.113.9');
});
```

- [ ] **Step 2:** FAIL (`clientIp` is not exported, and the second case returns `1.2.3.4`).
- [ ] **Step 3:** Implement as listed under Interfaces.
- [ ] **Step 4:** PASS; `npm test` → all pass.
- [ ] **Step 5:** Commit `server: the visitor address comes from one configured proxy header (cf-connecting-ip by default), only from a local peer`.

### Task 8: Ship to the Pi and audit

**Files:**
- Modify: `docs/online-server.md` (one dated line under "Raspberry Pi": the new limits, no finding details)
- No code.

- [ ] **Step 1:** `npm test` → all pass. Push `main`, then check the Pages run succeeded (`curl -s https://api.github.com/repos/Mesut-Outlook/Padel_Game/actions/runs?per_page=1`).
- [ ] **Step 2:** Copy to the Pi staging folder: `git archive HEAD server src data test package.json package-lock.json | ssh <pi> 'cd ~/padel && tar -x'`. Run `~/opt/node/bin/node --test test/server.test.js test/game.test.js` on the Pi → all pass.
- [ ] **Step 3:** The user runs, in their own terminal, one `ssh -t <pi> 'sudo install -o root -g root -m 644 …'` per changed file (`server/server.js`, `src/net.js`), and `sudo rm -rf /opt/padel/dist` (the client comes from Pages; an empty `dist/` leaves the tunnel serving only the socket). Opus verifies the hashes against the repo.
- [ ] **Step 4:** Run the `security-auditor` agent on the server and the Pi. Its report goes to `agents/reports/security-<date>.md` (gitignored). Every finding is either fixed or explained to the user before plan 5.
- [ ] **Step 5:** Remind the user of the one open personal step: the SSH key passphrase (`ssh-keygen -p -f ~/.ssh/id_ed25519`, the order is in the local Pi memory note). Commit the `docs/online-server.md` line.
