// Player avatar: Quaternius Universal Base Characters (CC0) + Universal Animation Library (CC0, same 65-bone rig).
// Padel kit is painted in the shader from bind-pose height, so no extra clothing meshes are needed.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const cache = {};
const load = (url) => (cache[url] ||= loader.loadAsync(url));
const BODY = { m: 'assets/ubc/Superhero_Male_FullBody.gltf', f: 'assets/ubc/Superhero_Female_FullBody.gltf' };
const HAIR = { m: ['Hair_SimpleParted', 'Hair_Buzzed', 'Hair_Beard'], f: ['Hair_Long', 'Hair_Buns', 'Hair_BuzzedFemale'] };
const HAIR_COLORS = ['#2b1d14', '#4a2f1d', '#7a5230', '#c9a15e', '#111111', '#8e3b1f'];
const TEX_SKIN = new THREE.Color(0.61, 0.43, 0.31); // average of the base skin texture

// locomotion + swing clips; quaternion tracks only so body-shape bone scales survive
const CLIPS = { idle: 'Sword_Idle', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop', swing: 'Sword_Attack' };
let clipsP;
const clips = () => (clipsP ||= load('assets/anims/UAL1_Standard.glb').then(g => {
  const out = {};
  for (const [k, name] of Object.entries(CLIPS)) {
    const c = g.animations.find(a => a.name === name);
    out[k] = new THREE.AnimationClip(k, c.duration, c.tracks.filter(t => t.name.endsWith('.quaternion')));
  }
  return out;
}));

// grip in UE hand space; tuned visually
export const GRIP = { pos: [0.07, 0.03, 0], rot: [0, 0, Math.PI / 2] };

function makeRacket(color) {
  // padel racket: solid face, thick frame, short handle (45.5 cm long, 26 cm wide)
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.036, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
  face.scale.set(1, 1, 1.12); face.rotation.x = Math.PI / 2; face.position.y = 0.32;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 24), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  rim.scale.set(1, 1.12, 1.6); rim.position.y = 0.32;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.17, 8), new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.9 }));
  handle.position.y = 0.09;
  g.add(face, rim, handle);
  g.traverse(o => { o.castShadow = true; });
  return g;
}

// Paint padel kit + skin tone. Regions use bind-pose (T-pose) coordinates in metres.
function kitMaterial(base, ch) {
  const m = base.clone();
  // a shirt close to the skin tone reads as bare skin: swap it for white
  const shirt = new THREE.Color(ch.outfit.shirt), skin = new THREE.Color(ch.skinTone);
  if (Math.hypot(shirt.r - skin.r, shirt.g - skin.g, shirt.b - skin.b) < 0.35) shirt.set('#f4f4f4');
  const u = {
    uShirt: { value: shirt }, uShorts: { value: new THREE.Color(ch.outfit.shorts) },
    uShoes: { value: new THREE.Color(ch.outfit.shoes) },
    uSkin: { value: new THREE.Color(ch.skinTone).multiply(new THREE.Color(1 / TEX_SKIN.r, 1 / TEX_SKIN.g, 1 / TEX_SKIN.b)) },
    uFemale: { value: ch.gender === 'f' ? 1 : 0 },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRest;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vRest; uniform vec3 uShirt, uShorts, uShoes, uSkin; uniform float uFemale;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  float y = vRest.y, ax = abs(vRest.x);
  float shade = 0.55 + 0.9 * dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
  vec3 col = diffuseColor.rgb * uSkin;
  float sleeve = mix(0.34, 0.2, uFemale);                       // t-shirt vs tank top
  bool neck = y > 1.38 && ax < 0.07 && vRest.z > 0.0;
  if (y > 0.9 && y < 1.47 && ax < sleeve && !neck && (ax < 0.2 || y > 1.3)) col = uShirt * shade;
  if (y > mix(0.66, 0.7, uFemale) && y <= 0.98 && ax < 0.26) col = uShorts * shade;
  if (y < 0.24 && y > 0.1) col = vec3(0.93) * shade;           // socks
  if (y <= 0.1) col = uShoes * shade;                           // shoes
  if (ax > 0.62 && ax < 0.68 && y > 1.3) col = uShirt * shade;  // wristband
  diffuseColor.rgb = col;
}`);
  };
  m.customProgramCacheKey = () => 'kit';
  return m;
}

// Body form via bone scales (UE rig: y along bone, x/z thickness). Base mesh is "superhero", so slim by default.
// ponytail: scaling one base mesh; true morphs need the paid source pack (regular/teen bodies).
function shapeBody(bones, ch) {
  const b = ch.body || { height: 1, width: 1 }, f = ch.gender === 'f', w = b.width;
  const set = (n, x, y, z) => bones[n]?.scale.set(x, y, z);
  const torso = w * (b.type === 'muscular' ? 1.04 : 0.92);
  set('spine_02', torso, 1, torso);
  set('neck_01', 1 / torso, 1, 1 / torso);
  for (const s of ['l', 'r']) {
    set('upperarm_' + s, b.type === 'muscular' ? 1.05 : 0.9, 1, b.type === 'muscular' ? 1.05 : 0.9);
    set('thigh_' + s, (f ? 1.04 : 0.98) * w, 1, w);
  }
  set('pelvis', f ? 1.05 : 1, 1, 1);
}

function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

export async function createAvatar(scene, ch, racketColor = '#e63946') {
  const g = ch.gender === 'f' ? 'f' : 'm';
  const hairName = ch.hair || HAIR[g][hash(ch.id) % HAIR[g].length];
  const [gltf, anim, hair, brows] = await Promise.all([
    load(BODY[g]), clips(), load(`assets/ubc/${hairName}.gltf`), load(`assets/ubc/Eyebrows_${g === 'f' ? 'Female' : 'Regular'}.gltf`),
  ]);
  const root = SkeletonUtils.clone(gltf.scene);
  const bones = {};
  root.traverse(o => { if (o.isBone) bones[o.name] = o; });
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.frustumCulled = false;
    if (/Superhero/.test(o.material.name)) o.material = kitMaterial(o.material, ch);
  });
  // hair/eyebrows are skinned to the same 65-bone rig: rebind them onto our skeleton by bone name
  const hairColor = new THREE.Color(HAIR_COLORS[hash(ch.id + 'h') % HAIR_COLORS.length]);
  for (const part of [hair, brows]) {
    const meshes = [];
    SkeletonUtils.clone(part.scene).traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
    for (const o of meshes) {
      o.material = o.material.clone(); o.material.color = hairColor; o.castShadow = true; o.frustumCulled = false;
      o.bind(new THREE.Skeleton(o.skeleton.bones.map(b => bones[b.name] || b), o.skeleton.boneInverses), o.bindMatrix);
      root.add(o);
    }
  }
  shapeBody(bones, ch);
  root.scale.setScalar(ch.body?.height || 1);
  root.updateMatrixWorld(true);

  const racket = makeRacket(racketColor);
  const hand = bones[ch.hand === 'left' ? 'hand_l' : 'hand_r'];
  if (hand) {
    hand.add(racket);
    const ws = hand.getWorldScale(new THREE.Vector3());
    racket.scale.set(1 / ws.x, 1 / ws.y, 1 / ws.z);
    racket.position.set(...GRIP.pos);
    racket.rotation.set(...GRIP.rot);
  }

  const holder = new THREE.Group();
  holder.add(root);
  scene.add(holder);
  const label = makeLabel(ch.name, ch.countryCode);
  label.position.y = 2.15; holder.add(label);

  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  for (const k in anim) actions[k] = mixer.clipAction(anim[k]);
  actions.swing.setLoop(THREE.LoopOnce); actions.swing.clampWhenFinished = true;
  actions.idle.play();
  let cur = 'idle', swinging = false;

  const q = new THREE.Quaternion(), e = new THREE.Euler();
  const add = (bone, x, y, z) => { if (!bone) return; q.setFromEuler(e.set(x, y, z)); bone.quaternion.multiply(q); };

  return {
    holder, ch, mixer, actions, bones,
    update(dt, s) { // s = [x, z, facing, anim, swingAnim, swingT, backhand]
      holder.position.set(s[0], 0, s[1]);
      holder.rotation.y = s[2];
      const a = actions[s[3]] ? s[3] : 'idle';
      if (a !== cur) { actions[cur].fadeOut(0.18); actions[a].reset().fadeIn(0.18).play(); cur = a; }
      const sw = s[4], t = s[5];
      if (sw && !swinging) {
        swinging = true;
        const sa = actions.swing;
        sa.reset(); sa.timeScale = sa.getClip().duration / 0.7; sa.fadeIn(0.05).play();
      } else if (!sw && swinging) { swinging = false; actions.swing.fadeOut(0.2); }
      mixer.update(dt);
      if (!sw) return;
      // shot accents on top of the swing clip
      const arc = Math.sin(Math.min(1, t / 0.45) * Math.PI);
      if (sw === 'overhead' || sw === 'smash') add(bones.upperarm_r, 0, 0, -1.2 * arc);
      if (sw === 'serve') add(bones.spine_02, 0.35 * arc, 0, 0);
      if (s[6]) add(bones.spine_02, 0, 0.9 * arc, 0);
    },
    dispose() { scene.remove(holder); },
  };
}

function makeLabel(name, cc) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 48;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, 0, 256, 48);
  x.fillStyle = '#fff'; x.font = 'bold 24px system-ui'; x.textAlign = 'center';
  x.fillText(`${name}  ${cc}`, 128, 32);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  s.scale.set(1.2, 0.22, 1);
  return s;
}
