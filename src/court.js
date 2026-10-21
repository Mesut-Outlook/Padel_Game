// Court + venue rendering (Three.js). Geometry matches physics.wallAt().
import * as THREE from 'three';
import { buildSkyline } from './skyline.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DOOR } from './physics.js';
import { crowdPlan, railingFlags, crowdYaw } from './crowdplan.js';
import { getCrowdAtlas, isAtlasReady } from './crowdatlas.js';
import { createFlagTexture, getFlagsAtlas } from './flags.js';

const SURF = { 'turf-blue': 0x2f6fb5, 'turf-green': 0x3f8f4a, 'turf-terracotta': 0xb5603a };

export function buildVenue(scene, venue, opts = {}) {
  const g = new THREE.Group();
  const sky = buildSkyline(g, venue);  // city landmarks on a ring around the venue
  scene.background = new THREE.Color(venue.type === 'indoor' ? '#1b2129' : sky.top);
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

  // sponsor branding: net band, LED boards in front of the stands
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
  if (venue.crowd > 0 && opts.crowd !== false) {
    // Grandstand steps
    for (const side of [1, -1]) for (let row = 0; row < 5; row++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5 * (row + 1), 28), new THREE.MeshLambertMaterial({ color: 0x3a3f44 }));
      step.position.set(side * (7.5 + row * 0.9), 0.25 * (row + 1) - 0.5, 0); g.add(step);
    }

    // Instanced stadium seats (cushion + backrest in venue/court theme color)
    const seatColor = {
      'turf-blue': 0x183b63,
      'turf-green': 0x1d472c,
      'turf-terracotta': 0x6e2c1e
    }[venue.surface] || 0x223246;

    const seatBase = new THREE.BoxGeometry(0.46, 0.08, 0.44).translate(0, 0.26, 0).toNonIndexed();
    const seatBack = new THREE.BoxGeometry(0.06, 0.38, 0.44).translate(0.20, 0.45, 0).toNonIndexed();
    const seatGeo = mergeGeometries([seatBase, seatBack]);
    const seatMat = new THREE.MeshLambertMaterial({ color: seatColor });

    const allSeats = [];
    for (const side of [1, -1]) {
      for (let row = 0; row < 5; row++) {
        const px = side * (7.5 + row * 0.9);
        const py = row * 0.5;
        for (let z = -12.6; z <= 12.6; z += 0.7) {
          allSeats.push({ side, row, px, py, pz: z });
        }
      }
    }

    const seatsMesh = new THREE.InstancedMesh(seatGeo, seatMat, allSeats.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const yAxis = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < allSeats.length; i++) {
      const st = allSeats[i];
      q.setFromAxisAngle(yAxis, st.side > 0 ? 0 : Math.PI);
      m4.compose(p.set(st.px, st.py, st.pz), q, s);
      seatsMesh.setMatrixAt(i, m4);
    }
    seatsMesh.instanceMatrix.needsUpdate = true;
    g.add(seatsMesh);

    // 4-6 large hanging banners on the stand railing: venue country + players countries
    const playerFlags = Array.isArray(opts.flags) ? opts.flags : [];
    const banners = railingFlags({
      venueCC: venue.countryCode,
      playerCCs: playerFlags,
      count: 6
    });
    const bannerZs = [-7, 0, 7];
    let bannerIdx = 0;
    for (const side of [1, -1]) {
      for (const bz of bannerZs) {
        if (bannerIdx >= banners.length) break;
        const code = banners[bannerIdx++];
        const tex = createFlagTexture(code, 256, 160);
        if (tex) {
          const bannerMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1.6, 0.65),
            new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide })
          );
          bannerMesh.position.set(side * 6.98, 0.45, bz);
          bannerMesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          g.add(bannerMesh);
        }
      }
    }

    // Seating occupancy plan (0.4 + 0.6 * crowd filled) & flag assignments
    const plan = crowdPlan(allSeats.length, {
      crowd: venue.crowd,
      venueCC: venue.countryCode,
      playerCCs: playerFlags
    });

    const occupied = [];
    for (let i = 0; i < plan.length; i++) {
      if (plan[i]) occupied.push({ seat: allSeats[i], plan: plan[i] });
    }
    const n = occupied.length;

    // Small hand flags held by ~15-20% of spectators (1 InstancedMesh draw call for the stadium)
    const flagsAtlas = getFlagsAtlas();
    const flagHolders = [];
    if (flagsAtlas) {
      for (let i = 0; i < n; i++) {
        const item = occupied[i];
        if (item.plan.flag) {
          const uvIdx = flagsAtlas.getUvIndex(item.plan.flag);
          if (uvIdx >= 0) {
            flagHolders.push({
              occIdx: i,
              seat: item.seat,
              flagCC: item.plan.flag,
              uvIdx,
              speed: 10 + Math.random() * 8,
              phase: Math.random() * Math.PI * 2
            });
          }
        }
      }
    }

    let flagMesh = null;
    let aFlagCell = null;
    if (flagHolders.length > 0 && flagsAtlas) {
      const fCloth = new THREE.PlaneGeometry(0.32, 0.20).translate(0.16, 0.10, 0).toNonIndexed();
      const fPole = new THREE.CylinderGeometry(0.005, 0.005, 0.35, 6).translate(0, 0.175, 0).toNonIndexed();
      const fGeo = mergeGeometries([fCloth, fPole]);

      const fMat = new THREE.MeshLambertMaterial({
        map: flagsAtlas.texture,
        side: THREE.DoubleSide,
        transparent: true
      });

      fMat.onBeforeCompile = (shader) => {
        shader.vertexShader = `
          attribute float aFlagCell;
          varying vec2 vFlagUv;
          ${shader.vertexShader}
        `.replace(
          '#include <uv_vertex>',
          `
          #include <uv_vertex>
          float col = mod(aFlagCell, 4.0);
          float row = floor(aFlagCell / 4.0);
          vFlagUv = vec2((uv.x + col) * 0.25, (uv.y + (3.0 - row)) * 0.25);
          `
        );
        shader.fragmentShader = `
          varying vec2 vFlagUv;
          ${shader.fragmentShader}
        `.replace(
          '#include <map_fragment>',
          `
          #ifdef USE_MAP
            vec4 sampledDiffuseColor = texture2D(map, vFlagUv);
            diffuseColor *= sampledDiffuseColor;
          #endif
          `
        );
      };
      fMat.customProgramCacheKey = () => 'flag_atlas_v1';

      flagMesh = new THREE.InstancedMesh(fGeo, fMat, flagHolders.length);
      aFlagCell = new THREE.InstancedBufferAttribute(new Float32Array(flagHolders.length), 1);

      for (let j = 0; j < flagHolders.length; j++) {
        const fh = flagHolders[j];
        aFlagCell.setX(j, fh.uvIdx);
        const fx = fh.seat.px + (fh.seat.side > 0 ? -0.25 : 0.25);
        const fy = fh.seat.py + 0.65;
        const fz = fh.seat.pz + 0.22;
        q.setFromAxisAngle(yAxis, fh.seat.side > 0 ? -Math.PI / 2 : Math.PI / 2);
        m4.compose(p.set(fx, fy, fz), q, s);
        flagMesh.setMatrixAt(j, m4);
      }
      fGeo.setAttribute('aFlagCell', aFlagCell);
      flagMesh.instanceMatrix.needsUpdate = true;
      g.add(flagMesh);
    }

    // Base spec for spectator positions and hop phases
    const baseSpec = [];
    for (let i = 0; i < n; i++) {
      const occ = occupied[i];
      const px = occ.seat.px;
      const py = occ.seat.py + 0.26;
      const pz = occ.seat.pz + (Math.random() - 0.5) * 0.05;
      baseSpec.push({
        px, py, pz,
        yaw: crowdYaw(px, pz, occ.seat.side) + (Math.random() - 0.5) * 0.10,
        k: 0.95 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2,
        speed: 12 + Math.random() * 6
      });
    }

    // Billboard quad (0.80m wide x 1.45m tall, bottom centered on seat)
    const quadGeo = new THREE.PlaneGeometry(0.80, 1.45).translate(0, 0.725, 0);
    const aCell = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    for (let i = 0; i < n; i++) aCell.setX(i, occupied[i].plan.lookIndex);
    quadGeo.setAttribute('aCell', aCell);

    let crowdMesh = null;
    let placeholderMeshes = null;

    const setupImpostorMesh = (atlasMat) => {
      if (placeholderMeshes) {
        for (const m of placeholderMeshes) g.remove(m);
        placeholderMeshes = null;
      }
      crowdMesh = new THREE.InstancedMesh(quadGeo, atlasMat, n);
      for (let i = 0; i < n; i++) {
        const b = baseSpec[i];
        q.setFromAxisAngle(yAxis, b.yaw);
        m4.compose(p.set(b.px, b.py, b.pz), q, s.set(b.k, b.k, b.k));
        crowdMesh.setMatrixAt(i, m4);
      }
      crowdMesh.instanceMatrix.needsUpdate = true;
      g.add(crowdMesh);
    };

    if (isAtlasReady()) {
      getCrowdAtlas().then((atlas) => {
        if (atlas) setupImpostorMesh(atlas.material);
      });
    } else {
      // Temporary fallback while atlas renders in background
      const part = (...geos) => mergeGeometries(geos.map(([geo, x, y, z]) => geo.translate(x, y, z).toNonIndexed()));
      const cyl = (r, h) => new THREE.CylinderGeometry(r, r * 0.9, h, 8);
      const col = new THREE.Color();
      const parts = [
        [part([cyl(0.07, 0.82), -0.1, 0.41, 0], [cyl(0.07, 0.82), 0.1, 0.41, 0]), () => col.setHSL(0.6, 0.3, 0.1 + Math.random() * 0.25)],
        [part([cyl(0.19, 0.6), 0, 1.13, 0], [cyl(0.05, 0.55), -0.25, 1.15, 0], [cyl(0.05, 0.55), 0.25, 1.15, 0]), () => col.setHSL(Math.random(), 0.65, 0.5)],
        [part([new THREE.SphereGeometry(0.11, 10, 8), 0, 1.57, 0]), () => col.setHSL(0.07, 0.45, 0.25 + Math.random() * 0.5)],
        [part([new THREE.SphereGeometry(0.115, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0, 1.6, -0.01]), () => col.setHSL(0.08, 0.5, 0.05 + Math.random() * 0.35)],
      ];
      placeholderMeshes = parts.map(([geo]) => {
        const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), n);
        g.add(m);
        return m;
      });
      for (let i = 0; i < n; i++) {
        const b = baseSpec[i];
        q.setFromAxisAngle(yAxis, b.yaw);
        m4.compose(p.set(b.px, b.py, b.pz), q, s.set(b.k, b.k, b.k));
        placeholderMeshes.forEach((m, j) => {
          m.setMatrixAt(i, m4);
          m.setColorAt(i, parts[j][1]());
        });
      }

      // Background atlas generation: replace placeholder once ready
      getCrowdAtlas().then((atlas) => {
        if (atlas && g.parent) {
          setupImpostorMesh(atlas.material);
        }
      });
    }

    let crowdT = 0, crowdAmp = 0, crowdClock = 0, wasActive = false;
    g.userData.exciteCrowd = (intensity = 0.6) => {
      crowdT = Math.max(crowdT, 0.9 + intensity * 0.9);
      crowdAmp = Math.max(crowdAmp, Math.min(1, intensity));
      if (crowdMesh) {
        for (let i = 0; i < n; i++) {
          aCell.setX(i, occupied[i].plan.lookIndex + 16);
        }
        aCell.needsUpdate = true;
      }
    };

    g.userData.updateCrowd = (dt) => {
      if (crowdT <= 0) {
        if (wasActive) {
          if (crowdMesh) {
            for (let i = 0; i < n; i++) {
              aCell.setX(i, occupied[i].plan.lookIndex);
              const b = baseSpec[i];
              q.setFromAxisAngle(yAxis, b.yaw);
              m4.compose(p.set(b.px, b.py, b.pz), q, s.set(b.k, b.k, b.k));
              crowdMesh.setMatrixAt(i, m4);
            }
            crowdMesh.instanceMatrix.needsUpdate = true;
            aCell.needsUpdate = true;
          } else if (placeholderMeshes) {
            for (let i = 0; i < n; i++) {
              const b = baseSpec[i];
              q.setFromAxisAngle(yAxis, b.yaw);
              m4.compose(p.set(b.px, b.py, b.pz), q, s.set(b.k, b.k, b.k));
              for (const m of placeholderMeshes) m.setMatrixAt(i, m4);
            }
            for (const m of placeholderMeshes) m.instanceMatrix.needsUpdate = true;
          }
          if (flagMesh) {
            for (let j = 0; j < flagHolders.length; j++) {
              const fh = flagHolders[j];
              const fx = fh.seat.px + (fh.seat.side > 0 ? -0.25 : 0.25);
              const fy = fh.seat.py + 0.65;
              const fz = fh.seat.pz + 0.22;
              q.setFromAxisAngle(yAxis, fh.seat.side > 0 ? -Math.PI / 2 : Math.PI / 2);
              m4.compose(p.set(fx, fy, fz), q, s.set(1, 1, 1));
              flagMesh.setMatrixAt(j, m4);
            }
            flagMesh.instanceMatrix.needsUpdate = true;
          }
          wasActive = false; crowdAmp = 0;
        }
        return;
      }

      wasActive = true;
      crowdT = Math.max(0, crowdT - dt);
      crowdClock += dt;
      const env = Math.min(1, crowdT / 0.35) * crowdAmp;

      if (crowdMesh) {
        for (let i = 0; i < n; i++) {
          const b = baseSpec[i];
          const hop = Math.max(0, Math.sin(crowdClock * b.speed + b.phase)) * 0.16 * env;
          q.setFromAxisAngle(yAxis, b.yaw);
          m4.compose(p.set(b.px, b.py + hop, b.pz), q, s.set(b.k, b.k, b.k));
          crowdMesh.setMatrixAt(i, m4);
        }
        crowdMesh.instanceMatrix.needsUpdate = true;
      } else if (placeholderMeshes) {
        for (let i = 0; i < n; i++) {
          const b = baseSpec[i];
          const hop = Math.max(0, Math.sin(crowdClock * b.speed + b.phase)) * 0.14 * env;
          q.setFromAxisAngle(yAxis, b.yaw);
          m4.compose(p.set(b.px, b.py + hop, b.pz), q, s.set(b.k, b.k, b.k));
          for (const m of placeholderMeshes) m.setMatrixAt(i, m4);
        }
        for (const m of placeholderMeshes) m.instanceMatrix.needsUpdate = true;
      }

      if (flagMesh) {
        for (let j = 0; j < flagHolders.length; j++) {
          const fh = flagHolders[j];
          const occHop = Math.max(0, Math.sin(crowdClock * baseSpec[fh.occIdx].speed + baseSpec[fh.occIdx].phase)) * 0.16 * env;
          const fx = fh.seat.px + (fh.seat.side > 0 ? -0.25 : 0.25);
          const fy = fh.seat.py + 0.65 + occHop;
          const fz = fh.seat.pz + 0.22;
          const wave = Math.sin(crowdClock * fh.speed + fh.phase) * 0.28 * env;
          q.setFromAxisAngle(yAxis, (fh.seat.side > 0 ? -Math.PI / 2 : Math.PI / 2) + wave);
          m4.compose(p.set(fx, fy, fz), q, s.set(1, 1, 1));
          flagMesh.setMatrixAt(j, m4);
        }
        flagMesh.instanceMatrix.needsUpdate = true;
      }
    };
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
