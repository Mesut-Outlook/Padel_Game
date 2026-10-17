import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, stepWorld } from '../src/game.js';

// naive bots: chase ball x, swing always -> match must progress and score points without throwing
test('bot match progresses and scores', () => {
  const w = newWorld();
  let points = 0, hits = 0;
  for (let i = 0; i < 60 * 600 && w.state !== 'over'; i++) {
    const inp = {};
    for (const p of w.players) inp[p.id] = { move: [Math.sign(w.ball.p[0] - p.p[0]), Math.sign(w.ball.p[2] - p.p[1]) * 0.5], swing: 'auto', aim: Math.random() * 2 - 1 };
    stepWorld(w, inp, 1 / 60);
    for (const e of w.events) { if (e.type === 'point') points++; if (e.type === 'hit') hits++; }
    w.events.length = 0;
  }
  assert.ok(points > 20, `points ${points} hits ${hits} log ${w.match.log.slice(-5)}`);
  assert.ok(hits > points, `rallies happen: hits ${hits} points ${points}`);
});

test('swing waits for the ball to come close instead of hitting at the edge of reach', () => {
  const w = newWorld();
  w.state = 'play';
  Object.assign(w.match.rally, { phase: 'rally', lastHitTeam: 1, bouncesSinceHit: 1 });
  const pl = w.players[0];
  pl.p = [0, 6];
  Object.assign(w.ball, { p: [1.3, 1.0, 6], v: [-8, 0, 0], w: [0, 0, 0], live: true });
  let hitD = null;
  for (let i = 0; i < 30 && hitD == null; i++) {
    const bx = w.ball.p[0];
    stepWorld(w, { 0: { move: [0, 0], swing: i === 0 ? 'drive' : null, aim: 0 } }, 1 / 60);
    if (w.events.some(e => e.type === 'hit')) hitD = Math.abs(bx - pl.p[0]);
    w.events.length = 0;
  }
  assert.ok(hitD != null && hitD < 0.85, `hit at distance ${hitD}`);
});

test('server holds the ball on the court-centre side', () => {
  const w = newWorld();
  stepWorld(w, {}, 1 / 60);
  const s = w.players.find(p => p.anim === 'serveReady');
  assert.ok(s, 'server is in serve-ready pose');
  assert.ok(Math.abs(w.ball.p[0]) < Math.abs(s.p[0]), `ball x ${w.ball.p[0]} server x ${s.p[0]}`);
});

test('server can shuffle along the baseline but stays in own half behind the service line', () => {
  const w = newWorld();
  const s = w.players.find(p => p.id === 0);
  const xs = Math.sign(s.p[0]), x0 = s.p[0];
  for (let i = 0; i < 120; i++) stepWorld(w, { 0: { move: [-xs, -1] } }, 1 / 60);  // push toward centre + net
  assert.ok(Math.abs(s.p[0]) < Math.abs(x0), 'moved toward centre');
  assert.ok(s.p[0] * xs >= 0.3, `stays in own half: ${s.p[0]}`);
  assert.ok(Math.abs(s.p[1]) >= 7.3, `behind service line: ${s.p[1]}`);
});

test('slice serve carries sidespin, flat serve does not', () => {
  for (const [swing, side] of [['slice', true], ['auto', false]]) {
    const w = newWorld();
    stepWorld(w, { 0: { swing } }, 1 / 60);
    for (let i = 0; i < 120 && w.state === 'toss'; i++) stepWorld(w, {}, 1 / 60);
    assert.equal(w.state, 'play');
    assert.equal(w.ball.w[1] !== 0, side, `${swing}: w=${w.ball.w}`);
  }
});

test('serve: ball is dropped, bounces, and is struck below the waist', () => {
  const w = newWorld();
  stepWorld(w, { 0: { swing: 'auto' } }, 1 / 60);
  assert.equal(w.state, 'toss');
  let minY = Infinity, hitY = null;
  for (let i = 0; i < 120 && w.state === 'toss'; i++) {
    stepWorld(w, {}, 1 / 60);
    minY = Math.min(minY, w.ball.p[1]);
    for (const e of w.events) if (e.type === 'hit') hitY = w.ball.p[1];
  }
  assert.ok(minY < 0.1, `ball reached the floor: ${minY}`);
  assert.ok(hitY != null && hitY < 1.0, `struck below the waist: ${hitY}`);
});

test('sweet-spot timing quality is evaluated and bajada/rulo shots are supported', () => {
  const w = newWorld();
  w.state = 'play';
  Object.assign(w.match.rally, { phase: 'rally', lastHitTeam: 1, bouncesSinceHit: 1 });
  const pl = w.players[0];
  pl.p = [0, 6];
  // place ball right in optimal sweet spot (distance ~0.85m, good height)
  Object.assign(w.ball, { p: [0.85, 1.0, 6], v: [0, 0, 0], w: [0, 0, 0], live: true });
  let hit = null;
  for (let i = 0; i < 20 && !hit; i++) {
    stepWorld(w, { 0: { swing: i === 0 ? 'bajada' : null, aim: 0 } }, 1 / 60);
    hit = w.events.find(e => e.type === 'hit');
  }
  assert.ok(hit, 'hit event recorded');
  assert.equal(hit.shot, 'bajada');
  assert.equal(hit.quality, 'perfect');
});


test('a pending swing plants the feet: aiming sideways barely moves the player', () => {
  const run = (swing) => {
    const w = newWorld(); w.state = 'play';
    const p = w.players[0]; p.p = [0, 8];
    Object.assign(w.ball, { p: [0, -5, 0], v: [0, 0, 0], live: false });
    stepWorld(w, { 0: { move: [-1, 0], swing, aim: -1 } }, 1 / 60);
    for (let i = 0; i < 9; i++) stepWorld(w, { 0: { move: [-1, 0] } }, 1 / 60);
    return Math.abs(p.p[0]);
  };
  assert.ok(run('auto') < run(null) * 0.5, `with swing ${run('auto')} vs walking ${run(null)}`);
});

// one struck ball with a seeded Math.random; returns |x| where it first lands or hits a wall = how far a centre-aimed shot strays
function strayAfterHit({ stats, swing, ball = [0.85, 1.0, 6], bounces = 1, rally = 0, seed }) {
  let s = seed; const rnd = Math.random; Math.random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  try {
    const w = newWorld({ stats: { 0: stats } }); w.state = 'play'; w.rally = rally;
    Object.assign(w.match.rally, { phase: 'rally', lastHitTeam: 1, bouncesSinceHit: bounces });
    w.players[0].p = [0, 6];
    Object.assign(w.ball, { p: [...ball], v: [0, 0, 0], w: [0, 0, 0], live: true });
    let hit = false;
    for (let i = 0; i < 400; i++) {
      stepWorld(w, { 0: { swing: i === 0 ? swing : null, aim: 0 } }, 1 / 60);
      for (const e of w.events) {
        if (e.type === 'hit') hit = true;
        else if (hit && e.type === 'contact') return Math.abs(e.p[0]);
      }
      w.events.length = 0;
    }
    throw new Error(hit ? 'no contact' : 'no hit');
  } finally { Math.random = rnd; }
}
const meanStray = (o) => { let n = 0; for (let i = 1; i <= 200; i++) n += strayAfterHit({ ...o, seed: i * 7919 }); return n / 200; };

test('volley stat: a volley-10 player strays less on volleys than volley-2', () => {
  const hi = meanStray({ stats: { volley: 10 }, swing: 'volley', bounces: 0 }), lo = meanStray({ stats: { volley: 2 }, swing: 'volley', bounces: 0 });
  assert.ok(hi < lo, `volley 10 ${hi} vs volley 2 ${lo}`);
});

test('smash stat: a smash-10 player strays less on smashes than smash-2', () => {
  const o = { swing: 'smash', ball: [0.85, 2.3, 6] };
  const hi = meanStray({ ...o, stats: { smash: 10 } }), lo = meanStray({ ...o, stats: { smash: 2 } });
  assert.ok(hi < lo, `smash 10 ${hi} vs smash 2 ${lo}`);
});

test('stamina stat: deep in a 14-shot rally stamina-10 strays less than stamina-2', () => {
  const o = { swing: 'drive', rally: 14 };
  const hi = meanStray({ ...o, stats: { stamina: 10 } }), lo = meanStray({ ...o, stats: { stamina: 2 } });
  assert.ok(hi < lo, `stamina 10 ${hi} vs stamina 2 ${lo}`);
});

test('stats at 6 keep today\'s behaviour (volley/smash/stamina are centred)', () => {
  const o = { swing: 'volley', bounces: 0, rally: 14 };
  assert.equal(meanStray({ ...o, stats: {} }), meanStray({ ...o, stats: { volley: 6, smash: 6, stamina: 6 } }));
});
