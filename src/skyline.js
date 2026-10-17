// Render-only city backdrop: four canvas-painted panorama panels on a ring around the venue, each showing the
// city's landmarks as layered silhouettes (hazy far layer, darker near layer), a sky gradient with a sun or moon,
// lit windows at night, and a glass facade + ceiling for indoor halls. Textures stay at 1024x256 (HD 620 budget).
import * as THREE from 'three';

const W = 1024, H = 256, R = 60, TOP = 22, BOTTOM = -6;   // panel canvas, ring radius and world height span
const BASE = Math.round((TOP - 0) / (TOP - BOTTOM) * H) - 6; // canvas row of street level

const mix = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

// ---- drawing helpers (canvas y grows downward; heights in pixels above BASE) ----
const rect = (x, cx, w, h, base = BASE) => x.fillRect(cx - w / 2, base - h, w, h);
function poly(x, pts) { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) x.lineTo(p[0], p[1]); x.closePath(); x.fill(); }
function mountains(x, r, color, top, rough = 1) {
  x.fillStyle = color; x.beginPath(); x.moveTo(0, BASE);
  let h = top * (0.5 + r() * 0.5);
  for (let px = 0; px <= W; px += 16) { h = Math.max(top * 0.25, Math.min(top, h + (r() - 0.5) * 22 * rough)); x.lineTo(px, BASE - h); }
  x.lineTo(W, BASE); x.closePath(); x.fill();
}
function city(x, r, color, x0, x1, minH, maxH, lit) {
  for (let px = x0; px < x1;) {
    const w = 10 + r() * 22, h = minH + r() * (maxH - minH);
    x.fillStyle = color; rect(x, px + w / 2, w, h);
    if (r() < 0.25) rect(x, px + w / 2, 2, h + 8 + r() * 10);  // antenna
    if (lit) { x.fillStyle = lit; for (let wy = BASE - h + 4; wy < BASE - 3; wy += 6) for (let wx = px + 2; wx < px + w - 3; wx += 5) if (r() < 0.35) x.fillRect(wx, wy, 2, 3); x.fillStyle = color; }
    px += w + r() * 4;
  }
}
function dome(x, cx, r, base, finial = 10) {
  x.beginPath(); x.ellipse(cx, base, r, r * 0.9, 0, Math.PI, 0); x.fill();
  rect(x, cx, 2, r * 0.9 + finial, base);
}
function minaret(x, cx, h, w = 5) {
  rect(x, cx, w, h);
  for (const k of [0.55, 0.8]) rect(x, cx, w + 4, 3, BASE - h * k);
  poly(x, [[cx - w / 2, BASE - h], [cx + w / 2, BASE - h], [cx, BASE - h - 18]]);
}
function mosque(x, cx, s) {
  rect(x, cx, 120 * s, 34 * s);
  dome(x, cx, 34 * s, BASE - 34 * s, 12 * s);
  for (const d of [-1, 1]) { dome(x, cx + d * 40 * s, 18 * s, BASE - 30 * s, 4 * s); dome(x, cx + d * 22 * s, 12 * s, BASE - 40 * s, 4 * s); }
  for (const d of [-1, 1]) { minaret(x, cx + d * 66 * s, 92 * s, 5 * s); minaret(x, cx + d * 82 * s, 78 * s, 4 * s); }
}
function palm(x, cx, h, color) {
  x.strokeStyle = color; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, BASE); x.quadraticCurveTo(cx + 6, BASE - h / 2, cx + 3, BASE - h); x.stroke();
  x.lineWidth = 2.5;
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.5; x.beginPath(); x.moveTo(cx + 3, BASE - h); x.quadraticCurveTo(cx + 3 + Math.cos(a) * 12, BASE - h + Math.sin(a) * 12 - 4, cx + 3 + Math.cos(a) * 22, BASE - h + Math.sin(a) * 14 + 8); x.stroke(); }
}
function cypress(x, cx, h) { x.beginPath(); x.ellipse(cx, BASE - h / 2, 5, h / 2, 0, 0, Math.PI * 2); x.fill(); }
function pine(x, cx, h) { rect(x, cx, 3, h); x.beginPath(); x.ellipse(cx, BASE - h, 22, 8, 0, 0, Math.PI * 2); x.fill(); }
function bridge(x, x0, x1, deck, tower, color) {
  x.fillStyle = color; x.fillRect(x0, BASE - deck, x1 - x0, 4);
  const t1 = x0 + (x1 - x0) * 0.25, t2 = x0 + (x1 - x0) * 0.75;
  for (const t of [t1, t2]) rect(x, t, 5, tower);
  x.strokeStyle = color; x.lineWidth = 1.5; x.beginPath();
  x.moveTo(x0, BASE - deck); x.quadraticCurveTo((x0 + t1) / 2, BASE - deck - 10, t1, BASE - tower);
  x.quadraticCurveTo((t1 + t2) / 2, BASE - deck + 6, t2, BASE - tower);
  x.quadraticCurveTo((t2 + x1) / 2, BASE - deck - 10, x1, BASE - deck); x.stroke();
}
function colosseum(x, cx, w, h, bg) {
  x.beginPath(); x.moveTo(cx - w / 2, BASE); x.lineTo(cx - w / 2, BASE - h * 0.7); x.quadraticCurveTo(cx - w / 4, BASE - h * 1.05, cx + w / 5, BASE - h); x.lineTo(cx + w / 2, BASE - h * 0.75); x.lineTo(cx + w / 2, BASE); x.closePath(); x.fill();
  x.fillStyle = bg;  // arches: three tiers
  for (let tier = 0; tier < 3; tier++) for (let ax = cx - w / 2 + 6; ax < cx + w / 2 - 8; ax += 11) {
    const ay = BASE - 6 - tier * (h * 0.24);
    if (ay - 10 < BASE - h * 0.95) continue;
    x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax, ay - 8); x.arc(ax + 3.5, ay - 8, 3.5, Math.PI, 0); x.lineTo(ax + 7, ay); x.fill();
  }
}

// ---- cities: one painter per panel direction. n = behind the far back glass (TV view), s = behind the camera end ----
const CITY = {
  Istanbul: {
    n: (x, c) => { x.fillStyle = c.near; mosque(x, 330, 1.2); mosque(x, 760, 0.8); rect(x, 560, 14, 70); dome(x, 560, 9, BASE - 70, 6); poly(x, [[553, BASE - 70], [567, BASE - 70], [560, BASE - 96]]); },
    s: (x, c) => { bridge(x, 60, 980, 40, 105, c.near); },
    e: (x, c, r) => { x.fillStyle = c.near; city(x, r, c.near, 0, W, 14, 46, c.lit); mosque(x, 500, 0.6); },
    w: (x, c, r) => { x.fillStyle = c.near; city(x, r, c.near, 0, W, 10, 38, c.lit); rect(x, 300, 16, 80); poly(x, [[290, BASE - 80], [310, BASE - 80], [300, BASE - 104]]); },
    water: true,
  },
  Rome: {
    farMax: 22,
    n: (x, c) => { x.fillStyle = c.near; colosseum(x, 420, 300, 120, c.sky); for (const p of [130, 170, 700, 860]) cypress(x, p, 60 + (p % 30)); pine(x, 640, 70); },
    s: (x, c) => { x.fillStyle = c.near; rect(x, 520, 260, 50); dome(x, 520, 62, BASE - 50, 22); rect(x, 520, 30, 18, BASE - 50 - 56); for (const p of [300, 360, 680, 740]) cypress(x, p, 54); },
    e: (x, c, r) => { x.fillStyle = c.near; city(x, r, c.near, 0, W, 16, 40, c.lit); for (const p of [200, 520, 800]) pine(x, p, 64); },
    w: (x, c, r) => { x.fillStyle = c.near; city(x, r, c.near, 0, W, 14, 36, c.lit); for (let p = 80; p < W; p += 160) cypress(x, p, 58); },
  },
  Madrid: {
    n: (x, c, r) => { x.fillStyle = c.near; for (const [p, h] of [[300, 150], [370, 165], [440, 140], [510, 158]]) { rect(x, p, 34, h, BASE); } city(x, r, c.near, 560, W, 20, 60, c.lit); },
    s: (x, c) => { x.fillStyle = c.near; for (const d of [-1, 1]) poly(x, [[480 + d * 70 - 20, BASE], [480 + d * 70 + 20, BASE], [480 + d * 70 + 20 - d * 30, BASE - 110], [480 + d * 70 - 20 - d * 30, BASE - 110]]); },
    e: (x, c, r) => { city(x, r, c.near, 0, W, 18, 70, c.lit); },
    w: (x, c, r) => { x.fillStyle = c.near; rect(x, 500, 340, 46); for (const p of [360, 640]) dome(x, p, 20, BASE - 46, 10); city(x, r, c.near, 0, 300, 16, 40, c.lit); city(x, r, c.near, 700, W, 16, 40, c.lit); },
  },
  Marbella: {
    farMax: 16,
    n: (x, c, r) => { mountains(x, r, c.far, 130, 1.3); x.fillStyle = c.near; city(x, r, mix(c.near, '#ffffff', 0.25), 0, W, 8, 22, c.lit); for (let p = 40; p < W; p += 90) palm(x, p, 50 + (p % 3) * 8, c.near); },
    s: (x, c, r) => { for (let p = 60; p < W; p += 70) palm(x, p, 46 + (p % 4) * 6, c.near); },
    e: (x, c, r) => { mountains(x, r, c.far, 90); city(x, r, c.near, 0, W, 8, 24, c.lit); },
    w: (x, c, r) => { mountains(x, r, c.far, 100); city(x, r, c.near, 0, W, 8, 22, c.lit); },
    water: true,
  },
  'Buenos Aires': {
    n: (x, c, r) => { city(x, r, c.far, 0, W, 30, 90); x.fillStyle = c.near; poly(x, [[492, BASE], [532, BASE], [516, BASE - 160], [508, BASE - 160]]); poly(x, [[508, BASE - 160], [516, BASE - 160], [512, BASE - 170]]); city(x, r, c.near, 0, 440, 20, 60, c.lit); city(x, r, c.near, 590, W, 20, 60, c.lit); },
    s: (x, c, r) => { x.fillStyle = c.near; rect(x, 300, 50, 120); dome(x, 300, 18, BASE - 120, 30); x.fillRect(560, BASE - 26, 360, 4); poly(x, [[700, BASE - 26], [708, BASE - 26], [760, BASE - 130], [754, BASE - 132]]); },
    e: (x, c, r) => { city(x, r, c.near, 0, W, 24, 80, c.lit); },
    w: (x, c, r) => { city(x, r, c.near, 0, W, 20, 70, c.lit); },
    water: true,
  },
  Stockholm: {
    n: (x, c, r) => { x.fillStyle = c.near; rect(x, 420, 260, 50); rect(x, 520, 36, 150); poly(x, [[502, BASE - 150], [538, BASE - 150], [520, BASE - 168]]); for (const d of [-9, 0, 9]) { x.beginPath(); x.arc(520 + d, BASE - 172, 3, 0, Math.PI * 2); x.fill(); } city(x, r, c.near, 600, W, 16, 40, c.lit); },
    s: (x, c, r) => { x.fillStyle = c.near; city(x, r, c.near, 0, W, 18, 44, c.lit); for (const p of [260, 640, 880]) { rect(x, p, 14, 90); poly(x, [[p - 7, BASE - 90], [p + 7, BASE - 90], [p, BASE - 140]]); } },
    e: (x, c, r) => { city(x, r, c.near, 0, W, 16, 40, c.lit); },
    w: (x, c, r) => { city(x, r, c.near, 0, W, 16, 40, c.lit); },
    water: true,
  },
  Antalya: {
    farMax: 16,
    n: (x, c, r) => { mountains(x, r, c.far, 150, 1.5); x.fillStyle = c.near; rect(x, 520, 26, 110); for (let k = 0; k < 6; k++) x.clearRect(511 + k * 4, BASE - 104, 1, 96); rect(x, 520, 32, 5, BASE - 110); poly(x, [[508, BASE - 115], [532, BASE - 115], [520, BASE - 140]]); for (let p = 60; p < W; p += 110) if (Math.abs(p - 520) > 50) palm(x, p, 52, c.near); },
    s: (x, c, r) => { mountains(x, r, c.far, 70); for (let p = 40; p < W; p += 80) palm(x, p, 48 + (p % 5) * 4, c.near); },
    e: (x, c, r) => { mountains(x, r, c.far, 120, 1.4); city(x, r, c.near, 0, W, 10, 30, c.lit); },
    w: (x, c, r) => { mountains(x, r, c.far, 110, 1.4); },
    water: true,
  },
  Doha: {
    n: (x, c, r) => { city(x, r, c.far, 0, W, 40, 110, c.lit); x.fillStyle = c.near; rect(x, 360, 40, 170); dome(x, 360, 20, BASE - 170, 26); poly(x, [[560, BASE], [600, BASE], [588, BASE - 80], [600, BASE - 150], [560, BASE - 150], [572, BASE - 80]]); rect(x, 720, 30, 140); poly(x, [[705, BASE - 140], [735, BASE - 140], [720, BASE - 175]]); },
    s: (x, c, r) => { city(x, r, c.near, 0, W, 30, 100, c.lit); },
    e: (x, c, r) => { city(x, r, c.near, 0, W, 20, 90, c.lit); },
    w: (x, c, r) => { x.fillStyle = c.near; dome(x, 500, 50, BASE, 8); city(x, r, c.near, 0, 420, 20, 60, c.lit); city(x, r, c.near, 580, W, 20, 60, c.lit); },
    water: true,
  },
  Acapulco: {
    farMax: 28,
    n: (x, c, r) => { x.fillStyle = c.far; poly(x, [[0, BASE], [0, BASE - 60], [140, BASE - 140], [260, BASE - 90], [380, BASE - 160], [470, BASE - 70], [470, BASE]]); x.fillStyle = c.near; poly(x, [[440, BASE], [460, BASE - 120], [520, BASE - 128], [540, BASE]]); city(x, r, c.near, 560, W, 30, 90, c.lit); for (const p of [120, 300]) palm(x, p, 50, c.near); },
    s: (x, c, r) => { mountains(x, r, c.far, 140, 1.6); for (let p = 50; p < W; p += 95) palm(x, p, 50, c.near); },
    e: (x, c, r) => { mountains(x, r, c.far, 120, 1.5); city(x, r, c.near, 0, W, 20, 70, c.lit); },
    w: (x, c, r) => { mountains(x, r, c.far, 130, 1.5); },
    water: true,
  },
  Rotterdam: {
    n: (x, c, r) => { city(x, r, c.far, 0, W, 30, 100, c.lit); x.fillStyle = c.near; x.fillRect(200, BASE - 30, 600, 5); poly(x, [[420, BASE - 25], [432, BASE - 25], [470, BASE - 150], [462, BASE - 152]]); x.strokeStyle = c.near; x.lineWidth = 1; for (let k = 0; k < 9; k++) { x.beginPath(); x.moveTo(466 - k * 1.5, BASE - 145 + k * 10); x.lineTo(470 + k * 30, BASE - 30); x.stroke(); x.beginPath(); x.moveTo(466 - k * 1.5, BASE - 145 + k * 10); x.lineTo(410 - k * 22, BASE - 30); x.stroke(); } },
    s: (x, c, r) => { x.fillStyle = c.near; rect(x, 300, 8, 180); x.beginPath(); x.ellipse(300, BASE - 120, 14, 5, 0, 0, Math.PI * 2); x.fill(); for (let k = 0; k < 6; k++) { const cx = 560 + k * 46; x.save(); x.translate(cx, BASE - 40); x.rotate(Math.PI / 4); x.fillRect(-18, -18, 36, 36); x.restore(); rect(x, cx, 8, 26); } },
    e: (x, c, r) => { city(x, r, c.near, 0, W, 30, 110, c.lit); },
    w: (x, c, r) => { city(x, r, c.near, 0, W, 24, 90, c.lit); },
    water: true,
  },
};

function palette(venue) {
  const t = venue.timeOfDay, sky = venue.sky;
  if (t === 'night') return { sky: '#0a1020', top: '#03060f', horizon: mix(sky, '#3a4a7a', 0.4), far: '#1a2338', near: '#0b111e', lit: '#ffd98a', water: '#0b1a2e' };
  if (t === 'sunset') return { sky, top: mix(sky, '#2b1b4a', 0.75), horizon: mix(sky, '#ffd27a', 0.35), far: mix(sky, '#4a2a55', 0.55), near: mix(sky, '#1e1028', 0.85), lit: null, water: mix(sky, '#3a2a5a', 0.6) };
  return { sky, top: mix(sky, '#2f6db5', 0.55), horizon: mix(sky, '#ffffff', 0.45), far: mix(sky, '#6d7f92', 0.5), near: mix(sky, '#3e4b5a', 0.75), lit: null, water: '#3d86b8' };
}

// one 90° panel facing `dir`
function panel(venue, c, dir, seed) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), r = rng(seed), def = CITY[venue.city] || CITY.Madrid;
  const sky = x.createLinearGradient(0, 0, 0, BASE);
  sky.addColorStop(0, c.top); sky.addColorStop(1, c.horizon);
  x.fillStyle = sky; x.fillRect(0, 0, W, H);
  if (dir === 'n' && venue.timeOfDay === 'sunset') {  // low sun behind the landmarks
    const g = x.createRadialGradient(620, BASE - 40, 4, 620, BASE - 40, 120);
    g.addColorStop(0, 'rgba(255,240,190,1)'); g.addColorStop(0.18, 'rgba(255,200,120,0.9)'); g.addColorStop(1, 'rgba(255,160,90,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  }
  if (dir === 'n' && venue.timeOfDay === 'night') { x.fillStyle = '#f3f0dc'; x.beginPath(); x.arc(760, 50, 14, 0, Math.PI * 2); x.fill(); x.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 70; i++) x.fillRect(r() * W, r() * BASE * 0.7, 1, 1); }
  // far haze layer of generic city/hills, then the painter's landmarks in the near colour
  city(x, r, c.far, 0, W, 8, def.farMax ?? 50, null);
  x.fillStyle = c.near; def[dir](x, c, r);
  x.fillStyle = def.water ? c.water : c.near; x.fillRect(0, BASE, W, H - BASE);  // water or city mass below street level
  if (def.water) { x.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 40; i++) x.fillRect(r() * W, BASE + 4 + r() * (H - BASE - 6), 10 + r() * 30, 1); }
  if (venue.type === 'indoor') facade(x);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.x = -1; t.offset.x = 1;  // the ring is seen from inside: mirror so the city reads left-to-right
  return t;
}

// indoor halls: the city seen through a tall glass facade (dark wall bands, mullions, transom)
function facade(x) {
  x.fillStyle = 'rgba(40,60,80,0.18)'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#1b2129'; x.fillRect(0, 0, W, 26); x.fillRect(0, BASE - 2, W, H - BASE + 2);
  for (let px = 0; px < W; px += 64) x.fillRect(px, 0, 5, H);
  x.fillRect(0, 120, W, 3);
}

export function buildSkyline(group, venue) {
  const c = palette(venue), seed = [...venue.id].reduce((n, ch) => n * 31 + ch.charCodeAt(0), 7) % 2147483646 + 1;
  // direction -> centre angle of the panel (three.js cylinder: theta 0 = +z, π/2 = +x)
  const dirs = { s: 0, e: Math.PI / 2, n: Math.PI, w: Math.PI * 1.5 };
  Object.entries(dirs).forEach(([dir, a], i) => {
    const geo = new THREE.CylinderGeometry(R, R, TOP - BOTTOM, 24, 1, true, a - Math.PI / 4, Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: panel(venue, c, dir, seed + i * 977), side: THREE.BackSide, fog: false, depthWrite: false }));
    m.position.y = (TOP + BOTTOM) / 2; m.renderOrder = -1;
    group.add(m);
  });
  if (venue.type === 'indoor') {  // hall ceiling with light strips
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const x = cv.getContext('2d'); x.fillStyle = '#20262e'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#f4f6ff'; for (let i = 16; i < 256; i += 32) x.fillRect(i, 0, 4, 256);
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.colorSpace = THREE.SRGBColorSpace;
    const ceil = new THREE.Mesh(new THREE.CircleGeometry(R, 32), new THREE.MeshBasicMaterial({ map: t, fog: false }));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = TOP; group.add(ceil);
  }
  return c;
}
