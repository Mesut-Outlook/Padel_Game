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
import { readLocal, readGamepad, consumePressed, clearPressed } from './input.js';
import { connect } from './net.js';
import { predict } from './physics.js';
import { createFx } from './fx.js';
import { unlockAudio, toggleMute, setMusicDuck, sfxHit, sfxContact, sfxCrowd, sfxCrowdReact, sfxReward, sfxWhoosh, sfxSmashSlowMo, sfxSmashImpact, callout } from './audio.js';
import { initMenu } from './menu.js';
import { initCareer } from './careerui.js';
import { createTutorial } from './tutorial.js';
import { mountKeyHelp } from './helpkeys.js';

const $ = (id) => document.getElementById(id);
const matchOpts = () => ({ sets: parseInt($('sets').value), superTiebreak: $('sets').value === '3s', goldenPoint: $('golden').value === '1', starPoint: $('golden').value === 'star' });
const fill = (sel, items, label) => { sel.innerHTML = items.map((x, i) => `<option value="${i}">${label(x)}</option>`).join(''); };
fill($('char'), characters, c => `${c.name} (${c.countryCode}, ${c.gender === 'f' ? 'F' : 'M'})`);
fill($('venue'), venues, v => `${v.name} — ${v.city}`);
fill($('racket'), rackets, r => `${r.name} · ${r.shape} · P${r.stats.power}/C${r.stats.control}`);
initMenu();
initCareer({ startMatch, startOnline });
mountKeyHelp($('help'));
addEventListener('pointerdown', unlockAudio, { once: true });
addEventListener('keydown', unlockAudio, { once: true });

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

window.__padel = () => ({ world, avatars, scene, camera, rig, renderer, stepWorld, inputs, tut, humans, fx });
const rig = createCameraRig(camera, renderer.domElement);
const replay = createReplay(15, 60);
let onEnd = null, pointsWon = [0, 0], lastCfg = null;
let world, avatars = [], ballView, humans = [], aiLevel = 'club', venueGroup, msgTimer = 0, hypeTimer = 0, net = null, marker, loadingScene = false;
let styleStats = { pts: 0, streak: 0, maxRally: 0, smashes: 0, medals: [] };
const MEDALS = {
  wall:   ['🧱', 'WALL WIZARD'],
  smash:  ['⚡', 'SMASH MASTER'],
  iron:   ['🔥', 'IRON LUNG'],
  clutch: ['👑', 'CLUTCH KING'],
};

function resetStyleStats() {
  styleStats = { pts: 0, streak: 0, maxRally: 0, smashes: 0, medals: [] };
  renderStyleHud();
  if ($('hypeToast')) $('hypeToast').hidden = true;
}

function renderStyleHud() {
  const ptsEl = $('hsPts'), strEl = $('hsStreak'), medEl = $('hsMedals');
  if (!ptsEl) return;
  ptsEl.innerHTML = `STYLE <b>${styleStats.pts}</b> PTS`;
  if (strEl) {
    strEl.hidden = styleStats.streak < 2;
    if (styleStats.streak >= 2) strEl.textContent = `🔥 x${styleStats.streak >= 3 ? '2.0' : '1.5'} ON FIRE`;
  }
  if (medEl) medEl.textContent = styleStats.medals.map(k => MEDALS[k][0]).join(' ');
}

function showHype(text, pts = 0, sec = 1.05) {
  if (tut) return;
  const el = $('hypeToast');
  if (!el) return;
  $('htText').textContent = text;
  const pEl = $('htPts');
  pEl.hidden = !pts;
  if (pts) pEl.textContent = `+${pts} PTS`;
  el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  hypeTimer = sec;
}

function awardStyle(basePts, label = '', medalKey = null, tier = 1) {
  if (tut) return 0;
  const mult = styleStats.streak >= 3 ? 2 : styleStats.streak >= 2 ? 1.5 : 1;
  const gained = Math.round(basePts * mult);
  styleStats.pts += gained;
  let newMedal = null;
  if (medalKey && !styleStats.medals.includes(medalKey)) {
    styleStats.medals.push(medalKey);
    newMedal = MEDALS[medalKey];
  }
  renderStyleHud();
  sfxReward(newMedal ? 2 : tier);
  if (newMedal) showHype(`${newMedal[0]} ${newMedal[1]} UNLOCKED!`, gained, 1.35);
  else if (label) showHype(label, gained, 0.95);
  return gained;
}

async function setupScene(venue, ids, roster, rk) {
  loadingScene = true;
  $('menu').hidden = true;
  $('msg').textContent = 'Loading…';
  scene.clear();
  venueGroup = buildVenue(scene, venue);
  ballView = buildBall(scene);
  fx = createFx(scene);
  marker = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.17, 24), new THREE.MeshBasicMaterial({ color: 0xd8f53a, transparent: true, opacity: 0.8 }));
  marker.rotation.x = -Math.PI / 2; scene.add(marker);
  avatars = [];
  for (const id of ids) avatars[id] = await createAvatar(scene, roster[id], rk[id].color, rk[id].shape);
  const name = (t) => ids.filter(id => (id < 2 ? 0 : 1) === t).map(id => roster[id].name.split(' ').pop()).join(' / ');
  $('t0').textContent = name(0); $('t1').textContent = name(1);
  for (const id of ['hud', 'cam', 'help']) $(id).hidden = false;
  $('msg').textContent = '';
  acc = 0; freeze = 0; slow = 0; shake = 0; approach = 0; bannerMode = ''; rallyFlags = {};
  resetStyleStats();
  updateSmashBanner();
  setMusicDuck('point');
  last = performance.now();
  loadingScene = false;
  if (!looping) { looping = true; requestAnimationFrame(loop); }  // a restart reuses the running loop
}

// Online entry for the menu button and for Career. url defaults to ?server= / :8080 / same host. look = remote-visible appearance (its stats are ignored).
// status(text, lobby?) mirrors the #lobby line for callers that show their own panel; returns the net handle (or null if it did not connect).
export function startOnline({ url, code, players = 4, venue = 0, ai = 'club', match = {}, char = 0, stats, racket, public: isPublic, name, look, shoes, ball, onEnd: end, status } = {}) {
  unlockAudio();
  control = $('control').value;
  const say = (t, l) => { $('lobby').innerHTML = t; status?.(t, l); };
  // the static GitHub Pages build has no game server; ?server=wss://... points it at one
  if (!new URLSearchParams(location.search).get('server') && location.hostname.endsWith('github.io')) {
    say('Online mode requires a game server, which is not included in this static web build. You can play against the AI.');
    return null;
  }
  code = String(code || '').trim().toUpperCase();
  if (!code) { say('Enter a room code first.'); return null; }
  url ||= new URLSearchParams(location.search).get('server') ||
    (location.port === '5173' ? `ws://${location.hostname}:8080` : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  onEnd = end || null; pointsWon = [0, 0];
  net = connect({
    url, code, char, stats, racket, public: isPublic, name, look, shoes, ball,
    cfg: { players, ...match, ai, venue },
    onError: (e) => say(escapeText(e)),
    onLobby: (l) => {
      say(`Room <b>${l.code}</b> · your seat: ${net.seat} · players: ${l.taken.length}/${l.seats.length} (empty = AI)` +
        (l.started ? '' : ' — <b>click “START MATCH” when everyone is ready</b>'), l);
      if (l.started && !avatars.length) {
        const ids = l.seats, roster = {}, rk = {};
        for (const id of ids) {
          const base = characters[l.chars[id] ?? (id * 3 + 1) % characters.length], { stats: _ignored, ...lk } = l.looks?.[id] || {};
          roster[id] = { ...base, ...lk, ...(l.names?.[id] ? { name: l.names[id] } : {}) };
          rk[id] = rackets[id % rackets.length];
        }
        humans = [net.seat];
        setupScene(venues[l.cfg.venue] || venues[0], ids, roster, rk);
      }
    },
  });
  return net;
}
const escapeText = (t) => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

$('online').onclick = () => {
  const me = +$('char').value;
  startOnline({
    code: $('room').value, char: me, stats: characters[me].stats, racket: rackets[+$('racket').value].stats,
    players: +$('mode').value, match: matchOpts(), ai: $('ai').value, venue: +$('venue').value,
  });
};

$('start').onclick = async () => {
  if (net) { net.start(); return; }
  const tutorial = $('start').dataset.tutorial === '1';  // training mode: singles, you vs the ball machine
  const players = tutorial ? 2 : +$('mode').value;
  gameSpeed = +$('speed').value;
  control = $('control').value;
  const me = characters[+$('char').value];
  const myRacket = rackets[+$('racket').value];

  // roster: humans first fill team 0 then team 1 (P1 per menu choice, the others take the remaining pads)
  const ids = players === 2 ? [0, 2] : [0, 2, 1, 3];
  const others = characters.filter(c => c !== me).sort(() => Math.random() - 0.5);
  const roster = {}, rk = {};
  ids.forEach((id, i) => { roster[id] = i === 0 ? me : others[i]; rk[id] = i === 0 ? myRacket : rackets[Math.floor(Math.random() * rackets.length)]; });

  await startMatch({
    players, humans: tutorial ? 1 : Math.min(+$('humans').value, players), ai: tutorial ? 'rookie' : $('ai').value,
    sameTeam: !tutorial && players === 4 && $('sides').value === 'same',
    match: matchOpts(), roster, rackets: rk, venue: venues[+$('venue').value],
  });
  if (tutorial) {
    tut = createTutorial({ world, scene, hand: roster[0].hand, camName: () => rig.name, replaying: () => replay.playing, consumePressed, onExit: () => location.reload() });
  }
};

// One entry for every offline match. cfg = { players, humans, ai, match, roster: {id: Character}, rackets: {id: racket}, venue, shoes?: {id: {speed, agility}}, ball?: {speed, bounce}, sameTeam?, onEnd? }.
// onEnd gets team 0's MatchResult (+ score text) once; the menu key then returns to #career instead of the plain menu.
export async function startMatch(cfg) {
  lastCfg = cfg;
  unlockAudio();
  aiLevel = cfg.ai;
  onEnd = cfg.onEnd || null; pointsWon = [0, 0];
  const ids = cfg.players === 2 ? [0, 2] : [0, 2, 1, 3];
  humans = (cfg.sameTeam && cfg.humans === 2 ? [0, 1] : ids).slice(0, cfg.humans);  // P2 partners P1 instead of facing them
  // keyboard + controller: with several local humans the keyboard is P1's alone so the first pad goes to P2
  if (control === 'auto' && humans.length > 1) control = 'kb';
  world = newWorld({
    players: cfg.players,
    match: cfg.match,
    stats: Object.fromEntries(ids.map(id => [id, cfg.roster[id].stats])),
    rackets: Object.fromEntries(ids.map(id => [id, cfg.rackets[id].stats])),
    shoes: cfg.shoes, ball: cfg.ball,
  });
  await setupScene(cfg.venue, ids, cfg.roster, cfg.rackets);
}

// back to the menu after a match; career matches return to the career hub
function toMenu() {
  if (onEnd) history.replaceState(history.state, '', '#career');  // replace, not push: history.state carries the career backup when storage is blocked
  location.reload();
}

function flash(text, sec = 1.8, kicker = '', sub = '') {
  const el = $('msg');
  if (kicker || sub) {
    el.innerHTML = (kicker ? `<span class="msg-kicker">${kicker}</span>\n` : '') + escapeText(text) + (sub ? `<span class="msg-sub">${sub}</span>` : '');  // text can carry player names
  } else {
    el.textContent = text;
  }
  msgTimer = sec;
}

const STEP = 1 / 60;
let last = 0, acc = 0, rallyFlags = {};
// game feel: slower-than-real default pace, a short hit-stop on contact, camera kick on smashes
// pace follows the chosen level and creeps up as the match goes on; low levels also get a positioning assist
// (when you are not steering, your player drifts to where the AI would stand — you still choose every shot)
const LEVEL_PACE = { rookie: 0.85, club: 0.95, pro: 1.0, legend: 1.08 };
const ASSIST = { rookie: 0.8, club: 0.5, pro: 0.25, legend: 0 };
const pace = () => {
  const games = world.match.sets.reduce((n, s) => n + s[0] + s[1], 0);
  return Math.min(1.05, gameSpeed * (LEVEL_PACE[aiLevel] || 1) * (1 + Math.min(0.12, games * 0.015)));
};
let fx = null, tut = null, looping = false;
let control = 'auto', gameSpeed = 0.85, freeze = 0, shake = 0, lastHitter = null;
const shakeOff = new THREE.Vector3(), ballHold = new THREE.Vector3(), tmpV = new THREE.Vector3();
// smash: brief slow motion + smash cam (for your own smashes, or every smash when only AIs play)
let slow = 0, punchPid = null, bannerMode = '';
// whoosh when the ball flies past the focus player
const prevB = new THREE.Vector3();
let lastD = Infinity, nearD = Infinity;

// Shot coach (offline, for your player). An overhead you can take inside the service line slows the ball's
// approach and shows it from behind your player; every overhead / glass rebound / lob chance gets key hints.
const SHOT_KEYS = { kb: { smash: 'L', vibora: 'I', bandeja: 'Space', bajada: 'Space', lob: 'K' }, pad: { smash: 'Y', vibora: 'RB', bandeja: 'A', bajada: 'A', lob: 'B' } };
const SHOT_NAME = { smash: 'SMASH', vibora: 'VÍBORA', bandeja: 'BANDEJA', bajada: 'BAJADA', lob: 'LOB' };
let device = 'kb', approach = 0, armed = true, hintKey = '';  // armed: the next overhead chance may start a slow approach
addEventListener('keydown', () => { device = 'kb'; });
function showHint(list, title = '') {
  const key = device + title + list.join();
  if (key === hintKey) return;
  hintKey = key;
  const el = $('shotHint');
  el.hidden = !list.length;
  if (list.length) el.innerHTML = `<span class="sh-t">${title}</span>` + list.map((s, i) => `<span class="sh${i ? '' : ' best'}">${SHOT_NAME[s]} <kbd>${SHOT_KEYS[device][s]}</kbd></span>`).join('');
}

function setSmashBanner(mode, kicker = '', title = '', sub = '') {
  const b = $('smashBanner'), v = $('smashVignette');
  if (!b || !v) return;
  if (!mode) {
    b.hidden = true; v.hidden = true; b.classList.remove('hit'); bannerMode = '';
    return;
  }
  v.hidden = false;
  b.hidden = false;
  b.classList.toggle('hit', mode === 'hit');
  if (bannerMode !== mode) {
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  }
  bannerMode = mode;
  $('sbKicker').textContent = kicker;
  $('sbTitle').textContent = title;
  $('sbSub').innerHTML = sub;
}

function updateSmashBanner() {
  if (approach <= 0 && slow <= 0 && bannerMode) {
    setSmashBanner('');
    if (world?.state === 'play') setMusicDuck('rally');
  }
}

function coach(dt) {
  if (approach > 0) approach -= dt;
  const pid = humans[0];
  if (!world || net || pid == null || replay.playing || world.state !== 'play') {
    approach = 0; armed = true; updateSmashBanner(); return showHint([]);
  }
  const me = world.players[pid], b = world.ball, r = world.match.rally, zs = me.team === 0 ? 1 : -1;
  if (!b.live || r.lastHitTeam === me.team) {
    approach = 0; armed = true; updateSmashBanner(); return showHint([]);
  }
  // came off your back glass and is rising toward you: attack it
  if (r.bouncesSinceHit === 1 && b.p[2] * zs > 7 && b.v[2] * zs < 0 && b.p[1] > 1.5) return showHint(['bajada'], 'Glass rebound');
  if (r.bouncesSinceHit !== 0) return showHint([]);
  // where will the ball be high and within reach, before it bounces on your side?
  const { pts, contacts } = predict(b, 1.6);
  const land = contacts.find(c => c.kind === 'floor' && c.p[2] * zs > 0), tEnd = land ? land.t : 1.6;
  const hit = pts.find(q => q.t < tEnd && q.p[2] * zs > 0 && q.p[1] > 1.8 && q.p[1] < 2.9 && Math.hypot(q.p[0] - me.p[0], q.p[2] - me.p[1]) < 2.2);
  if (!hit) {
    const opps = world.players.filter(p => p.active && p.team !== me.team);
    if (opps.length && opps.every(o => Math.abs(o.p[1]) < 4.5) && Math.abs(me.p[1]) > 5) return showHint(['lob'], 'Opponents at net');
    if (approach <= 0) updateSmashBanner();
    return showHint([]);
  }
  const dist = (p) => Math.hypot(hit.p[0] - p.p[0], hit.p[2] - p.p[1]);
  if (world.players.some(p => p.active && p.team === me.team && p !== me && dist(p) < dist(me) - 0.3)) return showHint([]);  // partner's ball
  const depth = Math.abs(hit.p[2]);
  if (depth >= 6.95) return showHint(['bandeja', 'vibora', 'lob'], 'High ball');
  if (armed) {
    armed = false; approach = 1.6; rig.pov(1.6);
    sfxSmashSlowMo();
    const k = SHOT_KEYS[device];
    setSmashBanner(
      'approach',
      '⚡ SLOW MOTION · OVERHEAD LOCKED ⚡',
      depth < 4.5 ? 'SMASH TIME!' : 'OVERHEAD ZONE!',
      `PRESS <b>${k.smash}</b> SMASH · <b>${k.vibora}</b> VÍBORA · <b>${k.bandeja}</b> BANDEJA`
    );
  }
  showHint(depth < 4.5 ? ['smash', 'vibora', 'bandeja'] : ['vibora', 'bandeja', 'smash'], depth < 4.5 ? 'SMASH CHANCE' : 'Overhead shot');
}
const teamOf = (pid) => (pid < 2 ? 0 : 1);
const speak = (pid, good) => { const a = avatars[pid]; if (a) a.say(callout(a.ch, good)); };

// human not steering -> borrow the AI's positioning, scaled by the level's assist
function assisted(pl, inp) {
  const k = tut ? 0 : ASSIST[aiLevel] || 0;  // no help in training: the lessons test you
  if (!k || inp.move[0] || inp.move[1]) return inp;
  const m = aiInput(world, pl.id, aiLevel).move;
  return { ...inp, move: [m[0] * k, m[1] * k] };
}

function inputs() {
  const inp = {};
  for (const pl of world.players) {
    if (!pl.active) continue;
    const h = humans.indexOf(pl.id);
    if (h === 0) inp[pl.id] = assisted(pl, readLocal(pl.team, control));
    else if (h > 0) { const pad = readGamepad(control === 'kb' ? h - 1 : h, pl.team); inp[pl.id] = pad ? assisted(pl, pad) : aiInput(world, pl.id, aiLevel); }
    else inp[pl.id] = aiInput(world, pl.id, aiLevel);
  }
  return inp;
}

function handleEvents(events, score, winner) {
  const myTeam = humans.length ? teamOf(humans[0]) : 0;
  for (const e of events) {
    if (e.type === 'hit') {
      const wasAfterGlass = rallyFlags.afterGlass;
      rallyFlags.bounced = false;
      rallyFlags.afterGlass = false;
      rallyFlags.hits = (rallyFlags.hits || 0) + 1;
      rallyFlags.lastShot = e.shot;
      rallyFlags.lastQuality = e.quality;
      rallyFlags.lastWasGlassSave = !!(wasAfterGlass || e.shot === 'contra' || e.shot === 'bajada');
      if (e.shot === 'serve') setMusicDuck('rally');
      const power = e.speed ? (e.speed - 6) / 22 : e.shot === 'smash' ? 1 : 0.5;
      sfxHit(power);
      if (world) fx?.impact(world.ball.p, power, e.quality === 'perfect');
      sfxWhoosh(0.25 + 0.4 * power, 0, 0.18);  // racket swing through the air
      freeze = power > 0.7 ? 0.08 : 0.03;
      lastHitter = e.pid;
      const isHumanHit = humans.includes(e.pid) || (!humans.length && teamOf(e.pid) === 0);
      if (humans.includes(e.pid)) {  // your stroke ends the slow approach; overheads get the smash cam treatment
        const wasApproach = approach > 0;
        approach = 0; rig.pov(0);
        if (['smash', 'vibora', 'bandeja', 'bajada'].includes(e.shot)) {
          punchPid = e.pid; slow = 0.9; shake = 0.25;
          sfxSmashImpact(e.quality === 'perfect');
          const kmh = Math.round((e.speed || 22) * 3.6);
          setSmashBanner(
            'hit',
            e.quality === 'perfect' ? '🔥 PERFECT TIMING 🔥' : '💥 POWER OVERHEAD 💥',
            e.shot === 'smash' ? 'SUPER SMASH!' : `${SHOT_NAME[e.shot] || 'OVERHEAD'}!`,
            `<b>${kmh} KM/H</b> UNSTOPPABLE SHOT`
          );
        } else if (wasApproach) {
          setSmashBanner('');
          setMusicDuck('rally');
        }
      }
      // Mid-rally motivational micro-callouts & style points (tasteful: only on special shots or perfect timing)
      if (isHumanHit && e.shot !== 'serve') {
        if (e.shot === 'contra') awardStyle(50, '🧱 CONTRAPARED SAVE!', 'wall', 1);
        else if (e.shot === 'bajada') awardStyle(45, '💥 GLASS BAJADA!', 'wall', 1);
        else if (wasAfterGlass && e.quality === 'perfect') awardStyle(40, '🧱 OFF THE GLASS!', 'wall', 1);
        else if (e.quality === 'perfect' && e.shot === 'chiquita') awardStyle(35, '🎯 SILKY CHIQUITA!', null, 1);
        else if (e.quality === 'perfect' && e.shot === 'volley') awardStyle(30, '⚡ LASER VOLLEY!', null, 1);
        else if (e.quality === 'perfect' && power > 0.55) awardStyle(25, '✨ PERFECT TIMING!', null, 1);
      }
      // Realistic crowd reactions + 3D stand wave during exciting shots
      if (e.shot === 'smash' || e.shot === 'vibora') {
        rallyFlags.smash = true; replay.mark(e.shot); shake = 0.25;
        sfxCrowdReact('ooh');
        venueGroup?.userData.exciteCrowd?.(0.65);
        if (e.shot === 'smash' && !humans.length) { punchPid = e.pid; slow = 0.9; sfxSmashImpact(false); }
        if (Math.random() < 0.45) speak(e.pid, true);
      } else if (e.shot === 'contra' || e.shot === 'bajada' || wasAfterGlass) {
        sfxCrowdReact('gasp');
        venueGroup?.userData.exciteCrowd?.(0.5);
      } else if (rallyFlags.hits >= 10 && rallyFlags.hits % 3 === 1) {
        sfxCrowdReact('gasp');
        venueGroup?.userData.exciteCrowd?.(0.55);
      } else if (rallyFlags.hits >= 6 && rallyFlags.hits % 4 === 2) {
        sfxCrowdReact('cheer');
        venueGroup?.userData.exciteCrowd?.(0.35);
      }
    } else if (e.type === 'contact') {
      const speed = world?.ball ? Math.hypot(...world.ball.v) : 8;
      const wall = e.kind === 'glass' || e.kind === 'mesh', direct = wall && !rallyFlags.bounced && rallyFlags.hits > 0;  // no bounce since the last stroke
      sfxContact(e.kind, speed, direct);
      if (wall && e.p) fx?.wallHit(e.p, e.kind, direct, speed / 20);
      if (direct) shake = Math.max(shake, 0.12);
      if (e.kind === 'floor') rallyFlags.bounced = true;
      else if (e.kind === 'glass' && rallyFlags.bounced) { rallyFlags.glass = true; rallyFlags.afterGlass = true; }
    }
    else if (e.type === 'fault') { flash('SERVE FAULT', 1); sfxCrowdReact('murmur'); }
    else if (e.type === 'let') flash('LET', 1);
    else if (e.type === 'point') {
      pointsWon[e.team]++;
      approach = 0; slow = 0; setSmashBanner('');
      setMusicDuck('point');
      const rallyLen = e.rally || rallyFlags.hits || 1;
      if (rallyLen > styleStats.maxRally) styleStats.maxRally = rallyLen;
      const myWin = e.team === myTeam;
      if (myWin) styleStats.streak++; else styleStats.streak = 0;
      const cleanWinner = lastHitter != null && teamOf(lastHitter) === e.team && e.why === 'double bounce';
      const wasClutch = score?.board?.label && /GOLDEN|STAR|TIE/i.test(score.board.label);
      const isEpicPoint = rallyLen >= 8 || (cleanWinner && (rallyFlags.smash || rallyFlags.lastWasGlassSave)) || wasClutch;

      if (isEpicPoint) {
        sfxCrowdReact('roar');
        sfxCrowd(1.0);
        venueGroup?.userData.exciteCrowd?.(1.0);
      } else {
        sfxCrowd(Math.min(1, 0.35 + rallyLen / 10));
        venueGroup?.userData.exciteCrowd?.(Math.min(0.85, 0.35 + rallyLen / 14));
      }

      // Motivational point-end headline & style reward
      let kicker = '', bonus = 0;
      if (myWin && !tut) {
        if (wasClutch) {
          bonus = awardStyle(200, '', 'clutch', 2);
          kicker = `👑 CLUTCH POINT! · +${bonus} PTS`;
        } else if (rallyLen >= 10) {
          bonus = awardStyle(160, '', 'iron', 2);
          kicker = `🔥 MARATHON RALLY! (${rallyLen} SHOTS) · +${bonus} PTS`;
        } else if (cleanWinner && (rallyFlags.lastShot === 'smash' || rallyFlags.lastShot === 'vibora')) {
          styleStats.smashes++;
          bonus = awardStyle(120, '', styleStats.smashes >= 2 ? 'smash' : null, 2);
          kicker = `💥 UNSTOPPABLE WINNER! · +${bonus} PTS`;
        } else if (cleanWinner && rallyFlags.lastWasGlassSave) {
          bonus = awardStyle(130, '', 'wall', 2);
          kicker = `🧱 GLASS MASTERPIECE! · +${bonus} PTS`;
        } else if (cleanWinner) {
          bonus = awardStyle(80, '', null, 1);
          kicker = `⚡ CLEAN WINNER! · +${bonus} PTS`;
        } else if (rallyLen >= 7) {
          bonus = awardStyle(90, '', null, 1);
          kicker = `👏 GREAT RALLY! (${rallyLen} SHOTS) · +${bonus} PTS`;
        } else {
          awardStyle(40, '', null, 1);
        }
      } else {
        renderStyleHud();
        if (!myWin && rallyLen >= 10) kicker = `🔥 EPIC ${rallyLen}-SHOT RALLY`;
      }

      // last hitter reacts: celebrates a winner, groans at an error
      if (lastHitter != null && Math.random() < 0.75) speak(lastHitter, teamOf(lastHitter) === e.team);
      lastHitter = null;
      const team = e.team === 0 ? $('t0').textContent : $('t1').textContent;
      const WHY = { 'double bounce': 'double bounce', 'bounced own side': 'bounced on own side', 'hit own mesh': 'hit own mesh', 'hit opponent wall directly': 'direct wall out', 'double fault': 'double fault', out: 'out', 'volleyed serve': 'volleyed serve', 'double hit': 'double hit' };
      if (!tut) flash(`${team}\n${WHY[e.why] || e.why}`, 2.1, kicker);
      // auto highlight: long rally, smash, or a ball played off the glass
      if (!tut && (rallyLen >= 8 || rallyFlags.smash || rallyFlags.glass)) setTimeout(() => startReplay(true), 900);
      rallyFlags = {};
      if (!tut && winner != null) {
        if (onEnd && net) {  // online: no local world, the server's score decides
          const done = onEnd; onEnd = null;
          const sets = net.score?.board?.sets || [];
          done({ won: winner === myTeam, gamesWon: sets.reduce((n, g) => n + g[myTeam], 0), pointsWon: pointsWon[myTeam], scoring: 'sets', ai: 'online', style: styleStats.pts, score: net.score });
          onEnd = () => {};
        } else if (onEnd && world) {
          const done = onEnd; onEnd = null;
          done({ won: winner === 0, gamesWon: world.match.sets.reduce((n, g) => n + g[0], 0), pointsWon: pointsWon[0], points: [...pointsWon], style: styleStats.pts, games: world.match.sets.reduce((g, s) => [g[0] + s[0], g[1] + s[1]], [0, 0]), scoring: world.match.opts.pointsTo ? 'rally' : 'sets', ai: aiLevel, score: scoreText(world.match) });
          onEnd = () => {};  // keeps toMenu pointed at #career without paying twice
        }
        const medalsStr = styleStats.medals.length
          ? 'Medals: ' + styleStats.medals.map(k => `${MEDALS[k][0]} ${MEDALS[k][1]}`).join(' · ')
          : `Best Rally: ${styleStats.maxRally} shots`;
        flash(
          `🏆 ${team} WINS!`,
          999,
          `FINAL STYLE SCORE: ${styleStats.pts} PTS`,
          `${medalsStr} · Press Enter / Start for ${onEnd ? 'Career' : 'Main Menu'}`
        );
      }
    }
  }
  events.length = 0;
  const s = score;
  if (!s) return;
  renderHud(s);
}

// score board: rows per team with games per set, the current point and a ball marking the server
let hudKey = '';
function renderHud(s) {
  $('setsHud').textContent = s.sets; $('pts').textContent = s.pts;  // plain text kept for flashes and tools
  const b = s.board;
  if (!b) return;
  const names = [$('t0').textContent, $('t1').textContent], key = JSON.stringify(b) + names;
  if (key === hudKey) return;
  hudKey = key;
  const n = b.sets.length, cur = (i) => (i === n - 1 ? ' cur' : '');
  const c = (t, cls = '') => `<span class="${cls}">${t}</span>`;
  let h = c('') + c('') + b.sets.map((_, i) => c('SET ' + (i + 1), 'hd' + cur(i))).join('') + c('PTS', 'hd');
  for (const t of [0, 1]) {
    h += c(b.server === t ? '●' : '', 'srv') + c(escapeText(names[t]), 'nm')
      + b.sets.map((st, i) => c(st[t], 'g' + cur(i) + (i < n - 1 && st[t] > st[1 - t] ? ' won' : ''))).join('')
      + c(b.pts[t], 'pt');
  }
  const grid = $('hudGrid');
  grid.style.gridTemplateColumns = `14px auto repeat(${n}, 34px) 48px`;
  grid.innerHTML = h;
  $('hudLabel').textContent = n ? `SET ${b.setNo}` + (b.label ? ' · ' + b.label : '') : b.label;  // rally scoring has no sets
}

// Pause menu: P, Esc (when no replay is running) or pad Start. Freezes the match; online games keep running.
let paused = false, pauseSel = 0;
const padPrev = {};
function pauseItems() {
  const items = [['Resume', () => setPaused(false)]];
  if (tut) items.push(['Skip lesson', () => { setPaused(false); tut.skip(); }]);
  else if (!net) items.push(['Restart match', () => { setPaused(false); if (replay.playing) endReplay(); lastCfg?.onEnd ? startMatch(lastCfg) : $('start').click(); }]);  // career matches restart as career matches
  items.push(['Main menu', toMenu]);
  return items;
}
function updatePauseSel() {
  const box = $('pzItems');
  box.querySelectorAll('.pz-item').forEach((b, i) => {
    b.classList.toggle('sel', i === pauseSel);
  });
}
function drawPause() {
  const box = $('pzItems');
  const items = pauseItems();
  box.innerHTML = items.map(([t], i) => `<button type="button" class="pz-item${i === pauseSel ? ' sel' : ''}" data-i="${i}" tabindex="-1">${t}</button>`).join('');
  box.querySelectorAll('.pz-item').forEach(b => {
    b.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = +b.dataset.i;
      const act = pauseItems()[idx]?.[1];
      if (act) act();
    };
    b.onmouseenter = () => {
      pauseSel = +b.dataset.i;
      updatePauseSel();
    };
  });
  $('pzNote').textContent = net ? 'Online match continues in the background.' : '';
}
$('pause').onclick = (e) => {
  if (e.target === $('pause')) setPaused(false);
};
function setPaused(on) {
  paused = on;
  pauseSel = 0;
  $('pause').hidden = !on;
  if (on) drawPause();
  clearPressed();
  if (!on) last = performance.now();
}
function padEdge(i) {  // fresh press of one pad button (menu navigation while paused)
  const gp = [...(navigator.getGamepads?.() || [])].find(Boolean), on = !!gp?.buttons[i]?.pressed;
  const edge = on && !padPrev[i]; padPrev[i] = on; return edge;
}
function pauseInput() {
  const items = pauseItems(), n = items.length;
  const up = consumePressed('ArrowUp') | consumePressed('KeyW') | padEdge(12);
  const down = consumePressed('ArrowDown') | consumePressed('KeyS') | padEdge(13);
  const pick = consumePressed('Enter') | consumePressed('Space') | padEdge(0);
  const back = consumePressed('KeyP') | consumePressed('Escape') | consumePressed('Pause') | padEdge(1);
  if (up || down) {
    pauseSel = (pauseSel + (down ? 1 : n - 1)) % n;
    updatePauseSel();
  }
  if (pick) {
    const act = items[pauseSel]?.[1];
    if (act) act();
  } else if (back) {
    setPaused(false);
  }
}

let replayCamBefore = null;
function startReplay(auto) {
  if (replay.playing) return;
  replayCamBefore = rig.name;
  rig.set(auto ? (Math.random() < 0.5 ? 'side' : 'ball') : rig.name);
  replay.play({ speed: auto ? 0.5 : 0.6 });
  $('replayTag').hidden = false;
}
function endReplay() { replay.stop(); $('replayTag').hidden = true; if (replayCamBefore) rig.set(replayCamBefore); replayCamBefore = null; clearPressed(); }
// any key or pad button skips a replay (H = key help and M = mute keep their own job)
let skipReplay = false, padWasDown = false;
addEventListener('keydown', (e) => { if (replay.playing && !e.repeat && !['KeyH', 'KeyM', 'ShiftLeft', 'ShiftRight'].includes(e.code)) skipReplay = true; });
function padButtonDown() {
  const pads = [...(navigator.getGamepads?.() || [])];
  const down = pads.some(gp => gp?.buttons.some(b => b.pressed));
  if (down || pads.some(gp => gp?.axes.some(a => Math.abs(a) > 0.5))) device = 'pad';
  const edge = down && !padWasDown; padWasDown = down; return edge;
}

function loop(now) {
  if (loadingScene) {
    last = now;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
    return;
  }
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (paused) {
    pauseInput();
    // offline the world freezes; an online match can't be stopped, so it keeps running behind the menu
    if (paused && !net) { renderer.render(scene, camera); requestAnimationFrame(loop); return; }
    if (!paused) { requestAnimationFrame(loop); return; }
  }
  const over = world?.match.winner != null || net?.winner != null;
  if (consumePressed('KeyP') | consumePressed('Pause') | (!replay.playing && consumePressed('Escape'))) {
    if (over && !tut) { toMenu(); return; }  // Start / P on the final score: back to the menu
    setPaused(true); requestAnimationFrame(loop); return;
  }
  // skip first, so the press that starts a replay (R / R3) can't also end it
  if (padButtonDown() || skipReplay) { if (replay.playing) endReplay(); skipReplay = false; }
  if (consumePressed('KeyC')) $('cam').textContent = '🎥 ' + rig.next();
  if (consumePressed('KeyR')) startReplay(false);
  if (consumePressed('KeyM')) flash(toggleMute() ? '🔇 SOUND OFF' : '🔊 SOUND ON', 1);
  if (!tut && consumePressed('Enter') && (world?.match.winner != null || net?.winner != null)) { toMenu(); return; }
  let view;
  if (replay.playing) {
    view = replay.update(dt);
    if (!view) { endReplay(); view = snapshot(world); }
  } else if (net) {
    const pl = net.seat < 2 ? 0 : 1;
    const inp = readLocal(pl, control);
    net.send(inp);
    view = net.view();
    if (!view) { requestAnimationFrame(loop); return; }
    replay.record(view);
    handleEvents(net.events, net.score, net.winner);
  } else {
    if (freeze > 0) freeze -= dt; else acc += dt * pace() * (slow > 0 ? 0.35 : approach > 0 ? 0.45 : 1);
    if (slow > 0) slow -= dt;
    while (acc >= STEP) { stepWorld(world, inputs(), STEP); tut?.onStep(); replay.record(snapshot(world)); handleEvents(world.events, scoreText(world.match), world.match.winner); acc -= STEP; }
    view = snapshot(world);
  }
  updateSmashBanner();
  // landing marker: where the ball will bounce next (offline only; online uses ball shadow)
  if (world && !net && world.ball.live && !replay.playing) {
    const c = predict(world.ball, 2).contacts.find(c => c.kind === 'floor');
    marker.visible = !!c; if (c) marker.position.set(c.p[0], 0.01, c.p[2]);
  } else if (marker) marker.visible = false;
  view.pl.forEach((s, id) => {
    avatars[id]?.update(dt, s, view.b, id === humans[0] && approach > 0);
    if (avatars[id]) fx.trail(id, avatars[id], !!s[4]);
  });
  fx.update(dt);
  tut?.onFrame(dt);
  // serve: the ball sits in the server's hand, then eases onto the simulated drop
  const srv = view.pl.findIndex(s => s[3] === 'serveReady');
  if (view.s === 'serve' && avatars[srv]) avatars[srv].ballHand(ballHold).sub(tmpV.set(...view.b));
  else if (view.s === 'toss') ballHold.multiplyScalar(Math.exp(-dt / 0.08));
  else ballHold.set(0, 0, 0);
  ballView.set([view.b[0] + ballHold.x, view.b[1] + ballHold.y, view.b[2] + ballHold.z]);
  const focus = humans[0] ?? 0;
  coach(dt);
  if (punchPid != null) { const h = view.pl[punchPid]; if (h) rig.punch([h[0], h[1]], punchPid < 2 ? 0 : 1, 1.0); punchPid = null; }
  // ball flying past "you": fire a whoosh at the closest approach, louder when faster and nearer, panned to its side
  const sp = prevB.distanceTo(tmpV.set(...view.b)) / dt; prevB.copy(tmpV);
  const fp = view.pl[focus];
  if (fp && !replay.playing && sp < 60) {
    const d = Math.hypot(tmpV.x - fp[0], tmpV.y - 1.3, tmpV.z - fp[1]);
    if (d < lastD) nearD = d;
    else if (nearD < 3.5) { if (sp > 8) sfxWhoosh(Math.min(1, sp / 25) * (1 - nearD / 3.5), tmpV.project(camera).x); nearD = Infinity; }
    lastD = d;
  }
  venueGroup?.userData.updateCrowd?.(dt);
  rig.update(dt, { ball: view.b, players: view.pl.map(s => ({ p: [s[0], s[1]], f: s[2] })), focus, team: focus < 2 ? 0 : 1 });
  if ($('cam').textContent === '') $('cam').textContent = '🎥 ' + rig.name;
  if (msgTimer > 0 && (msgTimer -= dt) <= 0) $('msg').textContent = '';
  if (hypeTimer > 0 && (hypeTimer -= dt) <= 0 && $('hypeToast')) $('hypeToast').hidden = true;
  shakeOff.set(0, 0, 0);
  if (shake > 0) { shake -= dt; shakeOff.set(Math.random() - 0.5, Math.random() - 0.5, 0).multiplyScalar(shake * 0.5); }
  camera.position.add(shakeOff);
  renderer.render(scene, camera);
  camera.position.sub(shakeOff);
  requestAnimationFrame(loop);
}
