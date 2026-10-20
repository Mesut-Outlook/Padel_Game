// Impostor billboard atlas generator for spectators.
// Renders the game's own 3D createAvatar characters offscreen once into a <= 1024x1024 atlas.
// Held in memory for the session; cached permanently across matches.

import * as THREE from 'three';
import { createAvatar } from './player.js';
import { crowdLooks, CROWD_LOOKS_COUNT } from './crowdplan.js';

export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 4;
export const TILE_W = 128;
export const TILE_H = 256;
export const ATLAS_W = 1024;
export const ATLAS_H = 1024;

let cachedAtlas = null;
let atlasPromise = null;
let lastGenerationTimeMs = 0;

export function getAtlasGenerationTime() {
  return lastGenerationTimeMs;
}

export function isAtlasReady() {
  return cachedAtlas !== null;
}

/**
 * Returns the cached crowd atlas texture & material, or initiates generation.
 * @returns {Promise<{ texture: THREE.CanvasTexture, material: THREE.Material, cols: number, rows: number, count: number }>}
 */
export function getCrowdAtlas() {
  if (cachedAtlas) return Promise.resolve(cachedAtlas);
  if (atlasPromise) return atlasPromise;

  atlasPromise = generateCrowdAtlas().then((res) => {
    cachedAtlas = res;
    return res;
  }).catch((err) => {
    console.error('[CrowdAtlas] Generation failed:', err);
    atlasPromise = null;
    throw err;
  });

  return atlasPromise;
}

async function generateCrowdAtlas() {
  if (typeof document === 'undefined') return null;

  const t0 = performance.now();
  const looks = crowdLooks();

  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = ATLAS_W;
  masterCanvas.height = ATLAS_H;
  const masterCtx = masterCanvas.getContext('2d');
  masterCtx.clearRect(0, 0, ATLAS_W, ATLAS_H);

  // Dedicated offscreen WebGL renderer
  const r = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'low-power'
  });
  r.setSize(TILE_W, TILE_H, false);
  r.setClearColor(0x000000, 0);
  r.shadowMap.enabled = false;

  const offScene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 1.25);
  const sun = new THREE.DirectionalLight(0xfff6e8, 1.45);
  sun.position.set(2.0, 4.0, 3.0);
  const rim = new THREE.DirectionalLight(0x88bbff, 0.65);
  rim.position.set(-2.0, 2.5, -2.0);
  offScene.add(hemi, sun, rim);

  const camera = new THREE.PerspectiveCamera(34, TILE_W / TILE_H, 0.1, 15);

  // Render each of the 16 characters in 2 poses
  for (let i = 0; i < looks.length && i < CROWD_LOOKS_COUNT; i++) {
    const look = looks[i];
    const avatar = await createAvatar(offScene, look, look.outfit?.shirt || '#ffffff', 'round');

    // Hide labels, bubbles and racket
    avatar.holder.traverse((o) => {
      if (o.isSprite) o.visible = false;
    });
    const hand = avatar.bones[look.hand === 'left' ? 'hand_l' : 'hand_r'];
    if (hand) hand.children.forEach((c) => { if (!c.isBone) c.visible = false; });

    // --- Pose 0: Sitting (Rows 0 & 1, indices 0..15) ---
    const sitCol = i % ATLAS_COLS;
    const sitRow = Math.floor(i / ATLAS_COLS); // 0 or 1
    avatar.update(0.1, [0, 0, 0, 'sit', null, 0, false]);
    avatar.holder.updateMatrixWorld(true);

    camera.position.set(0, 1.15, 2.3);
    camera.lookAt(0, 0.82, 0);

    r.render(offScene, camera);
    masterCtx.drawImage(r.domElement, sitCol * TILE_W, sitRow * TILE_H);

    // --- Pose 1: Cheering (Rows 2 & 3, indices 16..31) ---
    const cheerCol = i % ATLAS_COLS;
    const cheerRow = 2 + Math.floor(i / ATLAS_COLS); // 2 or 3
    avatar.update(0.1, [0, 0, 0, (i % 2 === 0 ? 'cheer' : 'dance'), null, 0, false]);

    // Lift and wave arms if available for a spirited cheer
    if (avatar.bones.upperarm_l) {
      avatar.bones.upperarm_l.rotation.z = 1.35;
      avatar.bones.upperarm_l.rotation.x = 0.3;
    }
    if (avatar.bones.upperarm_r) {
      avatar.bones.upperarm_r.rotation.z = -1.35;
      avatar.bones.upperarm_r.rotation.x = 0.3;
    }
    avatar.holder.updateMatrixWorld(true);

    camera.position.set(0, 1.25, 2.45);
    camera.lookAt(0, 0.90, 0);

    r.render(offScene, camera);
    masterCtx.drawImage(r.domElement, cheerCol * TILE_W, cheerRow * TILE_H);

    // Clean up avatar
    offScene.remove(avatar.holder);
    disposeObject(avatar.holder);
  }

  // Dispose offscreen renderer
  r.dispose();
  r.forceContextLoss();  // free the extra WebGL context now, not at GC

  const texture = new THREE.CanvasTexture(masterCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = createCrowdMaterial(texture);

  lastGenerationTimeMs = performance.now() - t0;
  console.log(`[CrowdAtlas] Atlas generated in ${lastGenerationTimeMs.toFixed(1)}ms (${ATLAS_COLS}x${ATLAS_ROWS} cells, 1024x1024)`);

  return {
    texture,
    material,
    cols: ATLAS_COLS,
    rows: ATLAS_ROWS,
    count: CROWD_LOOKS_COUNT,
    durationMs: lastGenerationTimeMs
  };
}

/**
 * Creates the high-performance billboard shader material for the crowd InstancedMesh.
 * 1 draw call, cylindrical billboarding around world Y-axis, per-instance UV cell selection.
 */
export function createCrowdMaterial(atlasTexture) {
  const mat = new THREE.MeshBasicMaterial({
    map: atlasTexture,
    transparent: true,
    alphaTest: 0.5,
    depthWrite: true,
    side: THREE.DoubleSide
  });

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      attribute float aCell;
      varying vec2 vCrowdUv;
      ${shader.vertexShader}
    `.replace(
      '#include <uv_vertex>',
      `
      #include <uv_vertex>
      float col = mod(aCell, 8.0);
      float row = floor(aCell / 8.0);
      // 8 columns x 4 rows
      // uv.y in Three.js starts at bottom (0) to top (1)
      // row 0 is top row of canvas, so v in [0.75, 1.0]
      vCrowdUv = vec2((uv.x + col) * 0.125, (uv.y + (3.0 - row)) * 0.25);
      `
    ).replace(
      '#include <project_vertex>',
      `
      // Transform instance center to world space
      vec4 instPos = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

      // Cylindrical billboard: rotate quad to face camera around world Y-axis
      vec3 toCam = cameraPosition - instPos.xyz;
      toCam.y = 0.0;
      float dCam = length(toCam);
      if (dCam > 0.0001) toCam /= dCam;
      else toCam = vec3(0.0, 0.0, 1.0);

      vec3 right = vec3(toCam.z, 0.0, -toCam.x);
      vec3 up = vec3(0.0, 1.0, 0.0);

      vec3 worldPos = instPos.xyz + right * position.x + up * position.y;
      vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      `
    );

    shader.fragmentShader = `
      varying vec2 vCrowdUv;
      ${shader.fragmentShader}
    `.replace(
      '#include <map_fragment>',
      `
      #ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D(map, vCrowdUv);
        diffuseColor *= sampledDiffuseColor;
      #endif
      `
    );
  };

  // Custom program cache key so Three.js compiles this shader variant uniquely
  mat.customProgramCacheKey = () => 'crowd_impostor_billboard_v1';

  return mat;
}

function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose?.();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) m.dispose?.();
    }
  });
}
