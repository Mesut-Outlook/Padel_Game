// Render-only effects: a fading ribbon behind the racket head while swinging, a glow flash where the racket meets
// the ball (bigger on harder / perfect hits), and marks on the glass / mesh where the ball strikes a wall
// (a ripple after a bounce, a red crack burst when the ball hits the wall directly). No game state here.
import * as THREE from 'three';

const TRAIL_N = 14;  // samples kept per racket (~0.23 s at 60 fps)

// canvas textures for the wall marks
function tex(draw) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  draw(c.getContext('2d'));
  return new THREE.CanvasTexture(c);
}
const ringTex = () => tex((x) => {  // soft annulus: water-drop ripple on the glass
  const g = x.createRadialGradient(64, 64, 30, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
});
const meshTex = () => tex((x) => {  // diamond wire pattern fading out from the centre
  x.strokeStyle = 'rgba(255,255,255,1)'; x.lineWidth = 3;
  for (let i = -128; i <= 256; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.moveTo(i, 128); x.lineTo(i + 128, 0); x.stroke(); }
  x.globalCompositeOperation = 'destination-in';
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
});
const crackTex = () => tex((x) => {  // star of jagged cracks around a bright core
  x.strokeStyle = 'rgba(255,255,255,1)'; x.lineCap = 'round';
  for (let i = 0; i < 11; i++) {
    let a = (i / 11) * Math.PI * 2 + Math.random() * 0.3, r = 6, px = 64, py = 64;
    x.lineWidth = 3;
    x.beginPath(); x.moveTo(px, py);
    while (r < 60) { r += 8 + Math.random() * 8; a += (Math.random() - 0.5) * 0.5; px = 64 + Math.cos(a) * r; py = 64 + Math.sin(a) * r; x.lineTo(px, py); x.lineWidth = Math.max(1, x.lineWidth - 0.4); }
    x.stroke();
  }
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 22);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
});

export function createFx(scene) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,235,1)'); gr.addColorStop(0.35, 'rgba(232,255,122,0.75)'); gr.addColorStop(1, 'rgba(232,255,122,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const glow = new THREE.CanvasTexture(c);
  const flashes = [], trails = new Map(), a = new THREE.Vector3(), b = new THREE.Vector3();
  const TEX = { ring: ringTex(), mesh: meshTex(), crack: crackTex() }, marks = [], plane = new THREE.PlaneGeometry(1, 1);

  // one wall mark: a quad lying on the wall, scaling up and fading out
  function mark(p, type, color, from, to, life) {
    let m = marks.find(m => m.life <= 0 && m.type === type);
    if (!m) {
      const q = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: TEX[type], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      scene.add(q); marks.push(m = { q, type, life: 0 });
    }
    const side = Math.abs(p[0]) > 4.8;  // side wall (x = ±5) or back wall (z = ±10)
    m.q.position.set(side ? Math.sign(p[0]) * 4.96 : p[0], p[1], side ? p[2] : Math.sign(p[2]) * 9.96);
    m.q.rotation.set(0, side ? Math.PI / 2 : 0, Math.random() * Math.PI);
    m.q.material.color.set(color);
    Object.assign(m, { life, max: life, from, to });
    m.q.visible = true;
  }

  function trailFor(id) {
    let t = trails.get(id);
    if (t) return t;
    const geo = new THREE.BufferGeometry(), idx = [];
    const pos = new Float32Array(TRAIL_N * 6), col = new Float32Array(TRAIL_N * 8);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    for (let i = 0; i < TRAIL_N - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }));
    mesh.frustumCulled = false; mesh.visible = false; scene.add(mesh);
    trails.set(id, t = { mesh, pos, col, samples: [] });
    return t;
  }

  return {
    // every frame per player: record the racket head while swinging, let the ribbon shrink away otherwise
    trail(id, avatar, swinging) {
      const t = trailFor(id);
      if (swinging) { avatar.racketEdge(a, b); t.samples.unshift([a.x, a.y, a.z, b.x, b.y, b.z]); }
      else t.samples.pop();
      if (t.samples.length > TRAIL_N) t.samples.length = TRAIL_N;
      const n = t.samples.length;
      t.mesh.visible = n > 1;
      if (n < 2) return;
      for (let i = 0; i < TRAIL_N; i++) {
        t.pos.set(t.samples[Math.min(i, n - 1)], i * 6);
        const al = i < n ? (1 - i / TRAIL_N) * 0.55 : 0;
        t.col.set([0.92, 1, 0.6, al, 0.92, 1, 0.6, al * 0.15], i * 8);  // bright at the tip, faint toward the throat
      }
      t.mesh.geometry.attributes.position.needsUpdate = true;
      t.mesh.geometry.attributes.color.needsUpdate = true;
    },
    impact(p, power, perfect) {
      let f = flashes.find(f => f.life <= 0);
      if (!f) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        scene.add(s); flashes.push(f = { s, life: 0, max: 0, size: 0 });
      }
      f.s.position.set(p[0], p[1], p[2]); f.s.visible = true;
      f.max = f.life = perfect ? 0.24 : 0.16;
      f.size = (0.35 + 0.45 * Math.max(0, Math.min(1, power))) * (perfect ? 1.7 : 1);
    },
    // ball against a wall: glass ripples, mesh shivers; direct (before any bounce) adds a red crack burst
    wallHit(p, kind, direct, power) {
      const k = 0.7 + 0.6 * Math.max(0, Math.min(1, power));
      if (kind === 'glass') mark(p, 'ring', direct ? 0xff5a3c : 0xbfefff, 0.15, 1.1 * k, 0.45);
      else mark(p, 'mesh', direct ? 0xff7a2a : 0xffe680, 0.5 * k, 0.9 * k, 0.35);
      if (direct) {
        mark(p, 'crack', 0xff3b30, 0.7 * k, 0.85 * k, 0.9);
        mark(p, 'ring', 0xffb199, 0.3, 1.9 * k, 0.6);
      }
    },
    update(dt) {
      for (const m of marks) {
        if (m.life <= 0) continue;
        m.life -= dt;
        const u = 1 - Math.max(0, m.life) / m.max;
        m.q.scale.setScalar(m.from + (m.to - m.from) * (1 - (1 - u) * (1 - u)));  // ease-out growth
        m.q.material.opacity = m.type === 'mesh' ? (1 - u) * (0.6 + 0.4 * Math.sin(u * 40)) : 1 - u * u;  // mesh flickers as it shakes
        if (m.life <= 0) m.q.visible = false;
      }
      for (const f of flashes) {
        if (f.life <= 0) continue;
        f.life -= dt;
        const u = 1 - Math.max(0, f.life) / f.max;   // 0 -> 1 over the flash
        f.s.scale.setScalar(f.size * (0.4 + 0.6 * u));
        f.s.material.opacity = 1 - u;
        if (f.life <= 0) f.s.visible = false;
      }
    },
  };
}
