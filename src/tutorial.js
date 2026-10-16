// Training mode: 14 lessons inside the real simulation. A ball machine feeds the human (player 0, team 0, z > 0)
// and every lesson is judged from the same hit/contact events the rules use. Client only (DOM + three.js).
import * as THREE from 'three';
import { aimVelocity } from './physics.js';
import { newMatch, servePosition } from './rules.js';

// key names per device; the instructions follow whichever device was used last
const KEYS = {
  kb: { move: 'WASD / ok tuşları', hit: 'Space', lob: 'K', smash: 'L', chiquita: 'U', slice: 'F', contra: 'O', left: 'A', right: 'D', cam: 'C', replay: 'R', next: 'Enter' },
  pad: { move: 'sol çubuk', hit: 'A', lob: 'B', smash: 'Y', chiquita: 'X', slice: 'LB', contra: 'RT', left: 'çubuk ←', right: 'çubuk →', cam: 'View', replay: 'R3', next: 'Start → menü' },
};
const OVERHEAD = ['smash', 'bandeja', 'vibora', 'bajada', 'rulo'];
const landed = (a) => a.land && a.land[1] < 0;  // first bounce after your hit was on the opponent's side

// kind: move | serve | feed | ui | match. feed(p, R) -> [landX, landZ, flightTime] on YOUR side (R = racket side, +1 right-handed).
const LESSONS = [
  { id: 'move', title: 'Hareket', kind: 'move', need: 4, start: [0, 8],
    text: (k) => `<b>${k.move}</b> ile yerdeki sarı halkalara git.`,
    rings: [[-3, 8.5], [3, 8.5], [3, 4], [-3, 4]] },
  { id: 'serve', title: 'Servis', kind: 'serve', need: 3,
    text: (k) => `<b>${k.hit}</b> ile servis at: top bırakılır, seker, alttan vurulur. Çapraz kutuya düşmeli. Atmadan önce <b>${k.move}</b> ile servis yerini kaydırabilirsin.`,
    judge: (a) => a.shot === 'serve' && landed(a) },
  { id: 'slice', title: 'Slice servis', kind: 'serve', need: 1,
    text: (k) => `<b>${k.slice}</b> ile slice servis at: top alçak gider ve yana kıvrılır.`,
    judge: (a) => a.shot === 'serve' && a.slice && landed(a) },
  { id: 'forehand', title: 'Forehand', kind: 'feed', need: 3, start: [1.2, 8.3],
    feed: (p, R) => [p[0] + 0.9 * R, p[1] - 1.3, 1.15],
    text: (k) => `Top raket tarafına geliyor. Yaklaşınca <b>${k.hit}</b>: karşı sahaya düşür.`,
    judge: landed },
  { id: 'backhand', title: 'Backhand', kind: 'feed', need: 3, start: [-1.2, 8.3],
    feed: (p, R) => [p[0] - 0.9 * R, p[1] - 1.3, 1.15],
    text: (k) => `Bu sefer top diğer tarafına, backhand'ine geliyor. <b>${k.hit}</b> ile karşıya gönder.`,
    judge: landed },
  { id: 'aim', title: 'Yön verme', kind: 'feed', need: 2, start: [0, 8.3], zones: [[-5, -1, -10, 0], [1, 5, -10, 0]],
    feed: (p, R) => [p[0] + 0.7 * R, p[1] - 1.3, 1.15],
    text: (k, n) => n === 0 ? `Vururken <b>${k.left}</b> basılı tut: topu <b>sol</b> bölgeye gönder.` : `Şimdi <b>${k.right}</b> basılı tut: topu <b>sağ</b> bölgeye gönder.`,
    judge: (a, n) => landed(a) && (n === 0 ? a.land[0] < -1 : a.land[0] > 1) },
  { id: 'lob', title: 'Lob', kind: 'feed', need: 2, start: [0.5, 8.3], zones: [[-5, 5, -10, -7]],
    feed: (p, R) => [p[0] + 0.7 * R, p[1] - 1.3, 1.15],
    text: (k) => `<b>${k.lob}</b> ile yüksek lob at: rakip sahanın dibine (sarı bölge) düşmeli.`,
    hint: (a, n, k) => a.hit && a.shot !== 'lob' ? `Lob için ${k.lob} tuşunu kullan.` : null,
    judge: (a) => a.shot === 'lob' && landed(a) && a.land[1] < -7 },
  { id: 'chiquita', title: 'Chiquita', kind: 'feed', need: 2, start: [0.5, 8.3], zones: [[-5, 5, -4.5, 0]],
    feed: (p, R) => [p[0] + 0.7 * R, p[1] - 1.3, 1.15],
    text: (k) => `<b>${k.chiquita}</b> ile yumuşak, kısa top: filenin hemen arkasına (sarı bölge) düşür.`,
    hint: (a, n, k) => a.hit && a.shot !== 'chiquita' ? `Chiquita için ${k.chiquita} tuşunu kullan.` : null,
    judge: (a) => a.shot === 'chiquita' && landed(a) && a.land[1] > -4.5 },
  { id: 'volley', title: 'Vole', kind: 'feed', need: 3, start: [0.8, 3.2],
    feed: (p, R) => [p[0] + 0.5 * R, 6.8, 1.0],
    text: (k) => `File önündesin. Top yere değmeden <b>${k.hit}</b> ile vole vur.`,
    hint: (a) => a.bounced ? 'Top sekti: yere değmeden vur.' : null,
    judge: (a) => !a.bounced && landed(a) },
  { id: 'smash', title: 'Smaç', kind: 'feed', need: 2, start: [0.4, 3.8],
    feed: (p) => [p[0], p[1] + 0.8, 2.0],
    text: (k) => `Yüksek top geliyor. Altına gir, <b>${k.smash}</b> (ya da <b>${k.hit}</b>) ile üstten vur.`,
    judge: (a) => OVERHEAD.includes(a.shot) && landed(a) },
  { id: 'glass', title: 'Camdan oyun', kind: 'feed', need: 2, start: [1, 6.6],
    feed: (p, R) => [p[0] + 0.5 * R, 8.6, 0.85],
    text: (k) => `Top önünde sekip arkandaki cama çarpacak. <b>Hemen vurma</b>: geçmesine izin ver, camdan dönünce <b>${k.hit}</b> ile karşıya gönder.`,
    hint: (a) => a.hit && !a.glass ? 'Erken vurdun: önce camdan dönmesini bekle.' : null,
    judge: (a) => a.glass && landed(a) },
  { id: 'contra', title: 'Contrapared', kind: 'feed', need: 1, start: [1.2, 7.8],
    feed: (p, R) => [p[0] + 0.4 * R, 9.3, 1.1],
    hint: (a, n, k) => a.hit && a.shot !== 'contra' ? `Contrapared için ${k.contra} tuşunu kullan.` : null,
    text: (k) => `Top seni geçiyor. <b>${k.contra}</b> ile kendi camına vur, sekip karşıya geçsin. (Yan cam için ${k.left} / ${k.right} basılı tut.)`,
    judge: (a) => a.shot === 'contra' && landed(a) },
  { id: 'ui', title: 'Kamera ve tekrar', kind: 'ui', need: 3,
    text: (k) => `<b>${k.cam}</b> ile kamerayı 2 kez değiştir, sonra <b>${k.replay}</b> ile son sayının tekrarını izle.` },
  { id: 'match', title: 'Mini maç', kind: 'match', need: 3,
    text: (k) => `Çaylak AI'a karşı 3 sayı kazan. Öğrendiğin her şeyi kullan!` },
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
    $('.tut-step').textContent = `EĞİTİM · DERS ${li + 1}/${LESSONS.length}`;
    $('.tut-title').textContent = l.title + (done.has(l.id) ? ' ✓' : '');
    $('.tut-text').innerHTML = l.text(k, count);
    $('.tut-dots').innerHTML = Array.from({ length: l.need }, (_, i) => `<i class="${i < count ? 'on' : ''}"></i>`).join('');
    $('.tut-msg').textContent = msgT > 0 ? msg : '';
    $('.tut-foot').innerHTML = `<b>${k.next}</b>: dersi atla · ${LESSONS.map((x, i) => `<span class="${done.has(x.id) ? 'ok' : ''}${i === li ? ' cur' : ''}">${i + 1}</span>`).join('')}`;
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
    if (li + 1 < LESSONS.length) { say(`✓ ${l.title} tamam!`, 1.6); setTimeout(() => begin(li + 1), 1600); }
    else finish();
  }
  function finish() {
    marks.clear();
    el.classList.add('final');
    const k = KEYS[device];
    const all = LESSONS.every(l => done.has(l.id));
    el.innerHTML = `<div class="tut-title">${all ? '🏆 Eğitim tamamlandı!' : 'Eğitim bitti'}</div>${all ? '' : '<div class="tut-step">○ olan dersleri menüden EĞİTİM ile tekrar deneyebilirsin</div>'}<div class="tut-text">${LESSONS.map(l => `${done.has(l.id) ? '✓' : '○'} ${l.title}`).join('<br>')}</div><div class="tut-foot"><b>${k.next}</b>: ana menü</div>`;
    li = -1;
  }
  function verdict(ok) {
    const l = LESSONS[li], a = att;
    att = null; wait = 1.3;
    w.state = 'over'; w.timer = 1e9;
    if (ok) { count++; say(['Harika!', 'Süper!', 'Tam isabet!', 'Aynen böyle!'][count % 4]); if (count >= l.need) return pass(); }
    else say(l.hint?.(a, count, KEYS[device]) || (a.hit ? 'Olmadı, tekrar dene.' : 'Topa vurmadın, tekrar dene.'), 2);
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
          count++; say('Güzel!', 0.8);
          if (count >= l.need) pass(); else { drawMarks(l); render(); }
        }
        return;
      }
      if (l.kind === 'match') {
        for (const e of w.events) if (e.type === 'point' && e.team === 0) { count++; say('Sayı senin!'); render(); if (count >= l.need) return pass(); }
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
