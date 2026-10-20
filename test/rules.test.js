import test from 'node:test';
import assert from 'node:assert/strict';
import { newMatch, onHit, onContact, point, scoreText, scoreBoard, serviceBox, servePosition, serverId, receiverId } from '../src/rules.js';

const fl = (side, x, z) => ({ kind: 'floor', side, p: [x, 0.03, z] });

test('golden point decides game at 40-40', () => {
  const m = newMatch();
  for (let i = 0; i < 3; i++) { point(m, 0, 't'); point(m, 1, 't'); }
  assert.equal(scoreText(m).pts, 'GOLDEN');
  point(m, 1, 't');
  assert.deepEqual(m.sets[0], [0, 1]);
});

test('advantage scoring when golden point off', () => {
  const m = newMatch({ goldenPoint: false });
  for (let i = 0; i < 4; i++) { point(m, 0, 't'); point(m, 1, 't'); }
  assert.deepEqual(m.sets[0], [0, 0]);
  point(m, 0, 't'); point(m, 0, 't');
  assert.deepEqual(m.sets[0], [1, 0]);
});

test('6-6 goes to tiebreak, 7 wins set', () => {
  const m = newMatch();
  const win = (t) => { for (let i = 0; i < 4; i++) point(m, t, 't'); };
  for (let i = 0; i < 6; i++) { win(0); win(1); }
  assert.equal(m.tiebreak, true);
  for (let i = 0; i < 7; i++) point(m, 0, 't');
  assert.deepEqual(m.sets[0], [7, 6]);
  assert.equal(m.sets.length, 2);
});

test('serve must land in diagonal box, two faults lose point', () => {
  const m = newMatch();
  const [sx] = servePosition(m), box = serviceBox(m);
  assert.equal(box.xSign, -Math.sign(sx));
  onHit(m, 0);
  assert.equal(onContact(m, fl(1, -box.xSign * 2, -3)).fault, true);
  onHit(m, 0);
  assert.equal(onContact(m, fl(1, -box.xSign * 2, -3)).point, 1);
});

test('rally: own-side bounce loses, double bounce wins, opponent wall direct loses', () => {
  const m = newMatch();
  const box = serviceBox(m);
  onHit(m, 0); onContact(m, fl(1, box.xSign * 2, -4)); // good serve
  onContact(m, { kind: 'glass', side: 1, p: [0, 1, -10] });       // glass after bounce: fine
  assert.equal(onHit(m, 2), null);
  assert.equal(onContact(m, fl(0, 0, 5)), null);
  assert.equal(onContact(m, fl(0, 0, 8)).point, 1);                // double bounce -> team1 wins
  onHit(m, m.serveOrder[m.serveIdx % 4]);
  const r = onContact(m, { kind: 'glass', side: 0, p: [0, 1, 10] });
  assert.ok(r.fault);                                              // serve straight into glass
});

test('receiver cannot volley the serve', () => {
  const m = newMatch();
  onHit(m, 0);
  assert.equal(onHit(m, 2).point, 0);
});

test('net serve landing in diagonal box is let and keeps fault count', () => {
  const m = newMatch();
  const box = serviceBox(m);
  onHit(m, 0);
  assert.equal(onContact(m, { kind: 'net', side: 0, p: [0, 0.88, 0] }), null);
  const r = onContact(m, fl(1, box.xSign * 2, -4));
  assert.equal(r, null);
  const rLet = onHit(m, 2);
  assert.ok(rLet?.let);
  assert.equal(m.rally.phase, 'serve');
  assert.equal(m.rally.fault, 0);
});

test('net serve landing in box then hitting mesh is fault', () => {
  const m = newMatch();
  const box = serviceBox(m);
  onHit(m, 0);
  onContact(m, { kind: 'net', side: 0, p: [0, 0.88, 0] });
  onContact(m, fl(1, box.xSign * 2, -4));
  const r = onContact(m, { kind: 'mesh', side: 1, p: [5, 1, -4] });
  assert.ok(r?.fault);
  assert.equal(m.rally.fault, 1);
});

test('hitting own mesh loses point, hitting own glass stays in play', () => {
  const m = newMatch();
  const box = serviceBox(m);
  onHit(m, 0); onContact(m, fl(1, box.xSign * 2, -4)); // serve good
  onHit(m, 2); // receiver returns
  assert.equal(onContact(m, { kind: 'glass', side: 1, p: [0, 1.5, -10] }), null);
  const r = onContact(m, { kind: 'mesh', side: 1, p: [5, 1.5, -4] });
  assert.equal(r?.point, 0);
  assert.equal(r?.why, 'hit own mesh');
});

test('star point: two advantages, third deuce is sudden death', () => {
  const m = newMatch({ goldenPoint: false, starPoint: true });
  for (let i = 0; i < 3; i++) { point(m, 0, 't'); point(m, 1, 't'); } // deuce 1
  point(m, 0, 't'); point(m, 1, 't');                                   // deuce 2
  point(m, 1, 't'); point(m, 0, 't');                                   // deuce 3
  assert.equal(scoreText(m).pts, 'STAR POINT');
  point(m, 1, 't');
  assert.deepEqual(m.sets[0], [0, 1]);
});

test('super tie-break to 10 replaces the third set', () => {
  const m = newMatch({ superTiebreak: true });
  const win = (t) => { for (let i = 0; i < 4; i++) point(m, t, 't'); };
  for (let i = 0; i < 6; i++) win(0);
  for (let i = 0; i < 6; i++) win(1);
  assert.equal(m.tiebreak, true);
  for (let i = 0; i < 9; i++) point(m, 0, 't');
  assert.equal(m.winner, null);
  point(m, 0, 't');
  assert.equal(m.winner, 0);
});

test('after a tie-break the team that received first serves the next set', () => {
  const m = newMatch();
  const win = (t) => { for (let i = 0; i < 4; i++) point(m, t, 't'); };
  for (let i = 0; i < 6; i++) { win(0); win(1); }
  const tbFirst = m.serveOrder[m.serveIdx % 4];
  for (let i = 0; i < 7; i++) point(m, 0, 't');
  assert.notEqual(m.serveOrder[m.serveIdx % 4] < 2, tbFirst < 2);
});

test('change ends triggers on odd total games and every 6 tie-break points', () => {
  const m = newMatch();
  const win = (match, t) => { for (let i = 0; i < 4; i++) point(match, t, 't'); };
  win(m, 0); // game 1 -> total 1 game (odd) -> change ends
  assert.equal(m.changeEnds, true);
  win(m, 1); // game 2 -> total 2 games (even) -> do not change ends
  assert.equal(m.changeEnds, false);
  win(m, 0); // game 3 -> total 3 games (odd) -> change ends
  assert.equal(m.changeEnds, true);

  // Tie-break 6 points test:
  const mtb = newMatch();
  for (let i = 0; i < 6; i++) { win(mtb, 0); win(mtb, 1); } // 6-6 -> tiebreak
  assert.equal(mtb.tiebreak, true);
  for (let i = 0; i < 5; i++) point(mtb, 0, 'tb');
  assert.equal(mtb.changeEnds, false);
  point(mtb, 0, 'tb'); // 6th point in tiebreak -> change ends!
  assert.equal(mtb.changeEnds, true);
});


test('score board: per-team points, advantage, golden point label and server', () => {
  const m = newMatch({ goldenPoint: true });
  point(m, 0); point(m, 0); point(m, 1);
  let b = scoreBoard(m);
  assert.deepEqual(b.pts, ['30', '15']); assert.equal(b.label, ''); assert.equal(b.server, 0); assert.deepEqual(b.sets, [[0, 0]]);
  point(m, 1); point(m, 0); point(m, 1);  // 40-40 with golden point
  b = scoreBoard(m);
  assert.deepEqual(b.pts, ['40', '40']); assert.equal(b.label, 'GOLDEN POINT');
  const a = newMatch({ goldenPoint: false });
  for (const t of [0, 0, 0, 1, 1, 1, 0]) point(a, t);  // deuce then advantage team 0
  assert.deepEqual(scoreBoard(a).pts, ['AD', '40']); assert.equal(scoreBoard(a).label, 'ADVANTAGE');
});

test('rally scoring to 16: every rally is a point, serve passes every 4 points, first to 16 wins', () => {
  const m = newMatch({ pointsTo: 16 });
  const servers = [serverId(m)];
  for (let i = 0; i < 25; i++) {
    point(m, i < 20 ? (i % 5 < 3 ? 0 : 1) : i === 20 ? 1 : 0, 'test');  // 12-8, 12-9, then team 0 runs away with it
    if ((m.points[0] + m.points[1]) % 4 === 0) servers.push(serverId(m));
    if (m.winner != null) break;
  }
  assert.deepEqual(m.points, [16, 9]);
  assert.equal(m.winner, 0);
  assert.deepEqual(m.sets, [[0, 0]], 'no games in rally scoring');
  assert.deepEqual(servers.slice(0, 4), [0, 2, 1, 3]);
  const b = scoreBoard(m);
  assert.deepEqual(b.pts, ['16', '9']);
  assert.equal(b.label, 'RALLY TO 16');
  assert.deepEqual(b.sets, []);
  assert.equal(scoreText(m).pts, '16-9');
});

test('receiverId: the opposite team returns, alternating each point; singles has one receiver', () => {
  const m = newMatch();
  assert.equal(serverId(m), 0);
  assert.equal(receiverId(m), 2);
  m.points = [1, 0];
  assert.equal(receiverId(m), 3);
  const s = newMatch({ players: 2 });
  s.points = [1, 0];
  assert.equal(receiverId(s), 2);
});
