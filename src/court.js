// Court + venue rendering (Three.js). Geometry matches physics.wallAt().
import * as THREE from 'three';

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

  // net
  const net = new THREE.Mesh(new THREE.PlaneGeometry(10, 0.88, 1, 1),
    new THREE.MeshLambertMaterial({ color: 0x111111, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  net.position.set(0, 0.44, 0); g.add(net);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(10, 0.05, 0.02), lineMat); tape.position.y = 0.88; g.add(tape);
  for (const x of [-5.05, 5.05]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.92), new THREE.MeshLambertMaterial({ color: 0x222222 })); post.position.set(x, 0.46, 0); g.add(post); }

  // glass + mesh walls
  const glass = new THREE.MeshPhongMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.18, shininess: 90, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.MeshBasicMaterial({ color: 0x222222, wireframe: true, transparent: true, opacity: 0.35 });
  const frame = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const panel = (w, h, x, y, z, rotY, mat) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h, mat === mesh ? Math.round(w * 6) : 1, mat === mesh ? Math.round(h * 6) : 1), mat);
    p.position.set(x, y, z); p.rotation.y = rotY; g.add(p);
  };
  for (const zs of [1, -1]) {
    panel(10, 3, 0, 1.5, zs * 10, 0, glass);          // back glass
    panel(10, 1, 0, 3.5, zs * 10, 0, mesh);           // back mesh 3-4m
    for (const xs of [1, -1]) {
      panel(2, 3, xs * 5, 1.5, zs * 9, Math.PI / 2, glass);
      panel(2, 1, xs * 5, 3.5, zs * 9, Math.PI / 2, mesh);
      panel(2, 2, xs * 5, 1, zs * 7, Math.PI / 2, glass);
      panel(2, 1, xs * 5, 2.5, zs * 7, Math.PI / 2, mesh);
      panel(6, 3, xs * 5, 1.5, zs * 3, Math.PI / 2, mesh);
      for (const z of [10, 8, 6, 0]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4, 0.08), frame); c.position.set(xs * 5, 2, zs * z); g.add(c); }
    }
  }

  // floodlights for night / arena, simple crowd boxes
  if (night || venue.type === 'arena' || venue.type === 'indoor') {
    for (const [x, z] of [[-6, -8], [6, -8], [-6, 8], [6, 8]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7), frame); pole.position.set(x, 3.5, z); g.add(pole);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffee })); lamp.position.set(x * 0.95, 7, z); g.add(lamp);
    }
  }
  if (venue.crowd > 0) {
    const n = Math.round(venue.crowd * 300);
    const geo = new THREE.BoxGeometry(0.45, 1.1, 0.4);
    const crowd = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), n);
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, row = Math.floor(i / 60) % 5;
      m4.makeTranslation(side * (7.5 + row * 0.9), 0.55 + row * 0.5, ((i * 7.31) % 26) - 13);
      crowd.setMatrixAt(i, m4);
      crowd.setColorAt(i, col.setHSL((i * 0.137) % 1, 0.5, 0.5));
    }
    g.add(crowd);
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
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.033, 16, 12), new THREE.MeshLambertMaterial({ color: 0xd8f53a, emissive: 0x334400 }));
  ball.castShadow = true;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(ball, shadow);
  return { ball, shadow, set(p) { ball.position.set(p[0], p[1], p[2]); shadow.position.set(p[0], 0.006, p[2]); } };
}
