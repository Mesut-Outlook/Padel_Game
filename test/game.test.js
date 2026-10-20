import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, stepWorld, snapshot, serveX, REPLAY } from '../src/game.js';
import { receiverId } from '../src/rules.js';
import { toWorld } from '../src/input.js';

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

test('shoes: speed 0.12 covers more ground in 1 s than starter shoes', () => {
  const run = (speed) => {
    const w = newWorld({ shoes: { 0: { speed, agility: 0 } } }); w.state = 'play';
    const p = w.players[0]; p.p = [-4, 8];
    Object.assign(w.ball, { p: [0, -5, 0], v: [0, 0, 0], live: false });
    for (let i = 0; i < 60; i++) stepWorld(w, { 0: { move: [1, 0] } }, 1 / 60);
    return p.p[0] + 4;
  };
  assert.ok(run(0.12) > run(0), `${run(0.12)} vs ${run(0)}`);
});

test('ball spec: a faster ball reaches the opponent sooner and is set on every new ball', () => {
  const rnd = Math.random; Math.random = () => 0.5;  // no aim noise, no unforced error
  const flight = (speed) => {
    const w = newWorld({ ball: { speed, bounce: 1.04 } });
    assert.equal(w.ball.bounce, 1.04);
    w.state = 'play';
    Object.assign(w.match.rally, { phase: 'rally', lastHitTeam: 1, bouncesSinceHit: 1 });
    w.players[0].p = [0, 6];
    Object.assign(w.ball, { p: [0.85, 1.0, 6], v: [0, 0, 0], w: [0, 0, 0], live: true });
    for (let i = 0; i < 20 && !w.events.some(e => e.type === 'hit'); i++) stepWorld(w, { 0: { swing: i === 0 ? 'drive' : null, aim: 0 } }, 1 / 60);
    return Math.abs(w.ball.v[2]);
  };
  try { const fast = flight(1.12), std = flight(1); assert.ok(fast > std, `${fast} vs ${std}`); } finally { Math.random = rnd; }
});

// run player 0 back and forth for `sec` seconds in open play (ball dead far away), return the energy left
function runFor(stamina, sec) {
  const w = newWorld({ stats: { 0: { stamina } } }); w.state = 'play';
  Object.assign(w.ball, { p: [0, -5, 0], v: [0, 0, 0], live: false });
  const p = w.players[0]; p.p = [0, 6];
  for (let i = 0; i < sec * 60; i++) stepWorld(w, { 0: { move: [Math.sin(i / 40) > 0 ? 1 : -1, 0] } }, 1 / 60);
  return p.energy;
}

test('energy: starts full, running drains it, low stamina tires faster', () => {
  assert.equal(newWorld().players[0].energy, 1);
  const weak = runFor(2, 20), strong = runFor(10, 20);
  assert.ok(weak < 1 && strong < 1, `${weak} ${strong}`);
  assert.ok(weak < strong, `stamina 2 left ${weak}, stamina 10 left ${strong}`);
});

test('energy: a tired player runs slower', () => {
  const dist = (energy) => {
    const w = newWorld(); w.state = 'play';
    Object.assign(w.ball, { p: [0, -5, 0], v: [0, 0, 0], live: false });
    const p = w.players[0]; p.p = [-4, 8]; p.energy = energy;
    for (let i = 0; i < 30; i++) stepWorld(w, { 0: { move: [1, 0] } }, 1 / 60);
    return p.p[0] + 4;
  };
  assert.ok(dist(0.1) < dist(1) * 0.9, `${dist(0.1)} vs ${dist(1)}`);
});

test('energy: a changeover is a drink break that restores energy and is announced', () => {
  const w = newWorld();
  for (const p of w.players) p.energy = 0.3;
  Object.assign(w.match, { sets: [[0, 0]], points: [3, 0] });  // team 0 wins the first game -> odd games -> change ends
  w.state = 'play'; Object.assign(w.match.rally, { phase: 'rally', lastHitTeam: 0, bouncesSinceHit: 1 });
  Object.assign(w.ball, { p: [0, 0.5, -5], v: [0, -3, 0], w: [0, 0, 0], live: true });  // second bounce on team 1's side
  for (let i = 0; i < 60 && !w.events.some(e => e.type === 'drink'); i++) stepWorld(w, {}, 1 / 60);
  assert.ok(w.events.some(e => e.type === 'drink'), w.match.log.join(' | '));
  assert.ok(w.players.every(p => p.energy > 0.5), w.players.map(p => p.energy).join());
});

test('toWorld translates screen movement relative to camera orientation', () => {
  // Default TV camera (looking toward -z): screen up moves toward -z
  assert.deepEqual(toWorld(0, 1, 0), [0, -1]);
  assert.deepEqual(toWorld(1, 0, 0), [1, 0]);

  // Side camera (positioned at +x looking at -x):
  // screen UP moves away from camera toward -x; screen DOWN moves toward +x
  // screen LEFT moves toward -z; screen RIGHT moves toward +z
  const sideCam = { right: [0, 1], forward: [-1, 0] };
  assert.deepEqual(toWorld(0, 1, 0, sideCam), [-1, 0]);  // up on screen
  assert.deepEqual(toWorld(0, -1, 0, sideCam), [1, 0]);  // down on screen
  assert.deepEqual(toWorld(-1, 0, 0, sideCam), [0, -1]); // left on screen
  assert.deepEqual(toWorld(1, 0, 0, sideCam), [0, 1]);   // right on screen
});

test('aiming updates pl.aim while swing is armed and during hit', () => {
  const w = newWorld(); w.state = 'play';
  const p = w.players[0]; p.p = [0, 8];
  Object.assign(w.ball, { p: [0, 1, 3.0], v: [0, 0, 5], live: true });
  // Frame 1: player arms swing with neutral aim
  stepWorld(w, { 0: { move: [0, 0], swing: 'auto', aim: 0 } }, 1 / 60);
  assert.equal(p.aim, 0);
  assert.ok(p.want);
  // Frame 2: player holds aim left while swing is armed
  stepWorld(w, { 0: { move: [-1, 0], aim: -1 } }, 1 / 60);
  assert.equal(p.aim, -1, 'pl.aim updated to -1 while swing was armed');
});


// play the first game's last point so the next step is a changeover (odd games -> change ends)
function toChangeover(opts, energy = 0.3) {
  const w = newWorld(opts);
  for (const p of w.players) p.energy = energy;
  Object.assign(w.match, { sets: [[0, 0]], points: [3, 0] });
  w.state = 'play'; Object.assign(w.match.rally, { phase: 'rally', lastHitTeam: 0, bouncesSinceHit: 1 });
  Object.assign(w.ball, { p: [0, 0.5, -5], v: [0, -3, 0], w: [0, 0, 0], live: true });
  for (let i = 0; i < 60 && !w.events.some(e => e.type === 'drink'); i++) stepWorld(w, {}, 1 / 60);
  return w;
}

test('hydration: drains in play, faster when running; a dry player is slower', () => {
  const w = newWorld(); w.state = 'play';
  Object.assign(w.ball, { p: [0, -5, 0], v: [0, 0, 0], live: false });
  for (let i = 0; i < 600; i++) stepWorld(w, { 0: { move: [Math.sin(i / 40) > 0 ? 1 : -1, 0] } }, 1 / 60);
  assert.equal(newWorld().players[0].hyd, 1);
  assert.ok(w.players[0].hyd < w.players[1].hyd && w.players[1].hyd < 1, `${w.players[0].hyd} ${w.players[1].hyd}`);
  const dist = (hyd) => {
    const v = newWorld(); v.state = 'play';
    Object.assign(v.ball, { p: [0, -5, 0], v: [0, 0, 0], live: false });
    const p = v.players[0]; p.p = [-4, 8]; p.hyd = hyd;
    for (let i = 0; i < 30; i++) stepWorld(v, { 0: { move: [1, 0] } }, 1 / 60);
    return p.p[0] + 4;
  };
  assert.ok(dist(0.2) < dist(1) * 0.95, `${dist(0.2)} vs ${dist(1)}`);
  assert.ok(newWorld({ outdoor: true }).opts.outdoor);
});

test('bag: a changeover drinks water from the bag, isotonic when the water is gone, nowater when empty', () => {
  const w = toChangeover({ bag: { 0: { bag_water: 2 }, 2: { bag_isotonic: 1 }, 1: {} } });
  for (const p of w.players) p.hyd = 0.2;
  const ev = (type, pid) => w.events.filter(e => e.type === type && e.pid === pid);
  assert.equal(w.players[0].bag.bag_water, 1);
  assert.equal(ev('consume', 0)[0].item, 'bag_water');
  assert.equal(w.players[2].bag.bag_isotonic, 0);
  assert.equal(ev('nowater', 1).length, 1);
  assert.equal(ev('consume', 3)[0].item, 'bag_water');  // no bag given: unlimited default (Friendly, AI)
  assert.equal(w.players[3].bag.bag_water, Infinity);
});

test('bag: low energy at a changeover offers food; eat takes it within 6 s, a banana slows tiring', () => {
  const w = toChangeover({ bag: { 0: { bag_banana: 1, bag_gel: 1 }, 2: { bag_gel: 1 } } }, 0.1);  // 0.1 + changeover rest stays below 0.5
  const offer = w.events.find(e => e.type === 'offer' && e.pid === 0);
  assert.equal(offer.item, 'bag_banana');  // the cheapest food first
  const e0 = w.players[0].energy;
  stepWorld(w, { 0: { eat: true } }, 1 / 60);
  assert.equal(w.players[0].bag.bag_banana, 0);
  assert.ok(Math.abs(w.players[0].energy - e0 - 0.12) < 0.01, `${w.players[0].energy} vs ${e0}`);
  assert.equal(w.players[0].tireK, 0.95);
  assert.equal(w.players[0].offer, null);
  stepWorld(w, { 0: { eat: true } }, 1 / 60);
  assert.equal(w.players[0].bag.bag_gel, 1);  // one food per changeover
  for (let i = 0; i < 6.1 * 60; i++) stepWorld(w, {}, 1 / 60);
  stepWorld(w, { 2: { eat: true } }, 1 / 60);
  assert.equal(w.players[2].bag.bag_gel, 1);  // offer expired
  assert.equal(toChangeover({}, 0.9).events.some(e => e.type === 'offer'), false);  // not tired: no offer
});

test('snapshot carries hydration at index 8', () => {
  const w = newWorld(); w.players[0].hyd = 0.456;
  assert.equal(snapshot(w).pl[0][8], 0.46);
});

test('touch stick moves like the keyboard', async () => {
  const { setTouchMove, readKeyboard } = await import('../src/input.js');
  setTouchMove(0.5, 1);
  assert.deepEqual(readKeyboard(0).move, [0.5, -1]);  // team 0: screen up = toward the net (-z)
  setTouchMove(0, 0);
  assert.deepEqual(readKeyboard(0).move, [0, 0]);
});

test('local control: two humans with two pads both play on pads, otherwise P1 keeps the keyboard', async () => {
  const { localControl } = await import('../src/input.js');
  assert.equal(localControl('auto', 2, 2), 'pad');  // P1 = 1st pad, P2 = 2nd pad
  assert.equal(localControl('auto', 2, 1), 'kb');   // P1 keyboard, P2 the only pad
  assert.equal(localControl('auto', 1, 2), 'auto'); // one human: keyboard and 1st pad together
  assert.equal(localControl('kb', 2, 2), 'kb');     // an explicit setting wins
});

test('fatigue is felt: at energy 0 a player runs at 60% speed, reaches less, and long rallies drain at most rallyMax', async () => {
  const { ENERGY } = await import('../src/game.js');
  const run = (energy) => {
    const w = newWorld(); w.state = 'play';
    Object.assign(w.ball, { p: [0, -5, 0], v: [0, 0, 0], live: false });
    const p = w.players[0]; p.p = [-4, 8]; p.energy = energy;
    for (let i = 0; i < 30; i++) stepWorld(w, { 0: { move: [1, 0] } }, 1 / 60);
    return p.p[0] + 4;
  };
  const r = run(0) / run(1);
  assert.ok(Math.abs(r - (1 - ENERGY.slow)) < 0.05, `speed ratio ${r}`);
  const drain = (rally) => {
    const w = newWorld(); w.state = 'play'; w.rally = rally;
    Object.assign(w.ball, { p: [0, -5, 0], v: [0, 0, 0], live: false });
    for (let i = 0; i < 60; i++) stepWorld(w, { 0: { move: [1, 0] } }, 1 / 60);
    return 1 - w.players[0].energy;
  };
  assert.ok(Math.abs(drain(60) / drain(0) - ENERGY.rallyMax) < 0.01, `${drain(60)} vs ${drain(0)}`);
});

test('career form: a rusty player (-0.10) runs about 5% slower', () => {
  const run = (form) => {
    const w = newWorld({ form: { 0: form } }); w.state = 'play';
    const p = w.players[0]; p.p = [-4, 8];
    Object.assign(w.ball, { p: [0, -5, 0], v: [0, 0, 0], live: false });
    for (let i = 0; i < 60; i++) stepWorld(w, { 0: { move: [1, 0] } }, 1 / 60);
    return p.p[0] + 4;
  };
  const k = run(-0.1) / run(0);
  assert.ok(k < 0.97 && k > 0.93, `ratio ${k}`);
});

test('LT (edge) asks to eat, once', async () => {
  const { readGamepad } = await import('../src/input.js');
  let lt = false;
  navigator.getGamepads = () => [{ index: 0, axes: [0, 0], buttons: Array.from({ length: 8 }, (_, i) => ({ pressed: i === 6 && lt })) }];
  assert.equal(readGamepad(0, 0).eat, undefined);
  lt = true;
  assert.equal(readGamepad(0, 0).eat, true);
  assert.equal(readGamepad(0, 0).eat, undefined);  // held
  delete navigator.getGamepads;
});

test('key E (edge) asks to eat', async () => {  // fresh module with a fake window, as the browser would feed it
  let down; globalThis.addEventListener = (t, f) => { if (t === 'keydown') down = f; };
  const { readKeyboard } = await import('../src/input.js?kbd');
  delete globalThis.addEventListener;
  down({ code: 'KeyE' });
  assert.equal(readKeyboard(0).eat, true);
  assert.equal(readKeyboard(0).eat, undefined);
});

// a served ball that has bounced in the box, drifting past player `pid` on team 1's side
function serveReturn(pid) {
  const w = newWorld();
  w.state = 'play';
  Object.assign(w.match.rally, { phase: 'serveFlight', lastHitTeam: 0, bouncesSinceHit: 1 });
  for (const p of w.players) p.p = [p.id === pid ? 0 : 4.5, p.team === 0 ? 9 : -9];
  Object.assign(w.ball, { p: [0.6, 1.0, -6], v: [-1, 0, 0], w: [0, 0, 0], live: true });
  w.players[pid].p = [0, -6];
  let hit = null;
  for (let i = 0; i < 20 && !hit; i++) {
    stepWorld(w, { [pid]: { move: [0, 0], swing: i === 0 ? 'drive' : null, aim: 0 } }, 1 / 60);
    hit = w.events.find(e => e.type === 'hit');
    w.events.length = 0;
  }
  return hit;
}

test('only the receiver returns the serve: the partner cannot hit it', () => {
  const rid = receiverId(newWorld().match);
  assert.equal(rid, 2);
  assert.ok(serveReturn(rid), 'receiver hits');
  assert.equal(serveReturn(3), undefined, 'partner does not');
});

test('a serve nobody on the receiving side may return gives the point to the server', () => {
  const w = newWorld();
  w.state = 'play';
  Object.assign(w.match.rally, { phase: 'serveFlight', lastHitTeam: 0, bouncesSinceHit: 1 });
  w.players[3].p = [0, -6];  // partner right at the ball, swinging every frame
  Object.assign(w.ball, { p: [0.4, 0.8, -6], v: [0, -2, -3], w: [0, 0, 0], live: true });
  let pt = null;
  for (let i = 0; i < 600 && !pt; i++) {
    stepWorld(w, { 3: { move: [0, 0], swing: 'drive', aim: 0 }, 2: { move: [0, 0] } }, 1 / 60);
    pt = w.events.find(e => e.type === 'point');
    w.events.length = 0;
  }
  assert.equal(pt?.team, 0, JSON.stringify(pt) + ' ' + w.match.log.slice(-2));
});

test('serve aim is world x and stays inside the receiver\'s box half', () => {
  const m = newWorld().match;
  for (const pts of [[0, 0], [1, 0]]) {
    m.points = pts;
    const xs = Math.sign(serveX(m, 0));
    for (const a of [-1, 0, 1]) { const x = serveX(m, a) * xs; assert.ok(x >= 0.4 && x <= 4.2, `aim ${a}: ${x}`); }
    assert.ok(serveX(m, 1) > serveX(m, -1), 'pressing +x moves the target toward +x in both boxes');
  }
});

test('serve: holding a direction during the toss re-aims the serve', () => {
  const w = newWorld();
  stepWorld(w, { 0: { swing: 'serve', aim: 0 } }, 1 / 60);
  assert.equal(w.state, 'toss');
  stepWorld(w, { 0: { move: [0, 0], aim: 1 } }, 1 / 60);
  assert.equal(w.toss.aim, 1);
  assert.equal(w.serveAim, 1);
  stepWorld(w, { 0: { move: [0, 0], aim: 0 } }, 1 / 60);
  assert.equal(w.toss.aim, 1, 'letting go keeps the last aim');
});

// a rally of `rally` shots that team 0 wins on a double bounce in team 1's half
function longPoint(opts = {}, rally = 9) {
  const w = newWorld(opts);
  w.state = 'play'; w.rally = rally; w.t = 10; w.hl.hits = [7, 8.5];
  Object.assign(w.match.rally, { phase: 'rally', lastHitTeam: 0, bouncesSinceHit: 1 });
  Object.assign(w.ball, { p: [0, 0.3, -6], v: [0, -3, 0], w: [0, 0, 0], live: true });
  let pt = null;
  for (let i = 0; i < 60 && !pt; i++) { stepWorld(w, {}, 1 / 60); pt = w.events.find(e => e.type === 'point'); w.events.length = 0; }
  return { w, pt };
}

test('replay: a long rally sends a replay window of the last 2 shots; a short one does not', () => {
  const { pt } = longPoint();
  assert.equal(pt.team, 0);
  assert.ok(pt.replay && pt.replay.from === 7 - REPLAY.lead && pt.replay.to > pt.t && pt.replay.speed === REPLAY.speed, JSON.stringify(pt));
  assert.equal(longPoint({}, 3).pt.replay, undefined);
});

test('replay: offline the timer is unchanged; with holdReplay the next serve waits for it', () => {
  assert.ok(Math.abs(longPoint().w.timer - 2.2) < 0.1);
  const { w, pt } = longPoint({ holdReplay: true });
  const need = REPLAY.delay + (pt.replay.to - pt.replay.from) / pt.replay.speed;
  assert.ok(w.timer >= need, `${w.timer} >= ${need}`);
  for (let i = 0; i < 60 * 3; i++) stepWorld(w, {}, 1 / 60);
  assert.equal(w.state, 'dead', 'still waiting 3 s later');
});

test('replay: only the team that won the point can skip it', () => {
  const { w } = longPoint({ holdReplay: true });
  const before = w.timer;
  stepWorld(w, { 2: { skip: true } }, 1 / 60);  // the losers
  assert.ok(w.timer > before - 0.1 && w.replay, 'losers cannot skip');
  stepWorld(w, { 1: { skip: true } }, 1 / 60);  // a winner
  assert.ok(w.timer <= 0.5 && !w.replay, 'winners can');
});

test('replay: a serve that comes off the back glass is not a highlight, a ball played back off the glass is', () => {
  const w = newWorld();
  w.hl.bounced = true;
  w.events.length = 0;
  w.hl.offGlass = true; w.match.rally.phase = 'serveFlight';
  w.state = 'play';
  w.players[2].p = [0, -9]; w.players[2].want = 'drive';
  Object.assign(w.ball, { p: [0.5, 1, -9], v: [0, 0, 0], w: [0, 0, 0], live: true });
  w.match.rally.bouncesSinceHit = 1; w.match.rally.lastHitTeam = 0;
  stepWorld(w, { 2: { move: [0, 0], swing: 'drive' } }, 1 / 60);
  assert.equal(w.hl.glass, false, 'serve return off the glass');
  w.hl.offGlass = true;
  w.match.rally.phase = 'rally';
  w.players[0].p = [0, 9];
  Object.assign(w.ball, { p: [0.5, 1, 9], v: [0, 0, 0], w: [0, 0, 0], live: true });
  w.match.rally.lastHitTeam = 1; w.match.rally.bouncesSinceHit = 1;
  for (let i = 0; i < 5 && !w.hl.glass; i++) stepWorld(w, { 0: { move: [0, 0], swing: i ? null : 'drive' } }, 1 / 60);
  assert.equal(w.hl.glass, true, 'glass save in a rally');
});
