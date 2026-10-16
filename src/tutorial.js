// Training mode: 14 lessons inside the real simulation. A ball machine feeds the human (player 0, team 0, z > 0)
// and every lesson is judged from the same hit/contact events the rules use. Client only (DOM + three.js).
import * as THREE from 'three';
import { aimVelocity } from './physics.js';
import { newMatch, servePosition } from './rules.js';

// key names per device; the instructions follow whichever device was used last
const KEYS = {
  kb: { move: 'WASD / arrow keys', hit: 'Space', lob: 'K', smash: 'L', chiquita: 'U', slice: 'F', contra: 'O', left: 'A', right: 'D', cam: 'C', replay: 'R', next: 'Enter' },
  pad: { move: 'left stick', hit: 'A', lob: 'B', smash: 'Y', chiquita: 'X', slice: 'LB', contra: 'RT', left: 'stick ←', right: 'stick →', cam: 'View', replay: 'R3', next: 'Start → menu' },
};
const OVERHEAD = ['smash', 'bandeja', 'vibora', 'bajada', 'rulo'];
const landed = (a) => a.land && a.land[1] < 0;  // first bounce after your hit was on the opponent's side

// kind: move | serve | feed | ui | match. feed(p, R) -> [landX, landZ, flightTime] on YOUR side (R = racket side, +1 right-handed).
const LESSONS = [
  { id: 'move', title: 'Movement', kind: 'move', need: 4, start: [0, 8],
    text: (k) => `Use <b>${k.move}</b> to walk onto the yellow rings on the court.`,
    rings: [[-3, 8.5], [3, 8.5], [3, 4], [-3, 4]] },
  { id: 'serve', title: 'Serve', kind: 'serve', need: 3,
    text: (k) => `Press <b>${k.hit}</b> to serve: drop the ball, let it bounce, and hit underhand into the diagonal service box. You can adjust your position with <b>${k.move}</b> before serving.`,
    judge: (a) => a.shot === 'serve' && landed(a) },
  { id: 'slice', title: 'Slice Serve', kind: 'serve', need: 1,
    text: (k) => `Press <b>${k.slice}</b> to hit a slice serve: the ball stays low and curves sideways.`,
    judge: (a) => a.shot === 'serve' && a.slice && landed(a) },
  { id: 'forehand', title: 'Forehand', kind: 'feed', need: 3, start: [1.2, 8.3],
    feed: (p, R) => [p[0] + 0.9 * R, p[1] - 1.3, 1.15],
    text: (k) => `The ball is coming to your forehand side. Press <b>${k.hit}</b> as it approaches to send it over the net.`,
    judge: landed },
  { id: 'backhand', title: 'Backhand', kind: 'feed', need: 3, start: [-1.2, 8.3],
    feed: (p, R) => [p[0] - 0.9 * R, p[1] - 1.3, 1.15],
    text: (k) => `Now the ball comes to your backhand side. Press <b>${k.hit}</b> to return it across the net.`,
    judge: landed },
  { id: 'aim', title: 'Aiming', kind: 'feed', need: 2, start: [0, 8.3], zones: [[-5, -1, -10, 0], [1, 5, -10, 0]],
    feed: (p, R) => [p[0] + 0.7 * R, p[1] - 1.3, 1.15],
    text: (k, n) => n === 0 ? `Hold <b>${k.left}</b> while hitting to aim into the <b>left</b> target zone.` : `Now hold <b>${k.right}</b> while hitting to aim into the <b>right</b> target zone.`,
    judge: (a, n) => landed(a) && (n === 0 ? a.land[0] < -1 : a.land[0] > 1) },
  { id: 'lob', title: 'Lob', kind: 'feed', need: 2, start: [0.5, 8.3], zones: [[-5, 5, -10, -7]],
    feed: (p, R) => [p[0] + 0.7 * R, p[1] - 1.3, 1.15],
    text: (k) => `Press <b>${k.lob}</b> to hit a high lob deep into the opponent's backcourt (yellow zone).`,
    hint: (a, n, k) => a.hit && a.shot !== 'lob' ? `Use ${k.lob} to hit a lob.` : null,
    judge: (a) => a.shot === 'lob' && landed(a) && a.land[1] < -7 },
  { id: 'chiquita', title: 'Chiquita', kind: 'feed', need: 2, start: [0.5, 8.3], zones: [[-5, 5, -4.5, 0]],
    feed: (p, R) => [p[0] + 0.7 * R, p[1] - 1.3, 1.15],
    text: (k) => `Press <b>${k.chiquita}</b> for a soft, short shot that drops right behind the net (yellow zone).`,
    hint: (a, n, k) => a.hit && a.shot !== 'chiquita' ? `Use ${k.chiquita} for a chiquita.` : null,
    judge: (a) => a.shot === 'chiquita' && landed(a) && a.land[1] > -4.5 },
  { id: 'volley', title: 'Volley', kind: 'feed', need: 3, start: [0.8, 3.2],
    feed: (p, R) => [p[0] + 0.5 * R, 6.8, 1.0],
    text: (k) => `You are at the net. Hit the ball in the air with <b>${k.hit}</b> before it bounces.`,
    hint: (a) => a.bounced ? 'The ball bounced — hit it in the air before it touches the floor.' : null,
    judge: (a) => !a.bounced && landed(a) },
  { id: 'smash', title: 'Smash', kind: 'feed', need: 2, start: [0.4, 3.8],
    feed: (p) => [p[0], p[1] + 0.8, 2.0],
    text: (k) => `A high lob is coming! Get under it and press <b>${k.smash}</b> (or <b>${k.hit}</b>) to crush an overhead.`,
    judge: (a) => OVERHEAD.includes(a.shot) && landed(a) },
  { id: 'glass', title: 'Off the Glass', kind: 'feed', need: 2, start: [1, 6.6],
    feed: (p, R) => [p[0] + 0.5 * R, 8.6, 0.85],
    text: (k) => `The ball will bounce in front of you and hit the back glass. <b>Wait for it</b>: let it pass, then hit <b>${k.hit}</b> after it rebounds off the glass.`,
    hint: (a) => a.hit && !a.glass ? 'Too early — wait for the ball to rebound off the back glass first.' : null,
    judge: (a) => a.glass && landed(a) },
  { id: 'contra', title: 'Contrapared', kind: 'feed', need: 1, start: [1.2, 7.8],
    feed: (p, R) => [p[0] + 0.4 * R, 9.3, 1.1],
    hint: (a, n, k) => a.hit && a.shot !== 'contra' ? `Use ${k.contra} for a contrapared.` : null,
    text: (k) => `The ball is getting behind you. Press <b>${k.contra}</b> to blast it against your own glass wall so it rebounds over the net. (Hold ${k.left} / ${k.right} for the side glass.)`,
    judge: (a) => a.shot === 'contra' && landed(a) },
  { id: 'ui', title: 'Camera & Replay', kind: 'ui', need: 3,
    text: (k) => `Press <b>${k.cam}</b> twice to cycle the camera angle, then press <b>${k.replay}</b> to watch an instant replay.` },
  { id: 'match', title: 'Mini Match', kind: 'match', need: 3,
    text: () => `Win 3 points against the Rookie AI. Put everything you learned into action!` },
];

const STORE = 'padel.tutorial';
const loadDone = () => { try { return new Set(JSON.parse(localStorage.getItem(STORE) || '[]')); } catch { return new Set(); } };
const saveDone = (s) => { try { localStorage.setItem(STORE, JSON.stringify([...s])); } catch { /* private mode: progress just isn't kept */ } };

export function createTutorial({ world: w, scene, hand, camName, replaying, consumePressed, onExit }) {
  const R = hand === 'left' ? -1 : 1;
  const done = loadDone();
  let li = LESSONS.findIndex(l => !done.has(l.id)); if (li < 0) li = 0;
  let count = 0, att = null, wait = 0, msg = '', msgT = 0, device = 'kb', camSeen = null, camChanges = 0, sawReplay = false;

  // --- DOM panel
  const el = document.createElement('div');
  el.id = 'tutorial';
  el.innerHTML = '<div class="tut-step"></div><div class="tut-title"></div><div class="tut-text"></div><div class="tut-dots"></div><div class="tut-msg"></div><div class="tut-foot"></div>';
  document.body.appendChild(el);
  const $ = (c) => el.querySelector(c);
  addEventListener('keydown', () => { device = 'kb'; });

  // --- floor markers: rings for the movement lesson, translucent target zones on the opponent court
  const marks = new THREE.Group(); scene.add(marks);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xd8f53a, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const zoneMat = new THREE.MeshBasicMaterial({ color: 0xd8f53a, transparent: true, opacity: 0.22, depthWrite: false });
  function drawMarks(l) {
    marks.clear();
    if (l.kind === 'move') l.rings.slice(count, count + 1).forEach(([x, z]) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 32), ringMat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); marks.add(m);
    });
    (l.zones || []).forEach(([x0, x1, z0, z1], i) => {
      if (l.id === 'aim' && i !== count) return;  // show only the zone being asked for
      const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), zoneMat); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.015, (z0 + z1) / 2); marks.add(m);
    });
  }

  function render() {
    const l = LESSONS[li], k = KEYS[device];
    $('.tut-step').textContent = `TRAINING · LESSON ${li + 1}/${LESSONS.length}`;
    $('.tut-title').textContent = l.title + (done.has(l.id) ? ' ✓' : '');
    $('.tut-text').innerHTML = l.text(k, count);
    $('.tut-dots').innerHTML = Array.from({ length: l.need }, (_, i) => `<i class="${i < count ? 'on' : ''}"></i>`).join('');
    $('.tut-msg').textContent = msgT > 0 ? msg : '';
    $('.tut-foot').innerHTML = `<b>${k.next}</b>: skip lesson · ${LESSONS.map((x, i) => `<span class="${done.has(x.id) ? 'ok' : ''}${i === li ? ' cur' : ''}">${i + 1}</span>`).join('')}`;
  }
  const say = (t, s = 1.4) => { msg = t; msgT = s; };

  // --- lesson flow
  function begin(i) {
    li = i; count = 0; att = null; wait = 0.6; camChanges = 0; sawReplay = false; camSeen = camName();
    const l = LESSONS[li], me = w.players[0], opp = w.players[2];
    opp.active = l.kind === 'match';
    w.match = newMatch({ players: 2, sets: 1, goldenPoint: true });
    w.ball.live = false; w.ball.p = [0, -5, 0];
    if (l.start) me.p = [...l.start];
    opp.p = [0, -8.5]; opp.f = 0; opp.anim = 'idle';
    me.f = Math.PI;
    if (l.kind === 'match') { w.state = 'dead'; w.timer = 0.01; }  // next step: normal reset into a serve
    else { w.state = 'over'; w.timer = 1e9; }
    drawMarks(l); render();
  }
  function pass() {
    const l = LESSONS[li];
    done.add(l.id); saveDone(done);
    if (li + 1 < LESSONS.length) { say(`✓ ${l.title} complete!`, 1.6); setTimeout(() => begin(li + 1), 1600); }
    else finish();
  }
  function finish() {
    marks.clear();
    el.classList.add('final');
    const k = KEYS[device];
    const all = LESSONS.every(l => done.has(l.id));
    el.innerHTML = `<div class="tut-title">${all ? '🏆 Training Complete!' : 'Training Finished'}</div>${all ? '' : '<div class="tut-step">You can retry any ○ lessons from TRAINING in the main menu</div>'}<div class="tut-text">${LESSONS.map(l => `${done.has(l.id) ? '✓' : '○'} ${l.title}`).join('<br>')}</div><div class="tut-foot"><b>${k.next}</b>: main menu</div>`;
    li = -1;
  }
  function verdict(ok) {
    const l = LESSONS[li], a = att;
    att = null; wait = 1.3;
    w.state = 'over'; w.timer = 1e9;
    if (ok) { count++; say(['Great!', 'Awesome!', 'Spot on!', 'Nailed it!'][count % 4]); if (count >= l.need) return pass(); }
    else say(l.hint?.(a, count, KEYS[device]) || (a.hit ? 'Missed — try again!' : 'You missed the ball — try again!'), 2);
    drawMarks(l); render();
  }

  function nextAttempt() {
    const l = LESSONS[li], me = w.players[0];
    w.match = newMatch({ players: 2, sets: 1, goldenPoint: true });
    att = { shot: null, hit: false, bounced: false, glass: false, slice: false, land: null };
    if (l.kind === 'serve') {
      w.match.points[0] = count % 2;  // alternate deuce / advantage side
      me.p = [...servePosition(w.match)];
      w.ball.live = false; w.state = 'serve';
      return;
    }
    // ball machine: from the opponent's baseline to a landing spot on your side
    if (l.start) me.p = [...l.start];
    const [tx, tz, t] = l.feed(me.p, R);
    Object.assign(w.match.rally, { phase: 'rally', lastHitTeam: 1, bouncesSinceHit: 0 });
    const b = w.ball;
    b.p = [Math.random() * 2 - 1, 1.0, -8]; b.w = [0, 0, 0]; b.live = true;
    b.v = aimVelocity(b.p, [tx, tz], t, b.w, true);
    w.state = 'play';
  }

  begin(li);

  return {
    // after each simulation step, before main consumes world.events
    onStep() {
      if (li < 0) return;
      const l = LESSONS[li];
      if (l.kind === 'move') {
        const [x, z] = l.rings[count] || [];
        if (x != null && Math.hypot(w.players[0].p[0] - x, w.players[0].p[1] - z) < 0.5) {
          count++; say('Nice!', 0.8);
          if (count >= l.need) pass(); else { drawMarks(l); render(); }
        }
        return;
      }
      if (l.kind === 'match') {
        for (const e of w.events) if (e.type === 'point' && e.team === 0) { count++; say('Your point!'); render(); if (count >= l.need) return pass(); }
        return;
      }
      if (!att) return;
      let v = null;
      for (const e of w.events) {
        if (e.type === 'fault') v = false;
        if (e.type === 'hit' && e.pid === 0 && !att.hit) { att.hit = true; att.shot = e.shot; att.slice = w.ball.w[1] !== 0; continue; }
        if (e.type === 'point' && v == null && !att.land) v = false;  // the ball died before reaching the other side
        if (e.type !== 'contact') continue;
        const own = e.p[2] > 0;
        if (!att.hit) { if (own && e.kind === 'floor') att.bounced = true; if (own && e.kind === 'glass') att.glass = true; continue; }
        if (e.kind === 'floor' && !att.land) { att.land = [e.p[0], e.p[2]]; if (v == null) v = !own && l.judge(att, count); }
        else if (e.kind === 'out' || e.kind === 'mesh' || (!own && e.kind === 'glass' && !att.land)) { if (v == null) v = false; }
      }
      if (v != null) verdict(v);
    },
    // every rendered frame
    skip() { if (li < 0) return onExit(); if (li + 1 < LESSONS.length) begin(li + 1); else finish(); },
    onFrame(dt) {
      if (consumePressed('Enter')) return this.skip();
      if (li < 0) return;
      for (const gp of navigator.getGamepads?.() || []) if (gp && (gp.buttons.some(b => b.pressed) || gp.axes.some(a => Math.abs(a) > 0.5))) device = 'pad';
      const l = LESSONS[li];
      if (l.kind === 'ui') {
        const c = camName(); if (c !== camSeen) { camSeen = c; camChanges++; }
        if (replaying()) sawReplay = true;
        const n = Math.min(2, camChanges) + (sawReplay ? 1 : 0);
        if (n !== count) { count = n; if (count >= l.need) pass(); }
      }
      if ((l.kind === 'feed' || l.kind === 'serve') && !att && (wait -= dt) <= 0) nextAttempt();
      if (msgT > 0) msgT -= dt;
      render();
    },
    lessons: LESSONS,
    get state() { return { li, count, id: LESSONS[li]?.id, need: LESSONS[li]?.need, att: !!att, done: [...done] }; },
  };
}
