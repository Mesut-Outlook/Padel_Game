import { Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const names = ['tv', 'behind', 'side', 'top', 'ball', 'drone', 'free'];
const TAU_MOVE = 0.2; // s; position/lookAt damping, ~0.6s to settle after a mode switch

export function createCameraRig(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.enabled = false;
  controls.target.set(0, 0, 0);

  const pos = new Vector3().copy(camera.position);
  const look = new Vector3(0, 0, 0);
  const wantPos = new Vector3(), wantLook = new Vector3();
  const prevBall = new Vector3(), vel = new Vector3(), dir = new Vector3(0, 0, -1);
  let havePrev = false, followX = 0, followZ = 0, orbit = 0;
  let mode = 'tv', snapNext = true;

  const rig = {
    names,
    get name() { return mode; },
    set(n) {
      if (!names.includes(n) || n === mode) return;
      if (mode === 'free') { pos.copy(camera.position); look.copy(controls.target); }
      mode = n;
      controls.enabled = n === 'free';
      if (n === 'free') controls.target.set(0, 0, 0);
    },
    next() { rig.set(names[(names.indexOf(mode) + 1) % names.length]); return mode; },
    update(dt, view) {
      dt = Math.min(Math.max(dt, 1e-4), 0.1);
      const [bx, by, bz] = view.ball;
      // ball velocity from consecutive positions, smoothed
      if (havePrev) {
        const k = 1 - Math.exp(-dt / 0.15);
        vel.x += ((bx - prevBall.x) / dt - vel.x) * k;
        vel.y += ((by - prevBall.y) / dt - vel.y) * k;
        vel.z += ((bz - prevBall.z) / dt - vel.z) * k;
      }
      prevBall.set(bx, by, bz); havePrev = true;

      const s = view.team === 1 ? -1 : 1;           // end of court the focus player defends
      const me = view.players?.[view.focus]?.p ?? [0, 8 * s];
      const sm = (cur, tgt, tau) => cur + (tgt - cur) * (1 - Math.exp(-dt / tau));

      if (mode === 'free') { controls.update(); return; }

      switch (mode) {
        case 'tv':
          followX = sm(followX, bx * 0.3, 0.5);
          wantPos.set(followX * 0.6, 7, 17 * s);
          wantLook.set(followX, 0.5, -2 * s);
          break;
        case 'behind':
          followX = sm(followX, me[0], 0.3); followZ = sm(followZ, me[1], 0.3);
          wantPos.set(followX * 0.85, 2.6, followZ + 4 * s);
          wantLook.set(followX * 0.5, 1.2, -6 * s);
          break;
        case 'side':
          followZ = sm(followZ, bz, 0.6);
          wantPos.set(10.5, 8.5, followZ * 0.5); // above the stands
          wantLook.set(0, 0.5, followZ * 0.7);
          break;
        case 'top':
          wantPos.set(0, 26, 0.01);
          wantLook.set(0, 0, 0);
          break;
        case 'ball': {
          const h = Math.hypot(vel.x, vel.z);
          if (h > 1.5) dir.set(vel.x / h, 0, vel.z / h);  // keep last heading when ball is slow
          wantPos.set(bx - dir.x * 5, Math.max(by + 2, 1.2), bz - dir.z * 5);
          wantLook.set(bx + dir.x * 2, by * 0.5, bz + dir.z * 2);
          break;
        }
        case 'drone':
          orbit += dt * 0.12;
          wantPos.set(Math.sin(orbit) * 18, 9, Math.cos(orbit) * 18);
          wantLook.set(0, 0.5, 0);
          break;
      }

      if (snapNext) { pos.copy(wantPos); look.copy(wantLook); snapNext = false; }
      else {
        const k = 1 - Math.exp(-dt / TAU_MOVE);
        pos.lerp(wantPos, k); look.lerp(wantLook, k);
      }
      camera.position.copy(pos);
      camera.lookAt(look);
    },
  };
  return rig;
}
