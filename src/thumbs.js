// Offscreen thumbnail generator for character portraits (256x256), venues (400x225), and rackets (256x256).
// Uses a single shared WebGLRenderer, processes tasks sequentially via requestIdleCallback, and caches dataURLs in memory.
import * as THREE from 'three';
import { createAvatar, makeRacket } from './player.js';
import { buildVenue } from './court.js';

const cache = new Map();
const queue = [];
let renderer = null;
let compositeCanvas = null;
let idleHandle = null;
let busy = false;
let disposed = false;

const ric = typeof window !== 'undefined' && window.requestIdleCallback
  ? (cb) => window.requestIdleCallback(cb, { timeout: 120 })
  : (cb) => setTimeout(cb, 16);
const cic = typeof window !== 'undefined' && window.cancelIdleCallback
  ? (id) => window.cancelIdleCallback(id)
  : (id) => clearTimeout(id);

function getRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = false;
  }
  if (!compositeCanvas) {
    compositeCanvas = document.createElement('canvas');
  }
  return renderer;
}

function disposeScene(scene) {
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose?.();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) m.dispose?.();
    }
  });
}

async function renderPortrait(ch) {
  const r = getRenderer();
  const W = 256, H = 256;
  r.setSize(W, H, false);
  r.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.15);
  const key = new THREE.DirectionalLight(0xfff6e8, 1.55);
  key.position.set(1.2, 2.4, 2.0);
  const rim = new THREE.DirectionalLight(0x6ec6ff, 0.85);
  rim.position.set(-1.5, 2.0, -1.2);
  scene.add(hemi, key, rim);

  const avatar = await createAvatar(scene, ch, ch.outfit?.shirt || '#d8f53a', 'round');
  // Hide floating name/speech sprites and hand racket so portrait is clean head-and-shoulders
  avatar.holder.traverse((o) => { if (o.isSprite) o.visible = false; });
  const hand = avatar.bones[ch.hand === 'left' ? 'hand_l' : 'hand_r'];
  if (hand) hand.children.forEach((c) => { if (!c.isBone) c.visible = false; });

  avatar.update(0.05, [0, 0, -0.18, 'idle', null, 0, false]);
  avatar.holder.updateMatrixWorld(true);

  const headPos = new THREE.Vector3(0, 1.55, 0);
  const neckPos = new THREE.Vector3(0, 1.38, 0);
  if (avatar.bones.head) avatar.bones.head.getWorldPosition(headPos);
  if (avatar.bones.neck_01) avatar.bones.neck_01.getWorldPosition(neckPos);

  // frame the real head position (the idle stance leans forward/sideways), from the direction the body faces
  const focus = headPos.clone().lerp(neckPos, 0.35); focus.y += 0.02;
  const f = -0.18 + 0.25;  // body yaw from update() above, plus a slight three-quarter turn
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 10);
  camera.position.set(focus.x + Math.sin(f) * 0.95, focus.y - 0.06, focus.z + Math.cos(f) * 0.95);  // slightly below: heads tilt down in the stance
  camera.lookAt(focus);

  r.render(scene, camera);

  // Composite onto 256x256 gradient background in the character's shirt color
  compositeCanvas.width = W;
  compositeCanvas.height = H;
  const ctx = compositeCanvas.getContext('2d');
  const shirtHex = ch.outfit?.shirt || '#2f6fb5';
  const shortsHex = ch.outfit?.shorts || '#0b1520';

  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0d1b2a');
  bgGrad.addColorStop(0.55, shirtHex);
  bgGrad.addColorStop(1, shortsHex);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.5, H * 0.42, 12, W * 0.5, H * 0.45, W * 0.65);
  glow.addColorStop(0, 'rgba(255,255,255,0.28)');
  glow.addColorStop(0.6, 'rgba(11,21,32,0.18)');
  glow.addColorStop(1, 'rgba(7,13,20,0.68)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Subtle broadcast diagonal accent line
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.78);
  ctx.lineTo(W, H * 0.52);
  ctx.stroke();

  ctx.drawImage(r.domElement, 0, 0, W, H);
  avatar.dispose();
  return compositeCanvas.toDataURL('image/webp', 0.9);
}

async function renderVenue(venue) {
  const r = getRenderer();
  const W = 400, H = 225;
  r.setSize(W, H, false);
  r.setClearColor(venue.sky || '#0b1520', 1);

  const scene = new THREE.Scene();
  buildVenue(scene, venue);

  const camera = new THREE.PerspectiveCamera(42, W / H, 0.5, 200);
  camera.position.set(13.2, 11.2, 16.2);
  camera.lookAt(0, 0.6, 0);

  r.render(scene, camera);

  compositeCanvas.width = W;
  compositeCanvas.height = H;
  const ctx = compositeCanvas.getContext('2d');
  ctx.drawImage(r.domElement, 0, 0, W, H);

  disposeScene(scene);
  scene.clear();
  return compositeCanvas.toDataURL('image/jpeg', 0.88);
}

async function renderRacket(racket) {
  const r = getRenderer();
  const W = 256, H = 256;
  r.setSize(W, H, false);
  r.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x1b2a3b, 1.2);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(1.5, 2.0, 2.5);
  const rim = new THREE.DirectionalLight(0xd8f53a, 0.6);
  rim.position.set(-1.5, 1.0, -1.5);
  scene.add(hemi, key, rim);

  const mesh = makeRacket(racket.color, racket.shape);
  mesh.rotation.set(-0.06, 0.22, -0.18);
  scene.add(mesh);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 10);
  camera.position.set(0, 0.245, 0.74);
  camera.lookAt(0, 0.245, 0);

  r.render(scene, camera);

  compositeCanvas.width = W;
  compositeCanvas.height = H;
  const ctx = compositeCanvas.getContext('2d');
  const grad = ctx.createRadialGradient(W * 0.5, H * 0.45, 10, W * 0.5, H * 0.5, W * 0.62);
  grad.addColorStop(0, 'rgba(47, 111, 181, 0.32)');
  grad.addColorStop(1, 'rgba(10, 18, 28, 0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.drawImage(r.domElement, 0, 0, W, H);
  disposeScene(scene);
  scene.clear();
  return compositeCanvas.toDataURL('image/webp', 0.9);
}

function scheduleNext() {
  if (disposed || busy || idleHandle != null || queue.length === 0) return;
  idleHandle = ric(async () => {
    idleHandle = null;
    if (disposed || busy || queue.length === 0) return;
    busy = true;
    const task = queue.shift();
    try {
      let url = cache.get(task.key);
      if (!url) {
        url = await task.fn();
        cache.set(task.key, url);
      }
      for (const cb of task.cbs) cb(url);
    } catch (err) {
      console.warn('Thumb render error:', task.key, err);
    } finally {
      busy = false;
      if (queue.length > 0 && !disposed) {
        scheduleNext();
      } else if (queue.length === 0 && renderer) {
        // Free WebGL context once batch finishes; recreated lazily if needed
        renderer.dispose();
        renderer = null;
      }
    }
  });
}

function enqueue(key, fn, onReady, priority = false) {
  if (cache.has(key)) {
    onReady(cache.get(key));
    return;
  }
  const existing = queue.find((q) => q.key === key);
  if (existing) {
    existing.cbs.push(onReady);
    if (priority) {
      const idx = queue.indexOf(existing);
      if (idx > 0) { queue.splice(idx, 1); queue.unshift(existing); }
    }
    return;
  }
  const item = { key, fn, cbs: [onReady] };
  if (priority) queue.unshift(item);
  else queue.push(item);
  scheduleNext();
}

export function getPortraitThumb(ch, onReady, priority = false) {
  enqueue(`char:${ch.id}`, () => renderPortrait(ch), onReady, priority);
}

export function getVenueThumb(venue, onReady, priority = false) {
  enqueue(`venue:${venue.id}`, () => renderVenue(venue), onReady, priority);
}

export function getRacketThumb(racket, onReady, priority = false) {
  enqueue(`racket:${racket.id}:${racket.shape}`, () => renderRacket(racket), onReady, priority);
}

export function disposeThumbs() {
  disposed = true;
  queue.length = 0;
  if (idleHandle != null) {
    cic(idleHandle);
    idleHandle = null;
  }
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
}
