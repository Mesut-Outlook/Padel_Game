import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, stepWorld } from '../src/game.js';
import { aiInput } from '../src/ai.js';

// Plays a full AI-vs-AI match; levels = [team0 level, team1 level].
function play(opts, levels, minutes = 20) {
  const w = newWorld(opts);
  const pts = [0, 0];
  let hits = 0, points = 0;
  for (let i = 0; i < 60 * 60 * minutes && w.state !== 'over'; i++) {
    const inp = {};
    for (const p of w.players) if (p.active) inp[p.id] = aiInput(w, p.id, levels[p.team]);
    stepWorld(w, inp, 1 / 60);
    for (const e of w.events) {
      if (e.type === 'point') { pts[e.team]++; points++; hits += e.rally; }
    }
    w.events.length = 0;
  }
  const reasons = {};
  for (const l of w.match.log) { const k = l.replace(/^point T\d: /, 'T? ').replace(/^fault: /, 'fault: '); reasons[k] = (reasons[k] || 0) + 1; }
  const stats = { pts, points, avgRally: hits / points, simSec: +w.t.toFixed(0), over: w.state === 'over', reasons };
  console.log(JSON.stringify(stats));
  return stats;
}

test('doubles pro vs club: rallies happen and the stronger team wins more points', () => {
  const s = play({}, ['pro', 'club']);
  assert.ok(s.points > 0, 'match produces points');
  assert.ok(s.avgRally >= 3, `avg hits per point ${s.avgRally}`);
  assert.ok(s.pts[0] > s.pts[1], `pro ${s.pts[0]} vs club ${s.pts[1]}`);
});

test('singles legend vs rookie: rallies happen and legend wins more points', () => {
  const s = play({ players: 2 }, ['legend', 'rookie']);
  assert.ok(s.points > 0);
  assert.ok(s.avgRally >= 3, `avg hits per point ${s.avgRally}`);
  assert.ok(s.pts[0] > s.pts[1], `legend ${s.pts[0]} vs rookie ${s.pts[1]}`);
});
