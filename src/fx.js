// Render-only stroke effects: a fading ribbon behind the racket head while swinging, and a glow flash where
// the racket meets the ball (bigger on harder / perfect hits). No game state here.
import * as THREE from 'three';

const TRAIL_N = 14;  // samples kept per racket (~0.23 s at 60 fps)

export function createFx(scene) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,235,1)'); gr.addColorStop(0.35, 'rgba(232,255,122,0.75)'); gr.addColorStop(1, 'rgba(232,255,122,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const glow = new THREE.CanvasTexture(c);
  const flashes = [], trails = new Map(), a = new THREE.Vector3(), b = new THREE.Vector3();

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
    update(dt) {
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
