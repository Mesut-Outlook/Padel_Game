import * as THREE from 'three';
import venues from '../data/venues.json';
import characters from '../data/characters.json';
import rackets from '../data/rackets.json';
import { newWorld, stepWorld, snapshot } from './game.js';
import { scoreText } from './rules.js';
import { buildVenue, buildBall } from './court.js';
import { createAvatar } from './player.js';
import { createCameraRig } from './camera.js';
import { createReplay } from './replay.js';
import { aiInput } from './ai.js';
import { readKeyboard, readGamepad, consumePressed } from './input.js';
import { connect } from './net.js';
import { predict } from './physics.js';

const $ = (id) => document.getElementById(id);
const fill = (sel, items, label) => { sel.innerHTML = items.map((x, i) => `<option value="${i}">${label(x)}</option>`).join(''); };
fill($('char'), characters, c => `${c.name} (${c.countryCode}, ${c.gender === 'f' ? 'K' : 'E'})`);
fill($('venue'), venues, v => `${v.name} — ${v.city}`);
fill($('racket'), rackets, r => `${r.name} · ${r.shape} · G${r.stats.power}/K${r.stats.control}`);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 250);
camera.position.set(0, 7, 17);
const resize = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
addEventListener('resize', resize); resize();

window.__padel = () => ({ world, avatars, scene, camera, rig, renderer, stepWorld, inputs });
const rig = createCameraRig(camera, renderer.domElement);
const replay = createReplay(15, 60);
let world, avatars = [], ballView, humans = [], aiLevel = 'club', venueGroup, msgTimer = 0, net = null, marker;

async function setupScene(venue, ids, roster, rk) {
  $('menu').hidden = true;
  $('msg').textContent = 'Yükleniyor…';
  scene.clear();
  venueGroup = buildVenue(scene, venue);
  ballView = buildBall(scene);
  marker = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.17, 24), new THREE.MeshBasicMaterial({ color: 0xd8f53a, transparent: true, opacity: 0.8 }));
  marker.rotation.x = -Math.PI / 2; scene.add(marker);
  avatars = [];
  for (const id of ids) avatars[id] = await createAvatar(scene, roster[id], rk[id].color);
  const name = (t) => ids.filter(id => (id < 2 ? 0 : 1) === t).map(id => roster[id].name.split(' ').pop()).join(' / ');
  $('t0').textContent = name(0); $('t1').textContent = name(1);
  for (const id of ['hud', 'cam', 'help']) $(id).hidden = false;
  $('msg').textContent = '';
  last = performance.now();
  requestAnimationFrame(loop);
}

$('online').onclick = () => {
  const code = $('room').value.trim().toUpperCase();
  if (!code) { $('lobby').textContent = 'Önce bir oda kodu yaz.'; return; }
  const me = +$('char').value, players = +$('mode').value;
  const url = new URLSearchParams(location.search).get('server') ||
    (location.port === '5173' ? `ws://${location.hostname}:8080` : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  net = connect({
    url, code, char: me, stats: characters[me].stats, racket: rackets[+$('racket').value].stats,
    cfg: { players, sets: +$('sets').value, goldenPoint: $('golden').value === '1', ai: $('ai').value, venue: +$('venue').value },
    onError: (e) => { $('lobby').textContent = e; },
    onLobby: (l) => {
      $('lobby').innerHTML = `Oda <b>${l.code}</b> · koltuğun: ${net.seat} · oyuncular: ${l.taken.length}/${l.seats.length} (boşları AI)` +
        (l.started ? '' : ' — <b>herkes gelince “MAÇA BAŞLA”</b>');
      if (l.started && !avatars.length) {
        const ids = l.seats, roster = {}, rk = {};
        for (const id of ids) { roster[id] = characters[l.chars[id] ?? (id * 3 + 1) % characters.length]; rk[id] = rackets[id % rackets.length]; }
        humans = [net.seat];
        setupScene(venues[l.cfg.venue] || venues[0], ids, roster, rk);
      }
    },
  });
};

$('start').onclick = async () => {
  if (net) { net.start(); return; }
  const players = +$('mode').value;
  const nHumans = Math.min(+$('humans').value, players);
  aiLevel = $('ai').value;
  const me = characters[+$('char').value];
  const venue = venues[+$('venue').value];
  const myRacket = rackets[+$('racket').value];

  // roster: humans first fill team 0 then team 1 (P1 keyboard, others gamepads)
  const ids = players === 2 ? [0, 2] : [0, 2, 1, 3];
  humans = ids.slice(0, nHumans);
  const others = characters.filter(c => c !== me).sort(() => Math.random() - 0.5);
  const roster = {};
  ids.forEach((id, i) => { roster[id] = i === 0 ? me : others[i]; });
  const pickRacket = (id) => id === 0 ? myRacket : rackets[Math.floor(Math.random() * rackets.length)];
  const rk = {};
  for (const id of ids) rk[id] = pickRacket(id);

  world = newWorld({
    players,
    match: { sets: +$('sets').value, goldenPoint: $('golden').value === '1' },
    stats: Object.fromEntries(ids.map(id => [id, roster[id].stats])),
    rackets: Object.fromEntries(ids.map(id => [id, rk[id].stats])),
  });

  await setupScene(venue, ids, roster, rk);
};

function flash(text, sec = 1.8) { $('msg').textContent = text; msgTimer = sec; }

const STEP = 1 / 60;
let last = 0, acc = 0, rallyFlags = {};

function inputs() {
  const inp = {};
  for (const pl of world.players) {
    if (!pl.active) continue;
    const h = humans.indexOf(pl.id);
    if (h === 0) inp[pl.id] = readKeyboard(pl.team);
    else if (h > 0) inp[pl.id] = readGamepad(h - 1, pl.team) || aiInput(world, pl.id, aiLevel);
    else inp[pl.id] = aiInput(world, pl.id, aiLevel);
  }
  return inp;
}

function handleEvents(events, score, winner) {
  for (const e of events) {
    if (e.type === 'hit') {
      rallyFlags.bounced = false;
      if (e.shot === 'smash' || e.shot === 'vibora') { rallyFlags.smash = true; replay.mark(e.shot); }
    } else if (e.type === 'contact' && e.kind === 'floor') rallyFlags.bounced = true;
    else if (e.type === 'contact' && e.kind === 'glass' && rallyFlags.bounced) rallyFlags.glass = true;
    else if (e.type === 'fault') flash('SERVİS HATASI', 1);
    else if (e.type === 'let') flash('LET', 1);
    else if (e.type === 'point') {
      const team = e.team === 0 ? $('t0').textContent : $('t1').textContent;
      const WHY = { 'double bounce': 'iki sekme', 'bounced own side': 'kendi sahasında sekti', 'hit own mesh': 'kendi teline', 'hit opponent wall directly': 'doğrudan cama', 'double fault': 'çift hata', out: 'dışarı', 'volleyed serve': 'servis vole', 'double hit': 'çift vuruş' };
      flash(`${team}\n${WHY[e.why] || e.why}`);
      // auto highlight: long rally, smash, or a ball played off the glass
      if (e.rally >= 8 || rallyFlags.smash || rallyFlags.glass) setTimeout(() => startReplay(true), 900);
      rallyFlags = {};
      if (winner != null) flash(`🏆 ${team} KAZANDI!`, 999);
    }
  }
  events.length = 0;
  const s = score;
  if (!s) return;
  $('setsHud').textContent = s.sets; $('pts').textContent = s.pts;
}

let replayCamBefore = null;
function startReplay(auto) {
  if (replay.playing) return;
  replayCamBefore = rig.name;
  rig.set(auto ? (Math.random() < 0.5 ? 'side' : 'ball') : rig.name);
  replay.play({ speed: auto ? 0.5 : 0.6 });
  $('replayTag').hidden = false;
}
function endReplay() { replay.stop(); $('replayTag').hidden = true; if (replayCamBefore) rig.set(replayCamBefore); replayCamBefore = null; }

function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (consumePressed('KeyC')) $('cam').textContent = '🎥 ' + rig.next();
  if (consumePressed('KeyR')) startReplay(false);
  if (consumePressed('Escape') && replay.playing) endReplay();
  let view;
  if (replay.playing) {
    view = replay.update(dt);
    if (!view) { endReplay(); view = snapshot(world); }
  } else if (net) {
    const pl = net.seat < 2 ? 0 : 1;
    const inp = readKeyboard(pl);
    net.send(inp);
    view = net.view();
    if (!view) { requestAnimationFrame(loop); return; }
    replay.record(view);
    handleEvents(net.events, net.score, net.winner);
  } else {
    acc += dt;
    while (acc >= STEP) { stepWorld(world, inputs(), STEP); replay.record(snapshot(world)); handleEvents(world.events, scoreText(world.match), world.match.winner); acc -= STEP; }
    view = snapshot(world);
  }
  // landing marker: where the ball will bounce next (offline only; online uses ball shadow)
  if (world && !net && world.ball.live && !replay.playing) {
    const c = predict(world.ball, 2).contacts.find(c => c.kind === 'floor');
    marker.visible = !!c; if (c) marker.position.set(c.p[0], 0.01, c.p[2]);
  } else if (marker) marker.visible = false;
  ballView.set(view.b);
  view.pl.forEach((s, id) => avatars[id]?.update(dt, s));
  const focus = humans[0] ?? 0;
  rig.update(dt, { ball: view.b, players: view.pl.map(s => ({ p: [s[0], s[1]], f: s[2] })), focus, team: focus < 2 ? 0 : 1 });
  if ($('cam').textContent === '') $('cam').textContent = '🎥 ' + rig.name;
  if (msgTimer > 0 && (msgTimer -= dt) <= 0) $('msg').textContent = '';
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
