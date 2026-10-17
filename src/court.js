// Court + venue rendering (Three.js). Geometry matches physics.wallAt().
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DOOR } from './physics.js';

const SURF = { 'turf-blue': 0x2f6fb5, 'turf-green': 0x3f8f4a, 'turf-terracotta': 0xb5603a };

export function buildVenue(scene, venue) {
  const g = new THREE.Group();
  scene.background = new THREE.Color(venue.sky);
  scene.fog = new THREE.Fog(venue.fog, 40, 120);

  const night = venue.timeOfDay === 'night', sunset = venue.timeOfDay === 'sunset';
  const hemi = new THREE.HemisphereLight(night ? 0x8899bb : 0xffffff, 0x445544, night ? 0.6 : 0.9);
  const sun = new THREE.DirectionalLight(sunset ? 0xffc48a : 0xffffff, 1.6 * venue.lightIntensity);
  sun.position.set(night ? 0 : 8, 20, night ? 0 : 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 13, bottom: -13, near: 1, far: 50 });
  g.add(hemi, sun);

  // ground around court + court surface
  const outer = venue.type === 'beach' ? 0xe2cf9c : venue.type === 'rooftop' ? 0x777777 : 0x556066;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ color: outer }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; ground.receiveShadow = true;
  const turf = new THREE.Mesh(new THREE.PlaneGeometry(10, 20), new THREE.MeshLambertMaterial({ color: SURF[venue.surface] || 0x2f6fb5 }));
  turf.rotation.x = -Math.PI / 2; turf.receiveShadow = true;
  g.add(ground, turf);

  // lines: service lines at ±6.95, center line between them, borders
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const line = (w, l, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), lineMat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.005, z); g.add(m); };
  line(10, 0.05, 0, 6.95); line(10, 0.05, 0, -6.95); line(0.05, 13.9, 0, 0);

  // net: 4.5 cm square knotted mesh as a tiling texture, white top tape, bottom cord
  const nc = document.createElement('canvas'); nc.width = nc.height = 32;
  const nx = nc.getContext('2d'); nx.strokeStyle = '#141414'; nx.lineWidth = 3; nx.strokeRect(0, 0, 32, 32);
  const netTex = new THREE.CanvasTexture(nc); netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping; netTex.anisotropy = 4;
  const netGeo = new THREE.PlaneGeometry(10, 0.86), nuv = netGeo.attributes.uv;
  for (let i = 0; i < nuv.count; i++) nuv.setXY(i, nuv.getX(i) * 10 / 0.045, nuv.getY(i) * 0.86 / 0.045);
  const net = new THREE.Mesh(netGeo, new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  net.position.set(0, 0.45, 0); g.add(net);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(10, 0.06, 0.025), lineMat); tape.position.y = 0.87; g.add(tape);
  const cord = new THREE.Mesh(new THREE.BoxGeometry(10, 0.012, 0.012), new THREE.MeshLambertMaterial({ color: 0x222222 })); cord.position.y = 0.02; g.add(cord);
  const doorPadMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  for (const x of [-5.05, 5.05]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.92), doorPadMat); post.position.set(x, 0.46, 0); g.add(post); }

  // glass + mesh walls
  const glass = new THREE.MeshPhongMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.32, shininess: 90, side: THREE.DoubleSide, depthWrite: false });
  const glassEdge = new THREE.LineBasicMaterial({ color: 0xeef6fb, transparent: true, opacity: 0.8 });
  // diamond wire mesh as a tiling texture; mipmaps fade it to a light haze at distance
  const mc = document.createElement('canvas'); mc.width = mc.height = 32;
  const cx = mc.getContext('2d'); cx.strokeStyle = '#1a1a1a'; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(32, 32); cx.moveTo(32, 0); cx.lineTo(0, 32); cx.stroke();
  const meshTex = new THREE.CanvasTexture(mc); meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping; meshTex.anisotropy = 4;
  const mesh = new THREE.MeshBasicMaterial({ map: meshTex, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
  const frame = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const panel = (w, h, x, y, z, rotY, mat) => {
    const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
    if (mat === mesh) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * 8, uv.getY(i) * h * 8);  // 12.5 cm cells
    const p = new THREE.Mesh(geo, mat);
    if (mat === glass) p.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), glassEdge));  // panel seams
    p.position.set(x, y, z); p.rotation.y = rotY; g.add(p);
  };
  const post = (h, x, y, z, sx = 0.08, sz = 0.08) => { const c = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), frame); c.position.set(x, y, z); g.add(c); };
  for (const zs of [1, -1]) {
    for (let x = -4; x <= 4; x += 2) panel(2, 3, x, 1.5, zs * 10, 0, glass);  // back glass, 2 m panels
    panel(10, 1, 0, 3.5, zs * 10, 0, mesh);           // back mesh 3-4m
    for (const xs of [1, -1]) {
      panel(2, 3, xs * 5, 1.5, zs * 9, Math.PI / 2, glass);
      panel(2, 1, xs * 5, 3.5, zs * 9, Math.PI / 2, mesh);
      panel(2, 2, xs * 5, 1, zs * 7, Math.PI / 2, glass);
      panel(2, 1, xs * 5, 2.5, zs * 7, Math.PI / 2, mesh);
      // side entrance door beside the net (DOOR.z0..z1, up to DOOR.h)
      const dw = DOOR.z1 - DOOR.z0, dz = (DOOR.z0 + DOOR.z1) / 2;
      panel(dw, 3 - DOOR.h, xs * 5, (3 + DOOR.h) / 2, zs * dz, Math.PI / 2, mesh);       // mesh above door
      panel(6 - DOOR.z1, 3, xs * 5, 1.5, zs * (6 + DOOR.z1) / 2, Math.PI / 2, mesh);     // mesh side panel to glass
      // structural steel posts
      for (const [z, h] of [[10.06, 4], [8, 4], [6, 3], [DOOR.z1, 3], [0, 3]]) post(h, xs * 5.06, h / 2, zs * z);
      // white protective padding frame around doorway (matches reference diagram)
      const padInner = new THREE.Mesh(new THREE.BoxGeometry(0.09, DOOR.h, 0.085), doorPadMat);
      padInner.position.set(xs * 5.04, DOOR.h / 2, zs * DOOR.z0); g.add(padInner);
      const padOuter = new THREE.Mesh(new THREE.BoxGeometry(0.09, DOOR.h, 0.085), doorPadMat);
      padOuter.position.set(xs * 5.04, DOOR.h / 2, zs * DOOR.z1); g.add(padOuter);
      const padLintel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.085, dw + 0.085), doorPadMat);
      padLintel.position.set(xs * 5.04, DOOR.h, zs * dz); g.add(padLintel);
    }
  }

  // sponsor branding: back-glass decals, net band, LED boards in front of the stands
  const sign = (text, w, h, bg, fg) => {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * h / w);
    const t = cv.getContext('2d');
    t.fillStyle = bg; t.fillRect(0, 0, cv.width, cv.height);
    t.fillStyle = fg; t.font = `900 ${cv.height * 0.62}px system-ui`; t.textAlign = 'center'; t.textBaseline = 'middle';
    t.fillText(text, cv.width / 2, cv.height / 2);
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    // two single-sided faces back to back so the text never reads mirrored
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: bg === 'transparent' }), geo = new THREE.PlaneGeometry(w, h);
    const m = new THREE.Mesh(geo, mat), back = new THREE.Mesh(geo, mat);
    back.rotation.y = Math.PI; m.add(back);
    return m;
  };
  for (const zs of [1, -1]) {
    const d = sign('MESUT', 2.2, 0.55, 'transparent', 'rgba(255,255,255,0.85)');
    d.position.set(0, 2.3, zs * 10.01); g.add(d);
  }
  const band = sign('MESUT PADEL', 3, 0.14, '#111', '#d8f53a'); band.position.set(0, 0.8, 0.012); band.children[0].position.z = -0.024; g.add(band);  // both faces just off the net
  for (const xs of [1, -1]) for (const [z, text] of [[-8, 'MESUT PADEL'], [0, 'Developed by MESUT'], [8, 'MESUT PADEL']]) {
    const b = sign(text, 7.6, 0.8, '#0b1520', '#d8f53a');
    b.position.set(xs * 6.75, 0.4, z); b.rotation.y = Math.PI / 2; g.add(b);
  }

  // floodlights for night / arena, simple crowd boxes
  if (night || venue.type === 'arena' || venue.type === 'indoor') {
    for (const [x, z] of [[-6, -8], [6, -8], [-6, 8], [6, 8]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7), frame); pole.position.set(x, 3.5, z); g.add(pole);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffee })); lamp.position.set(x * 0.95, 7, z); g.add(lamp);
    }
  }
  if (venue.crowd > 0) {
    // low-poly standing spectators: 4 instanced parts = 4 draw calls (HD 620 budget)
    const part = (...geos) => mergeGeometries(geos.map(([geo, x, y, z]) => geo.translate(x, y, z).toNonIndexed()));
    const cyl = (r, h) => new THREE.CylinderGeometry(r, r * 0.9, h, 8);
    const parts = [
      [part([cyl(0.07, 0.82), -0.1, 0.41, 0], [cyl(0.07, 0.82), 0.1, 0.41, 0]), () => col.setHSL(0.6, 0.3, 0.1 + Math.random() * 0.25)],  // legs
      [part([cyl(0.19, 0.6), 0, 1.13, 0], [cyl(0.05, 0.55), -0.25, 1.15, 0], [cyl(0.05, 0.55), 0.25, 1.15, 0]), () => col.setHSL(Math.random(), 0.65, 0.5)],  // shirt + arms
      [part([new THREE.SphereGeometry(0.11, 10, 8), 0, 1.57, 0]), () => col.setHSL(0.07, 0.45, 0.25 + Math.random() * 0.5)],  // head
      [part([new THREE.SphereGeometry(0.115, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0, 1.6, -0.01]), () => col.setHSL(0.08, 0.5, 0.05 + Math.random() * 0.35)],  // hair
    ];
    const seats = [];
    for (const side of [1, -1]) for (let row = 0; row < 5; row++) for (let z = -13; z <= 13; z += 0.65) seats.push([side, row, z]);
    seats.sort(() => Math.random() - 0.5);
    const n = Math.min(seats.length, Math.round(venue.crowd * 300));
    const meshes = parts.map(([geo]) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), n); g.add(m); return m; });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
    const baseSpec = [];
    for (let i = 0; i < n; i++) {
      const [side, row, z] = seats[i], k = 0.9 + Math.random() * 0.15;
      const px = side * (7.5 + row * 0.9), py = row * 0.5, pz = z + (Math.random() - 0.5) * 0.15;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -side * Math.PI / 2 + (Math.random() - 0.5) * 0.6);  // face the court
      m4.compose(p.set(px, py, pz), q, s.set(k, k, k));
      meshes.forEach((m, j) => { m.setMatrixAt(i, m4); m.setColorAt(i, parts[j][1]()); });
      baseSpec.push({ px, py, pz, q: q.clone(), k, phase: Math.random() * Math.PI * 2, speed: 12 + Math.random() * 6 });
    }
    let crowdT = 0, crowdAmp = 0, crowdClock = 0, wasActive = false;
    g.userData.exciteCrowd = (intensity = 0.6) => {
      crowdT = Math.max(crowdT, 0.9 + intensity * 0.9);
      crowdAmp = Math.max(crowdAmp, Math.min(1, intensity));
    };
    g.userData.updateCrowd = (dt) => {
      if (crowdT <= 0) {
        if (wasActive) {
          for (let i = 0; i < n; i++) {
            const b = baseSpec[i];
            m4.compose(p.set(b.px, b.py, b.pz), b.q, s.set(b.k, b.k, b.k));
            for (const m of meshes) m.setMatrixAt(i, m4);
          }
          for (const m of meshes) m.instanceMatrix.needsUpdate = true;
          wasActive = false; crowdAmp = 0;
        }
        return;
      }
      wasActive = true;
      crowdT = Math.max(0, crowdT - dt);
      crowdClock += dt;
      const env = Math.min(1, crowdT / 0.35) * crowdAmp;
      for (let i = 0; i < n; i++) {
        const b = baseSpec[i];
        const hop = Math.max(0, Math.sin(crowdClock * b.speed + b.phase)) * 0.14 * env;
        m4.compose(p.set(b.px, b.py + hop, b.pz), b.q, s.set(b.k, b.k, b.k));
        for (const m of meshes) m.setMatrixAt(i, m4);
      }
      for (const m of meshes) m.instanceMatrix.needsUpdate = true;
    };
    for (const side of [1, -1]) for (let row = 0; row < 5; row++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5 * (row + 1), 28), new THREE.MeshLambertMaterial({ color: 0x3a3f44 }));
      step.position.set(side * (7.5 + row * 0.9), 0.25 * (row + 1) - 0.5, 0); g.add(step);
    }
  }
  if (venue.type === 'beach') {
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(200, 60), new THREE.MeshLambertMaterial({ color: 0x2a8fbf }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0, -60); g.add(sea);
  }
  scene.add(g);
  return g;
}

export function buildBall(scene) {
  // felt ball with the curved white seam, drawn on an equirectangular canvas
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#d8f53a'; x.fillRect(0, 0, 128, 64);
  x.strokeStyle = '#f7f7ee'; x.lineWidth = 4; x.beginPath();
  for (let i = 0; i <= 128; i++) { const y = 32 + 17 * Math.sin(i / 128 * Math.PI * 4); i ? x.lineTo(i, y) : x.moveTo(i, y); }
  x.stroke();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.033, 16, 12), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(c), emissive: 0x223300 }));
  ball.castShadow = true;
  const last = new THREE.Vector3(), axis = new THREE.Vector3(), dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  // motion streak behind a fast ball: a thin cone pointing back along its path
  const streakGeo = new THREE.CylinderGeometry(0.03, 0.002, 1, 8, 1, true).translate(0, -0.5, 0);
  const streak = new THREE.Mesh(streakGeo, new THREE.MeshBasicMaterial({ color: 0xe8ff7a, transparent: true, opacity: 0.35, depthWrite: false }));
  streak.visible = false; scene.add(streak);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(ball, shadow);
  return {
    ball, shadow,
    set(p) {
      // roll the ball along its path so the seam visibly spins
      const dx = p[0] - last.x, dz = p[2] - last.z, d = Math.hypot(dx, dz);
      if (d > 1e-4 && d < 1) ball.rotateOnWorldAxis(axis.set(dz, 0, -dx).normalize(), d / 0.033 * 0.5);
      const d3 = dir.set(p[0] - last.x, p[1] - last.y, p[2] - last.z).length();
      streak.visible = d3 > 0.06 && d3 < 1;  // ~>3.5 m/s at 60 fps; skips teleports between points
      if (streak.visible) {
        streak.position.set(p[0], p[1], p[2]);
        streak.quaternion.setFromUnitVectors(up, dir.normalize());
        streak.scale.set(1, Math.min(d3 * 3, 1.2), 1);
      }
      last.set(p[0], p[1], p[2]);
      ball.position.set(p[0], p[1], p[2]); shadow.position.set(p[0], 0.006, p[2]);
    },
  };
}
