// Player avatar: Quaternius Universal Base Characters (CC0) + Universal Animation Library (CC0, same 65-bone rig).
// Padel kit is painted in the shader from bind-pose height, so no extra clothing meshes are needed.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const loader = new GLTFLoader();
const cache = {};
const load = (url) => (cache[url] ||= loader.loadAsync(url));
const BODY = { m: 'assets/ubc/Superhero_Male_FullBody.gltf', f: 'assets/ubc/Superhero_Female_FullBody.gltf' };
const HAIR = { m: ['Hair_SimpleParted', 'Hair_Buzzed', 'Hair_Beard'], f: ['Hair_Long', 'Hair_Buns', 'Hair_BuzzedFemale'] };
const HAIR_COLORS = ['#2b1d14', '#4a2f1d', '#7a5230', '#c9a15e', '#111111', '#8e3b1f'];
const TEX_SKIN = new THREE.Color(0.61, 0.43, 0.31); // average of the base skin texture

// locomotion clips; quaternion tracks only so body-shape bone scales survive. Strokes are procedural poses (below).
const CLIPS = { idle: 'Sword_Idle', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop' };
let clipsP;
const clips = () => (clipsP ||= load('assets/anims/UAL1_Standard.glb').then(g => {
  const out = {};
  for (const [k, name] of Object.entries(CLIPS)) {
    const c = g.animations.find(a => a.name === name);
    out[k] = new THREE.AnimationClip(k, c.duration, c.tracks.filter(t => t.name.endsWith('.quaternion')));
  }
  return out;
}));

// grip in UE hand space, tuned visually: head out of the thumb side, butt just past the little finger, face forward
// The handle runs through the fist: along hand-local z (index knuckle +0.036 -> little finger -0.034), centred in
// the gap between palm and curled fingers (measured x -0.025, y 0.06 in hand_r; x is mirrored in hand_l). The head
// comes out past the thumb, the butt just below the little finger, and the face lies in the palm plane.
// basis = hand-local direction of the racket's x (face width), y (handle -> head) and z (face normal).
export const GRIP = {
  r: { fist: [-0.025, 0.06], basis: [[0, 1, 0], [0, 0, 1], [1, 0, 0]] },
  l: { fist: [0.025, 0.06], basis: [[0, -1, 0], [0, 0, 1], [-1, 0, 0]] },
  butt: -0.055,  // metres from the fist centre to the end of the handle
};

let holeTex;
function racketFaceTex() {
  if (holeTex || typeof document === 'undefined') return holeTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#252525';
  for (let r = -3; r <= 3; r++) for (let k = -3; k <= 3; k++) {
    if (Math.hypot(r, k) > 3.2 || (r === 0 && k === 0)) continue;
    x.beginPath(); x.arc(64 + k * 13, 64 + r * 13, 3.2, 0, Math.PI * 2); x.fill();
  }
  return (holeTex = new THREE.CanvasTexture(c));
}

function shapeWidth(s, shape) {
  if (shape === 'teardrop') return s < 0.25 ? 0.56 + 0.54 * ((s + 1) / 1.25) : 1.10 - 0.10 * ((s - 0.25) / 0.75);
  if (shape === 'diamond') return s < 0.45 ? 0.42 + 0.84 * Math.pow((s + 1) / 1.45, 1.15) : 1.26 - 0.36 * ((s - 0.45) / 0.55);
  return 1;
}

function deformHead(geo, shape) {
  if (shape === 'round') return geo;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const s = Math.max(-1, Math.min(1, pos.getY(i) / 0.1456));
    pos.setX(i, pos.getX(i) * shapeWidth(s, shape));
  }
  geo.computeVertexNormals();
  return geo;
}

export function makeRacket(color, shape = 'round') {
  // padel racket: solid face, thick frame, short handle (45.5 cm long, 26 cm wide)
  const g = new THREE.Group();
  const faceGeo = deformHead(new THREE.CylinderGeometry(0.13, 0.13, 0.036, 32).rotateX(Math.PI / 2).scale(1, 1.12, 1), shape);
  const face = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ color, map: racketFaceTex(), roughness: 0.45 }));
  face.position.y = 0.32;
  const rimGeo = deformHead(new THREE.TorusGeometry(0.13, 0.012, 8, 32).scale(1, 1.12, 1.6), shape);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.55 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.y = 0.32;
  for (const s of [-1, 1]) {
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.055, 6), rimMat);
    bridge.position.set(s * 0.018, 0.175, 0); bridge.rotation.z = -s * 0.36; g.add(bridge);
  }
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.17, 8), new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.9 }));
  handle.position.y = 0.09;
  g.add(face, rim, handle);
  g.traverse(o => { o.castShadow = true; });
  return g;
}

// Paint padel kit + skin tone. Regions use bind-pose (T-pose) coordinates in metres.
function kitColors(ch) {
  // a shirt close to the skin tone reads as bare skin: swap it for white
  const shirt = new THREE.Color(ch.outfit.shirt), skin = new THREE.Color(ch.skinTone);
  const a = shirt.clone().convertLinearToSRGB(), b = skin.clone().convertLinearToSRGB();  // compare as seen on screen
  if (Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b) < 0.35) shirt.set('#f4f4f4');
  return { shirt, shorts: new THREE.Color(ch.outfit.shorts) };
}

// Kit regions in rest-pose (T-pose) metres, as GLSL over (y, ax, z); shared by the painted body underneath and the
// cloth meshes on top. The JS twins pick triangles; the GLSL clips them so the hems are smooth lines.
// Jersey: up over the shoulders (measured shoulder tops: f 1.47, m 1.54) with a round crew neck around the neck
// (neck base: f 1.485, m 1.52), scooped 2 cm lower at the front.
const NECK = { f: [1.455, 0.058], m: [1.49, 0.066] }, TOP = { f: 1.5, m: 1.575 };
const SHIRT_GLSL = (f, style = 'crew') => {
  const [ny, nr] = NECK[f ? 'f' : 'm'], top = TOP[f ? 'f' : 'm'];
  const neckCut = style === 'vneck'
    ? `(z > 0.0 ? (ax < ${nr} && y > (${ny - 0.06}) + (ax / ${nr}) * 0.06) : (ax < ${nr} && y > ${ny}))`
    : `(y > ${ny} - (z > 0.0 ? 0.02 : 0.0) && ax < ${nr})`;
  if (style === 'tank') return `(y > 0.9 && y < ${top} && !${neckCut} && ax < ${f ? 0.155 : 0.185})`;  // sleeveless: stops at the shoulder
  return `(y > 0.9 && y < ${top} && ax < ${f ? '0.2' : '0.34'} && !${neckCut} && (ax < 0.2 || y > 1.3))`;
};
const SHORTS_GLSL = (f) => `(y > ${f ? '0.7' : '0.66'} && y <= 0.98 && ax < 0.26)`;
const SHIRT = (x, y, z, f, style = 'crew') => {
  const ax = Math.abs(x), [ny, nr] = NECK[f ? 'f' : 'm'], top = TOP[f ? 'f' : 'm'];
  if (y <= 0.9 || y >= top) return false;
  const neckCut = style === 'vneck'
    ? (z > 0 ? (ax < nr && y > (ny - 0.06) + (ax / nr) * 0.06) : (ax < nr && y > ny))
    : (y > ny - (z > 0.0 ? 0.02 : 0.0) && ax < nr);
  if (neckCut) return false;
  if (style === 'tank') return ax < (f ? 0.155 : 0.185);
  return ax < (f ? 0.2 : 0.34) && (ax < 0.2 || y > 1.3);
};
const SHORTS = (x, y, z, f) => y > (f ? 0.7 : 0.66) && y <= 0.98 && Math.abs(x) < 0.26;

// Real clothes: the body surface inside a kit region, copied and pushed out along the normals (looser toward the
// hems) and skinned to the same skeleton, so the jersey and shorts have volume and move with the player.
function makeGarment(body, region, regionGlsl, female, offset, color, trim, trimTest, minGap = () => 0.006, accent, accentTest, poloButtons = false, ny = 1.49, logo = null) {
  const src = body.geometry, pos = src.attributes.position, nor = src.attributes.normal, idx = src.index.array;
  const keep = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const inside = (i) => region(pos.getX(i), pos.getY(i), pos.getZ(i), female);
    if (inside(a) || inside(b) || inside(c)) keep.push(a, b, c);  // generous cut; the shader trims the exact edge
  }
  const p = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), k = offset(x, y);
    p[i * 3] = x + nor.getX(i) * k; p[i * 3 + 1] = y + nor.getY(i) * k; p[i * 3 + 2] = z + nor.getZ(i) * k;
  }
  smoothShell(p, pos, nor, keep, minGap, 12);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  geo.setAttribute('normal', nor);
  geo.setAttribute('skinIndex', src.attributes.skinIndex);
  geo.setAttribute('skinWeight', src.attributes.skinWeight);
  geo.setAttribute('aRest', pos);  // the skin point under each cloth vertex: hems and trims follow the painted kit exactly
  geo.setIndex(keep);
  const mat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });  // double-sided: hems show the inside
  mat.onBeforeCompile = (sh) => {  // trim bands (collar, sleeve and hem, shorts side stripe) from rest-pose position
    sh.uniforms.uTrim = { value: trim };
    if (accent) sh.uniforms.uAccent = { value: accent };
    if (logo) sh.uniforms.uLogo = { value: logo };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aRest; varying vec3 vRest;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = aRest;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vRest; uniform vec3 uTrim;${accent ? ' uniform vec3 uAccent;' : ''}${logo ? ' uniform sampler2D uLogo;' : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n{
  float y = vRest.y, ax = abs(vRest.x), z = vRest.z;
  if (!${regionGlsl}) discard;
  ${accentTest ? `if (${accentTest}) diffuseColor.rgb = uAccent;` : ''}
  ${poloButtons ? `if (z > 0.0 && ax < 0.005 && (abs(y - ${(ny - 0.05).toFixed(3)}) < 0.0035 || abs(y - ${(ny - 0.09).toFixed(3)}) < 0.0035)) diffuseColor.rgb = vec3(0.95);` : ''}
  if (${trimTest}) diffuseColor.rgb = uTrim;
}`);
  };
  mat.customProgramCacheKey = () => 'garment:' + regionGlsl + trimTest + (accentTest || '') + (poloButtons ? ':polo' : '');
  const m = new THREE.SkinnedMesh(geo, mat);
  m.bind(body.skeleton, body.bindMatrix);
  m.castShadow = true; m.frustumCulled = false;
  return m;
}

// Cloth should not show every muscle: Laplacian-smooth the garment shell so it bridges the body's hollows, but
// never let it come closer than `min` to the skin. Seam duplicates (same position, other UVs) are welded so the
// cloth does not tear along UV seams.
function smoothShell(p, pos, nor, tris, minGap, iters) {
  const weld = new Int32Array(pos.count).fill(-1), first = new Map();
  for (const i of tris) if (weld[i] < 0) {
    const key = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    if (!first.has(key)) first.set(key, i);
    weld[i] = first.get(key);
  }
  const nb = new Map(), link = (a, b) => { if (!nb.has(a)) nb.set(a, new Set()); nb.get(a).add(b); };
  const edgeUse = new Map();  // edges used by one triangle only are the hems: pin them so sleeves don't shrink
  for (let t = 0; t < tris.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = weld[tris[t + e]], b = weld[tris[t + (e + 1) % 3]];
    link(a, b); link(b, a);
    const k = a < b ? a + ':' + b : b + ':' + a; edgeUse.set(k, (edgeUse.get(k) || 0) + 1);
  }
  const hem = new Set();
  for (const [k, n] of edgeUse) if (n === 1) for (const v of k.split(':')) hem.add(+v);
  const reps = [...nb.keys()].filter(r => !hem.has(r)), q = new Float32Array(p.length);
  for (let it = 0; it < iters; it++) {
    for (const r of reps) {
      const s = nb.get(r); let x = 0, y = 0, z = 0;
      for (const n of s) { x += p[n * 3]; y += p[n * 3 + 1]; z += p[n * 3 + 2]; }
      q[r * 3] = (p[r * 3] + x / s.size) / 2; q[r * 3 + 1] = (p[r * 3 + 1] + y / s.size) / 2; q[r * 3 + 2] = (p[r * 3 + 2] + z / s.size) / 2;
    }
    for (const r of reps) {  // stay outside the skin along its normal
      const nx = nor.getX(r), ny = nor.getY(r), nz = nor.getZ(r);
      const d = (q[r * 3] - pos.getX(r)) * nx + (q[r * 3 + 1] - pos.getY(r)) * ny + (q[r * 3 + 2] - pos.getZ(r)) * nz;
      const min = minGap(pos.getY(r)), push = d < min ? min - d : 0;
      p[r * 3] = q[r * 3] + nx * push; p[r * 3 + 1] = q[r * 3 + 1] + ny * push; p[r * 3 + 2] = q[r * 3 + 2] + nz * push;
    }
  }
  for (const i of tris) { const r = weld[i]; if (r !== i) { p[i * 3] = p[r * 3]; p[i * 3 + 1] = p[r * 3 + 1]; p[i * 3 + 2] = p[r * 3 + 2]; } }
}

// Chest letters (outfit.text, up to 3) as a white-on-black canvas mask, one per text.
const logoTex = {};
function logoMask(text) {
  if (logoTex[text]) return logoTex[text];
  const c = document.createElement('canvas'); c.width = 96; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 96, 64);
  g.fillStyle = '#fff'; g.font = 'bold 54px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 48, 35, 92);
  return (logoTex[text] = new THREE.CanvasTexture(c));
}

// Accent areas (pattern, polo collar/placket and chest letters) in rest-pose coordinates, or null. Painted on the cloth
// and on the body underneath, so where the skin pokes through the shell the stripe still has clean edges.
function kitAccentGlsl(f, style, pattern, text) {
  const [ny, nr] = NECK[f ? 'f' : 'm'];
  const accentParts = [];
  if (style === 'polo') {
    accentParts.push(`(y > ${(ny - 0.045).toFixed(3)} && ax < ${(nr + 0.022).toFixed(3)})`);
    accentParts.push(`(z > 0.0 && ax < 0.016 && y > ${(ny - 0.13).toFixed(3)} && y <= ${ny.toFixed(3)})`);
  }
  if (pattern === 'chest') {
    accentParts.push(`(y > 1.18 && y < 1.28 && ax < 0.2)`);
  } else if (pattern === 'sash') {
    accentParts.push(`(abs((y - 1.17) + 1.3 * vRest.x) < 0.04 && ax < 0.2)`);
  } else if (pattern === 'side') {
    accentParts.push(`(ax > 0.08 && ax < 0.2 && abs(z + 0.01) < 0.045 && y > 0.92 && y < 1.33)`);
  } else if (pattern === 'stripes') {  // 7 cm vertical stripes, shirt colour down the middle
    accentParts.push(`(mod(vRest.x - 0.035, 0.14) < 0.07 && ax < 0.2)`);
  } else if (pattern === 'split') {  // halves: shirt colour on the wearer's left, accent on the right, sleeves included
    accentParts.push(`(vRest.x < 0.0)`);
  }
  if (text) {  // 12 x 8 cm on the wearer's left chest, read from the front (+x is the viewer's right)
    const y0 = (ny - 0.21).toFixed(3);
    const inBox = `z > 0.0 && vRest.x > 0.03 && vRest.x < 0.15 && y > ${y0} && y < ${(ny - 0.13).toFixed(3)}`;
    accentParts.push(`(${inBox} && texture2D(uLogo, vec2((vRest.x - 0.03) / 0.12, (y - ${y0}) / 0.08)).r > 0.5)`);
  }
  return accentParts.length ? accentParts.join(' || ') : null;
}

function makeKit(body, ch) {
  const f = ch.gender === 'f', { shirt, shorts } = kitColors(ch), sleeve = f ? 0.2 : 0.34;
  const near = (a, b) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b) < 0.15;
  const trimShirt = near(shirt, shorts) ? new THREE.Color('#f4f4f4') : shorts;
  const style = ch.outfit?.style || 'crew';
  const pattern = ch.outfit?.pattern || 'none';
  const accent = ch.outfit?.accent ? new THREE.Color(ch.outfit.accent) : trimShirt;
  const [ny, nr] = NECK[f ? 'f' : 'm'];

  // Trim test (waistband hem, collar/cuffs)
  const trimParts = ['y < 0.925'];
  if (style === 'tank') {
    trimParts.push(`(y > ${(ny - 0.045).toFixed(3)} && ax < ${(nr + 0.022).toFixed(3)})`);
    trimParts.push(`(ax > ${(f ? 0.135 : 0.165).toFixed(3)} && ax < ${(f ? 0.155 : 0.185).toFixed(3)} && y > 1.3)`);
  } else if (style === 'vneck') {
    trimParts.push(`((z > 0.0 && ax < ${(nr + 0.02).toFixed(3)} && y > (${(ny - 0.06).toFixed(3)} + (ax / ${nr.toFixed(3)}) * 0.06 - 0.025)) || (z <= 0.0 && y > ${(ny - 0.035).toFixed(3)} && ax < ${(nr + 0.022).toFixed(3)}))`);
    trimParts.push(`(ax > ${(sleeve - 0.025).toFixed(3)} && y > 1.3)`);
  } else if (style === 'crew') {
    trimParts.push(`(y > ${(ny - 0.045).toFixed(3)} && ax < ${(nr + 0.022).toFixed(3)})`);
    trimParts.push(`(ax > ${(sleeve - 0.025).toFixed(3)} && y > 1.3)`);
  } else if (style === 'polo') {
    trimParts.push(`(ax > ${(sleeve - 0.025).toFixed(3)} && y > 1.3)`);
  }
  const trimTest = trimParts.join(' || ');

  const text = ch.outfit?.text, accentTest = kitAccentGlsl(f, style, pattern, text);

  return [
    // jersey: 8 mm off the skin, ~1.4 cm at the hem; sleeves open up toward the cuff
    makeGarment(body, (x, y, z, f) => SHIRT(x, y, z, f, style), SHIRT_GLSL(f, style), f,
      (x, y) => 0.008 + Math.max(0, 1.0 - y) * 0.06 + (style !== 'tank' && Math.abs(x) > 0.2 ? (Math.abs(x) - 0.2) * 0.08 : 0),
      shirt, trimShirt, trimTest,
      (y) => (y < 1.0 ? 0.02 : 0.006),
      accent, accentTest, style === 'polo', ny, text ? logoMask(text) : null),
    // shorts: 1 cm off the skin, wider at the leg openings, side stripe in the shirt colour
    makeGarment(body, SHORTS, SHORTS_GLSL(f), f, (x, y) => 0.01 + Math.max(0, 0.8 - y) * 0.1,
      shorts, shirt, 'ax > 0.178 && ax < 0.192 && abs(vRest.z + 0.03) < 0.05'),
  ];
}

function kitMaterial(base, ch) {
  const m = base.clone(), f = ch.gender === 'f';
  const { shirt, shorts } = kitColors(ch);
  const style = ch.outfit?.style || 'crew', text = ch.outfit?.text, accentTest = kitAccentGlsl(f, style, ch.outfit?.pattern || 'none', text);
  const near = Math.hypot(shirt.r - shorts.r, shirt.g - shorts.g, shirt.b - shorts.b) < 0.15;  // same fallback as makeKit's trim
  const u = {
    uAccent: { value: new THREE.Color(ch.outfit?.accent || (near ? '#f4f4f4' : ch.outfit.shorts)) },
    uShirt: { value: shirt }, uShorts: { value: new THREE.Color(ch.outfit.shorts) },
    uShoes: { value: new THREE.Color(ch.outfit.shoes) },
    uSkin: { value: new THREE.Color(ch.skinTone).multiply(new THREE.Color(1 / TEX_SKIN.r, 1 / TEX_SKIN.g, 1 / TEX_SKIN.b)) },
    uFemale: { value: ch.gender === 'f' ? 1 : 0 },
    uBeard: { value: new THREE.Color(ch.beardColor || ch.hairColor || '#2b1d14') },
    uBeardMode: { value: { stubble: 1, goatee: 2 }[ch.beard] || 0 },
    ...(text && { uLogo: { value: logoMask(text) } }),
    uMakeup: { value: ch.makeup ? 1 : 0 },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRest;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vRest; uniform vec3 uShirt, uShorts, uShoes, uSkin, uBeard, uAccent; uniform float uFemale, uBeardMode, uMakeup;${text ? ' uniform sampler2D uLogo;' : ''}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  float y = vRest.y, ax = abs(vRest.x), z = vRest.z;
  float shade = 0.55 + 0.9 * dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
  vec3 col = diffuseColor.rgb * uSkin;
  if (${SHIRT_GLSL(f, style)}) col = ${accentTest ? `(${accentTest}) ? uAccent * shade : ` : ''}uShirt * shade;    // same regions as the cloth meshes
  if (${SHORTS_GLSL(f)}) col = uShorts * shade;
  if (y < 0.24 && y > 0.1) col = vec3(0.93) * shade;           // socks
  if (y < 0.095) discard;                                       // bare foot: hidden inside the shoe mesh
  if (ax > 0.62 && ax < 0.68 && y > 1.3) col = uShirt * shade;  // wristband
  // face (rest pose, measured: male nose tip 1.657, mouth ~1.62, chin ~1.59; female nose 1.617, mouth ~1.58)
  bool lips = y > 1.613 && y < 1.632 && ax < 0.022 && z > 0.085;
  if (uBeardMode > 0.5 && uBeardMode < 1.5 && y > 1.575 && y < 1.648 && z > 0.025 && ax < 0.078 && !lips)
    col = mix(col, uBeard * shade, 0.6);                                                    // light stubble
  if (uBeardMode > 1.5 && !lips && ((y > 1.578 && y < 1.612 && ax < 0.03 && z > 0.05)       // goatee: chin
      || (y > 1.632 && y < 1.646 && ax < 0.032 && z > 0.08)                                 //         moustache
      || (y > 1.605 && y < 1.64 && ax > 0.02 && ax < 0.034 && z > 0.07)))                  //         around the mouth
    col = mix(col, uBeard * shade, 0.85);
  if (uMakeup > 0.5) {
    if (y > 1.57 && y < 1.594 && ax < 0.024 && z > 0.074) col = mix(col, vec3(0.62, 0.12, 0.2), 0.85);     // lipstick
    if (y > 1.59 && y < 1.615 && ax > 0.035 && ax < 0.062 && z > 0.05) col = mix(col, vec3(0.9, 0.45, 0.5), 0.22);  // blush
    if (y > 1.652 && y < 1.668 && ax > 0.015 && ax < 0.052 && z > 0.06) col = mix(col, vec3(0.42, 0.26, 0.42), 0.5);  // eyeshadow
  }
  diffuseColor.rgb = col;
}`);
  };
  m.customProgramCacheKey = () => 'kit:' + (f ? 'f' : 'm') + ':' + style + ':' + accentTest;
  return m;
}

// Body form via bone scales (UE rig: y along bone, x/z thickness). Base mesh is "superhero", so slim by default.
// ponytail: scaling one base mesh; true morphs need the paid source pack (regular/teen bodies).
// The base is a bodybuilder, these are tennis players: everything is slimmed toward a lean athletic build;
// 'muscular' / 'stocky' types stay a little broader. Scales inherit down the chain (thigh -> calf -> foot).
function shapeBody(bones, ch) {
  const b = ch.body || { height: 1, width: 1 }, f = ch.gender === 'f', w = Math.min(b.width || 1, 1.15);
  const k = b.type === 'muscular' ? 1.07 : b.type === 'stocky' ? 1.04 : 1;  // build on top of width
  const set = (n, x, y, z) => bones[n]?.scale.set(x, y, z);
  const torso = w * k * (f ? 0.86 : 0.85), shoulders = b.shoulders || 1;  // shoulders > 1: broader upper body
  const waist = b.waist || 1, hips = b.hips || 1;  // waist < 1: narrower waist, hips > 1: wider hips (thighs follow)
  set('pelvis', (f ? 0.98 : 0.95) * hips, 1, 1);
  set('spine_01', waist / hips, 1, waist);  // scales inherit: undo the hips, then the waist above it
  set('spine_02', torso * shoulders / waist, 1, torso / waist);
  set('neck_01', 1 / (torso * shoulders), 1, 1 / torso);
  if (ch.face?.width) set('Head', ch.face.width, 1, 1);  // chubby cheeks > 1, narrow face < 1
  const arm = k * (f ? 0.8 : 0.78), fore = 0.9;
  const thighX = w * k * (f ? 0.8 : 0.84), thighZ = w * k * (f ? 0.84 : 0.88), calf = f ? 0.9 : 0.92;
  for (const s of ['l', 'r']) {
    set('upperarm_' + s, arm, 1, arm);
    set('lowerarm_' + s, fore, 1, fore);
    set('thigh_' + s, thighX, 1, thighZ);
    set('calf_' + s, calf, 1, calf);
  }
}

function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

export async function createAvatar(scene, ch, racketColor = '#e63946', racketShape = 'round') {
  const g = ch.gender === 'f' ? 'f' : 'm';
  // hair: 'none' (bald), one mesh name or a list; a full beard adds the beard mesh in its own colour
  const hairList = ch.hair === 'none' ? [] : [].concat(ch.hair || HAIR[g][hash(ch.id) % HAIR[g].length]);
  if (ch.beard === 'full' && !hairList.includes('Hair_Beard')) hairList.push('Hair_Beard');
  const [gltf, anim, brows, ...hairs] = await Promise.all([
    load(BODY[g]), clips(), load(`assets/ubc/Eyebrows_${g === 'f' ? 'Female' : 'Regular'}.gltf`),
    ...hairList.map(n => load(`assets/ubc/${n}.gltf`)),
  ]);
  const root = SkeletonUtils.clone(gltf.scene);
  const bones = {};
  root.traverse(o => { if (o.isBone) bones[o.name] = o; });
  let body = null;
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.frustumCulled = false;
    if (/Superhero/.test(o.material.name)) { o.material = kitMaterial(o.material, ch); body = o; }
  });
  if (body) for (const g of makeKit(body, ch)) {  // sibling of the body with the same transform, same skeleton
    g.position.copy(body.position); g.quaternion.copy(body.quaternion); g.scale.copy(body.scale);
    body.parent.add(g);
  }
  // hair/eyebrows are skinned to the same 65-bone rig: rebind them onto our skeleton by bone name
  const hairColor = new THREE.Color(ch.hairColor || HAIR_COLORS[hash(ch.id + 'h') % HAIR_COLORS.length]);
  const beardColor = new THREE.Color(ch.beardColor || ch.hairColor || '#2b1d14');
  const parts = [{ gltf: brows, color: hairColor }, ...hairs.map((h, i) => hairList[i] === 'Hair_Beard'
    ? { gltf: h, color: beardColor } : { gltf: h, color: hairColor, cut: ch.hairCut, opacity: ch.hairOpacity, gel: ch.hairGel, len: ch.hairLength })];
  for (const part of parts) {
    const meshes = [];
    SkeletonUtils.clone(part.gltf.scene).traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
    for (const o of meshes) {
      if (part.len) {  // hairLength > 1: stretch everything below the ears downward (Hair_Long 2.4 = upper back)
        o.geometry = o.geometry.clone();
        const pos = o.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < 1.62) pos.setY(i, 1.62 - (1.62 - y) * part.len); }
      }
      o.material = hairMaterial(o.material, part.color, part.cut, part.opacity, part.gel); o.castShadow = true; o.frustumCulled = false;
      o.bind(new THREE.Skeleton(o.skeleton.bones.map(b => bones[b.name] || b), o.skeleton.boneInverses), o.bindMatrix);
      root.add(o);
    }
  }
  shapeBody(bones, ch);
  root.scale.setScalar(ch.body?.height || 1);
  root.updateMatrixWorld(true);
  // clips are rotation-only (no pelvis drop), so bent-knee poses would lift the feet: pin the lowest foot to the floor
  const feet = ['foot_l', 'foot_r', 'ball_l', 'ball_r'].map(n => bones[n]).filter(Boolean);
  const fv = new THREE.Vector3();
  const lowestFoot = () => Math.min(...feet.map(b => b.getWorldPosition(fv).y));
  const restFoot = lowestFoot();
  if (bones.Head) addHeadwear(bones.Head, root, ch, hairColor);
  // padel shoes, built around each foot in the rest pose and then parented to the foot bone
  for (const sd of ['l', 'r']) {
    const v = new THREE.Vector3(), foot = bones['foot_' + sd].getWorldPosition(v).clone(), toe = bones['ball_' + sd].getWorldPosition(v).clone();
    const heelZ = foot.z - 0.065, toeZ = toe.z + 0.08, k = ch.body?.height || 1;
    const shoe = makeShoe(ch.outfit.shoes, ch.outfit.shirt);
    shoe.position.set(foot.x, 0, (heelZ + toeZ) / 2); shoe.scale.set(k, k, (toeZ - heelZ) / SHOE_LEN);
    root.updateMatrixWorld(true); bones['foot_' + sd].attach(shoe);
  }

  let racket;
  const hand = bones[ch.hand === 'left' ? 'hand_l' : 'hand_r'];
  const attachRacket = (col, shp = 'round') => {
    if (racket && hand) hand.remove(racket);
    racket = makeRacket(col, shp);
    if (hand) {
      hand.add(racket);
      const g = GRIP[ch.hand === 'left' ? 'l' : 'r'], ws = hand.getWorldScale(new THREE.Vector3());
      const axes = g.basis.map(v => new THREE.Vector3(...v));
      racket.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(...axes));
      // slimmed arms leave the hand non-uniformly scaled: undo it along the hand axis each racket axis lies on
      const along = (v) => Math.abs(v.x) * ws.x + Math.abs(v.y) * ws.y + Math.abs(v.z) * ws.z;
      racket.scale.set(1 / along(axes[0]), 1 / along(axes[1]), 1 / along(axes[2]));
      racket.position.set(g.fist[0], g.fist[1], GRIP.butt / ws.z);
    }
  };
  attachRacket(racketColor, racketShape);

  const holder = new THREE.Group();
  holder.add(root);
  scene.add(holder);
  const label = makeLabel(ch.name, ch.countryCode);
  label.position.y = 2.15; holder.add(label);
  const bubble = makeBubble(); bubble.sprite.position.y = 2.6; holder.add(bubble.sprite);
  let bubbleT = 0;

  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  for (const k in anim) actions[k] = mixer.clipAction(anim[k]);
  actions.idle.play();
  mixer.update(0);
  const idleQuats = {};
  for (const b of ['spine_02', 'spine_03', 'neck_01', 'upperarm_l', 'lowerarm_l', 'hand_l', 'upperarm_r', 'lowerarm_r', 'hand_r']) {
    if (bones[b]) idleQuats[b] = bones[b].quaternion.clone();
  }
  let cur = 'idle';
  // the mixer skips writing a bone whose clip value did not change (e.g. a still pelvis), so the pose offsets added
  // below would pile up frame after frame: put every posed bone back to its last clip value before the mixer runs
  const posed = ['pelvis', 'spine_02', 'spine_03', 'neck_01', 'upperarm_l', 'lowerarm_l', 'hand_l', 'upperarm_r', 'lowerarm_r', 'hand_r',
    'thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r'].map(n => bones[n]).filter(Boolean);
  const clipQ = posed.map(b => b.quaternion.clone());

  // racket (R) / ball (B) arm bones; poses are authored right-handed and mirrored for lefties
  const lefty = ch.hand === 'left', R = lefty ? 'l' : 'r', B = lefty ? 'r' : 'l', m = lefty ? -1 : 1;
  let tossT = 0, prepW = 0, prepKey = 'forehand', lastBallD = Infinity, swingKey = null;
  let prevBallX = NaN, prevBallY = NaN, prevBallZ = NaN, ballStepDt = 0, wantPrep = 0, localSwingT = 0, lastRawSwingT = -1;
  // which stroke the ball calls for: overhead when high, otherwise forehand on the racket-hand side
  const strokeFor = (s, ball) => {
    if (ball[1] > 1.65) return 'overhead';
    const right = -Math.cos(s[2]) * (ball[0] - s[0]) + Math.sin(s[2]) * (ball[2] - s[1]);  // + = player's right
    return right * m > -0.1 ? 'forehand' : 'backhand';
  };
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  const add = (bone, x, y, z) => { if (!bone) return; q.setFromEuler(e.set(x, y, z)); bone.quaternion.multiply(q); };

  return {
    holder, ch, mixer, actions, bones,
    setRacket: attachRacket,
    ballHand: (v) => bones['hand_' + B].getWorldPosition(v),
    racketEdge: (tip, throat) => { racket.localToWorld(tip.set(0, 0.46, 0)); racket.localToWorld(throat.set(0, 0.2, 0)); },
    say(text) { bubble.draw(text); bubble.sprite.visible = true; bubbleT = 1.6; },
    update(dt, s, ball, overheadCue = false) { // s = [x, z, facing, anim, swingAnim, swingT, backhand]; ball = [x, y, z] for stroke prep
      if (bubbleT > 0 && (bubbleT -= dt) <= 0) bubble.sprite.visible = false;
      holder.position.set(s[0], 0, s[1]);
      holder.rotation.y = s[2];
      const a = actions[s[3]] ? s[3] : 'idle';
      if (a !== cur) { actions[cur].fadeOut(0.18); actions[a].reset().fadeIn(0.18).play(); cur = a; }
      const sw = s[4];
      if (sw) {
        if (lastRawSwingT < 0 || s[5] < lastRawSwingT - 0.05 || dt === 0) localSwingT = s[5];
        else localSwingT = Math.min(0.55, Math.max(localSwingT + dt, s[5]));
        lastRawSwingT = s[5];
      } else {
        lastRawSwingT = -1;
        localSwingT = 0;
      }
      const t = sw ? localSwingT : 0;
      posed.forEach((b, i) => b.quaternion.copy(clipQ[i]));
      mixer.update(dt);
      posed.forEach((b, i) => clipQ[i].copy(b.quaternion));
      tossT = s[3] === 'serveToss' ? tossT + dt : 0;
      // stroke preparation: blend into the right stance as the ball comes within ~3 m
      // Only recompute closing speed on frames where the physics step actually moved the ball (prevents slow-mo jitter)
      let prep = null;
      if (ball && !sw) {
        ballStepDt += dt;
        const moved = Math.abs(ball[0] - prevBallX) + Math.abs(ball[1] - prevBallY) + Math.abs(ball[2] - prevBallZ) > 1e-5;
        const d = Math.hypot(ball[0] - s[0], ball[2] - s[1]);
        if (overheadCue) {
          prepKey = 'overhead';
          wantPrep = 1;
        } else if (moved || isNaN(prevBallX)) {
          const d3 = Math.hypot(d, Math.max(0, ball[1] - 1.3));
          const closing = (lastBallD - d3) / Math.max(ballStepDt, 1e-3);
          lastBallD = d3; ballStepDt = 0;
          prevBallX = ball[0]; prevBallY = ball[1]; prevBallZ = ball[2];
          if (d < 2.6 && ball[1] > 1.55) {
            prepKey = 'overhead';
            wantPrep = 1;
          } else {
            const coming = closing > 0.5 && closing < 60 && ball[1] > 0.1, tt = (d3 - 0.8) / Math.max(closing, 0.5);
            if (coming && tt < 0.95) {
              if (!(prepKey === 'overhead' && prepW > 0.25 && ball[1] > 1.15)) prepKey = strokeFor(s, ball);
            }
            wantPrep = coming ? Math.min(1, Math.max(0, (0.8 - tt) / 0.45))
              : (prepKey === 'overhead' && d < 2.4 && ball[1] > 1.2 ? 0.95 : 0);
          }
        }
        prepW += (wantPrep - prepW) * (1 - Math.exp(-Math.max(dt, 1 / 120) / 0.09));
        if (prepW > 0.02) {
          prep = lerpPose(P({}), PREP[prepKey], prepW);
          if (ball[1] < 0.6 && prepKey !== 'overhead') {  // get down to low balls via deep front-knee lunge, less spine bend
            prep.hips[0] += 0.12 * prepW;
            prep.spine[0] += 0.16 * prepW;
            const bh = prepKey === 'backhand';
            const fT = bh ? prep.rThigh : prep.bThigh, fC = bh ? prep.rCalf : prep.bCalf, fF = bh ? prep.rFoot : prep.bFoot;
            const kT = bh ? prep.bThigh : prep.rThigh, kC = bh ? prep.bCalf : prep.rCalf, kF = bh ? prep.bFoot : prep.rFoot;
            fT[0] -= 0.36 * prepW; fC[0] += 0.54 * prepW; fF[0] -= 0.18 * prepW;
            kT[0] -= 0.24 * prepW; kC[0] += 0.56 * prepW; kF[0] += 0.02 * prepW;
          }
        }
      } else if (!ball) {
        wantPrep = 0; prepW = 0;
      }
      if (!sw) swingKey = null;
      else if (sw !== 'serve' && (!swingKey || (SWINGS[sw] && sw !== 'forehand' && swingKey !== sw))) {
        const side = prepKey === 'overhead' ? 'forehand' : prepKey;
        swingKey = SWINGS[sw] && sw !== 'forehand' ? sw : sw === 'volley' ? (side === 'backhand' ? 'volleyB' : 'volleyF') : side;
        prepW = 0; wantPrep = 0;
      }
      // Stabilize upper body against run/walk arm-pumping while cocking the racket or swinging
      const steady = sw ? 0.92 : prepW * 0.88;
      if (steady > 0.01 && cur !== 'idle') {
        for (const k of ['spine_02', 'spine_03', 'neck_01', 'upperarm_' + R, 'lowerarm_' + R, 'hand_' + R, 'upperarm_' + B, 'lowerarm_' + B]) {
          if (bones[k] && idleQuats[k]) bones[k].quaternion.slerp(idleQuats[k], steady);
        }
      }
      // ready grip: with the handle through the fist, the idle clip would rest the racket against the neck; turn the
      // wrist so the head stands up and forward, clear of the body (tuned visually, mirrored for left-handers)
      add(bones['hand_' + R], 0, 0.9 * m, 0); add(bones['lowerarm_' + R], 0, 0, 0.3 * m);
      const pose = sw === 'serve' ? track(SERVE_SWING, t)
        : sw ? track(SWINGS[swingKey], t)
        : s[3] === 'serveToss' ? lerpPose(SERVE_READY, SERVE_BACK, Math.min(1, tossT / 0.45))
        : s[3] === 'serveReady' ? SERVE_READY : prep;
      if (pose) {
        holder.rotation.y = s[2] + pose.yaw * m;
        const legW = (cur === 'run' ? 0.35 : cur === 'walk' ? 0.6 : 1) * LEG_DEPTH;
        const arm = (bone, [x, y, z], w = 1) => add(bones[bone], x * w, y * m * w, z * m * w);
        arm('pelvis', pose.hips);
        arm('spine_02', pose.spine);
        arm('spine_03', pose.chest);
        let hx = pose.head[0], hy = pose.head[1], hz = pose.head[2];
        if (ball && (sw || prepW > 0.02)) {
          const dx = ball[0] - s[0], dy = ball[1] - 1.5, dz = ball[2] - s[1], d = Math.hypot(dx, dz) || 1;
          const bodyYaw = s[2] + (pose.yaw + pose.hips[1] + pose.spine[1] + pose.chest[1]) * m;
          const fwd = Math.sin(bodyYaw) * dx + Math.cos(bodyYaw) * dz;
          const left = Math.cos(bodyYaw) * dx - Math.sin(bodyYaw) * dz;
          const torsoPitch = pose.hips[0] + pose.spine[0] + pose.chest[0];
          const w = sw ? Math.min(1, (0.55 - t) / 0.15) : prepW;
          hx = Math.max(-0.6, Math.min(0.6, hx * (1 - w) + (-Math.atan2(dy, d) - torsoPitch * 0.5) * w));
          hy = Math.max(-0.6, Math.min(0.6, hy * (1 - w) + Math.atan2(left, Math.max(0.25, fwd)) * m * w));
        }
        add(bones.neck_01, hx, hy * m, hz * m);
        arm('upperarm_' + R, pose.rUp); arm('lowerarm_' + R, pose.rLow); arm('hand_' + R, pose.rHand);
        arm('upperarm_' + B, pose.bUp); arm('lowerarm_' + B, pose.bLow);
        arm('thigh_' + R, pose.rThigh, legW); arm('calf_' + R, pose.rCalf, legW); arm('foot_' + R, pose.rFoot, legW);
        arm('thigh_' + B, pose.bThigh, legW); arm('calf_' + B, pose.bCalf, legW); arm('foot_' + B, pose.bFoot, legW);
      }
      root.position.y = 0;
      root.position.y = restFoot - lowestFoot();
    },
    dispose() { scene.remove(holder); },
  };
}

// Hair look: colour, an optional cut height (rest-pose metres, e.g. a chin-length bob), thinning (opacity < 1) and gel (wet shine).
function hairMaterial(base, color, cut, opacity = 1, gel = false) {
  const m = base.clone();
  m.color = color.getHSL({}).l > 0.85 ? color.clone().multiplyScalar(1.7) : color;  // the dark hair texture greys white hair: lift it
  if (gel) { m.roughness = 0.3; m.metalness = 0; }
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; m.depthWrite = false; }
  if (cut) {
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vRestY;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRestY = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vRestY;')
        .replace('void main() {', `void main() {\n  if (vRestY < ${cut.toFixed(3)}) discard;`);
    };
    m.customProgramCacheKey = () => 'hair-cut' + cut;
  }
  return m;
}

// Ponytail, headband or visor, placed around the rest-pose head (measured: crown 1.78 m, forehead z +0.10,
// back of the head z -0.12 for height 1) and then parented to the Head bone so they follow every move.
function addHeadwear(head, root, ch, hairColor) {
  const k = ch.body?.height || 1, parts = [];
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
  if (ch.ponytail) {
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.008, 6, 12), lam(ch.headwear?.color || '#222222'));
    tie.position.set(0, 1.71, -0.115); parts.push(tie);
    const len = ch.ponytail === true ? 0.22 : ch.ponytail;  // a number = tail length in metres (0.4 = mid-back)
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.008, len, 10).translate(0, -len / 2, 0), lam(hairColor));
    tail.position.set(0, 1.715, -0.125); tail.rotation.x = -0.066 / len;  // tipped toward the neck: the ready stance pitches the head forward, so it hangs straight down (a long tail tips less, or it sinks into the back)
    parts.push(tail);
  }
  if (ch.topknot) {  // samurai bun on the crown
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), lam(hairColor));
    bun.scale.set(1, 0.9, 1.1); bun.position.set(0, ch.gender === 'f' ? 1.775 : 1.818, -0.045); parts.push(bun);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 12), lam('#222222'));
    tie.rotation.x = Math.PI / 2; tie.position.set(0, ch.gender === 'f' ? 1.755 : 1.798, -0.045); parts.push(tie);
  }
  if (ch.glasses) {  // frames in front of the eyes (eyes: female ~1.655, male ~1.695)
    const gy = ch.gender === 'f' ? 1.656 : 1.695, frame = lam(ch.glasses === true ? '#1b1b1b' : ch.glasses);
    for (const sx of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0028, 6, 18), frame);
      rim.position.set(sx * 0.031, gy, 0.097); parts.push(rim);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.1), frame);
      arm.position.set(sx * 0.07, gy + 0.003, 0.05); arm.rotation.y = sx * 0.25; parts.push(arm);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.004, 0.004), frame);
    bridge.position.set(0, gy + 0.005, 0.099); parts.push(bridge);
  }
  if (ch.headwear) {
    const c = ch.headwear.color;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.01, 6, 28), lam(c));
    band.rotation.x = Math.PI / 2 + 0.12; band.scale.set(1, 1.18, 1);  // oval like the head, lower at the front
    band.position.set(0, 1.695, -0.008); parts.push(band);
    if (ch.headwear.type === 'visor') {
      const brim = new THREE.Mesh(new THREE.CircleGeometry(0.085, 18, 0, Math.PI), lam(c));
      brim.material.side = THREE.DoubleSide;
      brim.rotation.x = -Math.PI / 2 + 0.2; brim.scale.set(1, 0.85, 1);  // flat, tipped down a little
      brim.position.set(0, 1.69, 0.085); parts.push(brim);
    }
  }
  root.updateMatrixWorld(true);
  for (const p of parts) {
    p.castShadow = true;
    p.position.multiplyScalar(k); p.scale.multiplyScalar(k);
    head.attach(p);
  }
}

// Low-poly padel shoe (one draw call): white rubber sole, coloured upper and heel collar, accent stripes.
const SHOE_LEN = 0.275;
function makeShoe(upper, accent) {
  const part = (geo, color, x, y, z, sx = 1, sy = 1, sz = 1) => {
    geo = geo.toNonIndexed().scale(sx, sy, sz).translate(x, y, z);
    const c = new THREE.Color(color), col = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < col.length; i += 3) { col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  };
  const geo = mergeGeometries([
    part(new THREE.CylinderGeometry(1, 1, 1, 18), '#f1f1ee', 0, 0.013, 0, 0.056, 0.026, SHOE_LEN / 2),                // oval sole
    part(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), upper, 0, 0.024, 0, 0.051, 0.085, 0.13), // upper
    part(new THREE.CylinderGeometry(0.048, 0.054, 0.09, 12), upper, 0, 0.07, -0.07),                                   // heel collar
    part(new THREE.BoxGeometry(0.006, 0.02, 0.12), accent, 0.049, 0.05, 0.01),                                         // stripes
    part(new THREE.BoxGeometry(0.006, 0.02, 0.12), accent, -0.049, 0.05, 0.01),
    part(new THREE.BoxGeometry(0.03, 0.008, 0.07), '#ffffff', 0, 0.108, 0.02),                                          // laces
  ]);
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.castShadow = true;
  return m;
}

// Serve poses, tuned visually: Euler XYZ offsets added on top of the idle clip (rUp/rLow/rHand = racket arm,
// bUp/bLow = ball arm, yaw = body turn). Ready mirrors the classic side-on stance with the racket cocked behind
// the head; the ball is then dropped, the racket falls low, and the ball is struck underhand after the bounce.
// crouch depth knob: the leg keyframes below at full strength sink the hips ~18 cm and knock the knees in
const LEG_DEPTH = 0.55;
const P = (o) => ({
  yaw: 0, hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0],
  rUp: [0, 0, 0], rLow: [0, 0, 0], rHand: [0, 0, 0], bUp: [0, 0, 0], bLow: [0, 0, 0],
  rThigh: [0, 0, 0], rCalf: [0, 0, 0], rFoot: [0, 0, 0], bThigh: [0, 0, 0], bCalf: [0, 0, 0], bFoot: [0, 0, 0],
  ...o,
});
export const SERVE_READY = P({
  yaw: -1.15, hips: [0.05, -0.14, 0.03], spine: [0.08, -0.06, -0.03], chest: [0.04, -0.14, 0.04], head: [0.08, 0.42, 0],
  rUp: [0, 0.6, -1.3], rLow: [0, 0, -1.7], bUp: [-0.7, 0, 1.1], bLow: [0, 0, 0.1],
  rThigh: [-0.34, -0.06, 0.12], rCalf: [0.58, 0, 0], rFoot: [-0.24, 0, 0],
  bThigh: [-0.32, 0.05, -0.08], bCalf: [0.55, 0, 0], bFoot: [-0.23, 0, 0],
});
export const SERVE_BACK = P({
  yaw: -0.55, hips: [0.12, -0.18, 0.04], spine: [0.22, -0.08, -0.04], chest: [0.10, -0.18, 0.05], head: [0.22, 0.25, 0],
  rUp: [-1.0, 0, 0], rLow: [0, 0, -0.25], bUp: [0.25, 0, 0.45], bLow: [0, 0, 0.20],
  rThigh: [-0.46, -0.08, 0.14], rCalf: [0.74, 0, 0], rFoot: [-0.28, 0, 0],
  bThigh: [-0.42, 0.06, -0.10], bCalf: [0.68, 0, 0], bFoot: [-0.26, 0, 0],
});
export const SERVE_SWING = [  // t = seconds since contact (underhand padel serve: crouch -> leg/hip drive -> waist-high strike -> weight forward)
  [0, SERVE_BACK],
  [0.03, P({
    yaw: -0.35, hips: [0.10, 0.18, 0.02], spine: [0.20, 0.04, 0], chest: [0.10, -0.12, 0.03], head: [0.18, 0.14, 0],
    rUp: [-0.25, 0, -0.15], rLow: [0, 0, -0.20], rHand: [0.25, 0, 0], bUp: [0.30, 0, 0.35], bLow: [0, 0, 0.30],
    rThigh: [-0.34, 0.04, 0.08], rCalf: [0.60, 0, 0], rFoot: [0.06, 0, 0],
    bThigh: [-0.34, 0.02, -0.08], bCalf: [0.54, 0, 0], bFoot: [-0.20, 0, 0],
  })],
  [0.08, P({
    yaw: -0.15, hips: [0.10, 0.24, 0.01], spine: [0.18, 0.10, 0], chest: [0.08, 0.14, -0.04], head: [0.10, -0.05, 0],
    rUp: [0.80, 0, 0], rLow: [0, 0, -0.25], rHand: [0.80, 0, 0], bUp: [0.20, 0, 0.25], bLow: [0, 0, 0.40],
    rThigh: [-0.26, 0.10, 0.08], rCalf: [0.56, 0, 0], rFoot: [0.24, 0, 0],
    bThigh: [-0.30, -0.04, -0.06], bCalf: [0.48, 0, 0], bFoot: [-0.18, 0, 0],
  })],
  [0.36, P({
    yaw: 0.25, hips: [0.06, 0.26, -0.01], spine: [0.12, 0.12, 0], chest: [0.06, 0.20, -0.05], head: [-0.04, -0.20, 0],
    rUp: [1.55, -0.10, 0.25], rLow: [0, 0, -0.65], rHand: [0.40, 0, 0], bUp: [0.10, 0, -0.10], bLow: [0, 0, 0.45],
    rThigh: [-0.22, 0.16, 0.06], rCalf: [0.58, 0, 0], rFoot: [0.38, 0, 0],
    bThigh: [-0.26, -0.04, -0.05], bCalf: [0.44, 0, 0], bFoot: [-0.18, 0, 0],
  })],
  [0.55, P({})],
];
// Strokes, tuned visually. PREP = athletic bent-knee stance while the ball approaches; each swing runs
// kinetic chain: prep (0) -> leg push & hip opening (0.03-0.04) -> chest & arm contact (0.06-0.08) -> follow-through -> recovery (0.55).
export const PREP = {
  forehand: P({
    yaw: -0.7, hips: [0.06, -0.18, 0.04], spine: [0.12, -0.10, -0.05], chest: [0.05, -0.22, 0.06], head: [-0.08, 0.38, 0],
    rUp: [-0.9, 0, -0.5], rLow: [0, 0, -0.4], bUp: [0.6, 0, 0.5], bLow: [0, 0, 0.2],
    rThigh: [-0.38, -0.08, 0.14], rCalf: [0.62, 0, 0], rFoot: [-0.24, 0, 0],
    bThigh: [-0.35, 0.06, -0.10], bCalf: [0.58, 0, 0], bFoot: [-0.23, 0, 0],
  }),
  backhand: P({
    yaw: 0.85, hips: [0.06, 0.18, -0.04], spine: [0.14, 0.10, 0.05], chest: [0.06, 0.24, -0.06], head: [-0.08, -0.42, 0],
    rUp: [0.5, 0, 0.9], rLow: [0, 0, -0.6], rHand: [-0.1, 0, 0], bUp: [0.45, 0, -0.25], bLow: [0, 0, 0.35],
    rThigh: [-0.35, -0.06, 0.10], rCalf: [0.58, 0, 0], rFoot: [-0.23, 0, 0],
    bThigh: [-0.38, 0.08, -0.14], bCalf: [0.62, 0, 0], bFoot: [-0.24, 0, 0],
  }),
  overhead: P({
    yaw: -0.85, hips: [-0.04, -0.18, 0.03], spine: [-0.12, -0.08, -0.04], chest: [-0.10, -0.22, 0.10], head: [-0.36, 0.38, 0],
    rUp: [-0.35, 0.45, -1.45], rLow: [0, 0, -1.15], rHand: [-0.2, 0, 0], bUp: [0.45, 0, 1.35], bLow: [0, 0, 0.25],
    rThigh: [-0.38, -0.10, 0.15], rCalf: [0.62, 0, 0], rFoot: [-0.24, 0, 0],
    bThigh: [-0.35, 0.06, -0.12], bCalf: [0.58, 0, 0], bFoot: [-0.23, 0, 0],
  }),
};
const half = (k) => lerpPose(P({}), PREP[k], 0.55);
export const SWINGS = {
  forehand: [
    [0, PREP.forehand],
    [0.03, P({
      yaw: -0.30, hips: [0.08, 0.24, 0.01], spine: [0.14, 0.04, 0], chest: [0.08, -0.18, 0.03], head: [-0.06, 0.16, 0],
      rUp: [-0.35, 0.10, -0.58], rLow: [0, 0, -0.45], rHand: [-0.15, 0, 0], bUp: [0.45, 0, 0.35], bLow: [0, 0, 0.30],
      rThigh: [-0.32, 0.04, 0.10], rCalf: [0.58, 0, 0], rFoot: [0.08, 0, 0],
      bThigh: [-0.32, 0.02, -0.08], bCalf: [0.52, 0, 0], bFoot: [-0.20, 0, 0],
    })],
    [0.07, P({
      yaw: 0.05, hips: [0.10, 0.28, 0], spine: [0.15, 0.12, 0], chest: [0.10, 0.18, -0.04], head: [-0.06, -0.10, 0],
      rUp: [0.35, 0, -0.58], rLow: [0, 0, -0.35], rHand: [0.10, 0, 0], bUp: [0.25, 0, 0.20], bLow: [0, 0, 0.45],
      rThigh: [-0.26, 0.12, 0.08], rCalf: [0.58, 0, 0], rFoot: [0.25, 0, 0],
      bThigh: [-0.30, -0.04, -0.06], bCalf: [0.48, 0, 0], bFoot: [-0.18, 0, 0],
    })],
    [0.28, P({
      yaw: 0.48, hips: [0.08, 0.30, -0.02], spine: [0.14, 0.18, 0], chest: [0.10, 0.32, -0.06], head: [-0.04, -0.38, 0],
      rUp: [1.18, -0.15, 0.40], rLow: [0, 0, -0.92], rHand: [0.28, 0, 0], bUp: [0.15, 0, -0.15], bLow: [0, 0, 0.55],
      rThigh: [-0.24, 0.22, 0.06], rCalf: [0.62, 0, 0], rFoot: [0.42, 0, 0],
      bThigh: [-0.26, -0.06, -0.05], bCalf: [0.44, 0, 0], bFoot: [-0.18, 0, 0],
    })],
    [0.55, P({})],
  ],
  backhand: [
    [0, PREP.backhand],
    [0.03, P({
      yaw: 0.45, hips: [0.08, -0.22, -0.01], spine: [0.14, -0.04, 0], chest: [0.08, 0.16, -0.03], head: [-0.06, -0.20, 0],
      rUp: [0.48, 0, 0.35], rLow: [0, 0, -0.45], rHand: [-0.05, 0, 0], bUp: [0.15, 0, 0.25], bLow: [0, 0, 0.25],
      rThigh: [-0.32, -0.02, 0.08], rCalf: [0.52, 0, 0], rFoot: [-0.20, 0, 0],
      bThigh: [-0.32, -0.04, -0.10], bCalf: [0.58, 0, 0], bFoot: [0.08, 0, 0],
    })],
    [0.07, P({
      yaw: 0.18, hips: [0.10, -0.26, 0], spine: [0.15, -0.10, 0], chest: [0.10, -0.14, 0.04], head: [-0.06, 0.05, 0],
      rUp: [0.45, 0, -0.35], rLow: [0, 0, -0.28], rHand: [0.12, 0, 0], bUp: [-0.35, 0, 0.55], bLow: [0, 0, 0.15],
      rThigh: [-0.30, 0.04, 0.06], rCalf: [0.48, 0, 0], rFoot: [-0.18, 0, 0],
      bThigh: [-0.26, -0.12, -0.08], bCalf: [0.58, 0, 0], bFoot: [0.25, 0, 0],
    })],
    [0.28, P({
      yaw: -0.28, hips: [0.08, -0.28, 0.02], spine: [0.12, -0.14, 0], chest: [0.08, -0.26, 0.05], head: [-0.04, 0.28, 0],
      rUp: [0.22, 0, -1.38], rLow: [0, 0, -0.35], rHand: [0.22, 0, 0], bUp: [-0.65, 0, 0.85], bLow: [0, 0, 0.10],
      rThigh: [-0.26, 0.06, 0.05], rCalf: [0.44, 0, 0], rFoot: [-0.18, 0, 0],
      bThigh: [-0.24, -0.20, -0.06], bCalf: [0.62, 0, 0], bFoot: [0.42, 0, 0],
    })],
    [0.55, P({})],
  ],
  overhead: [
    [0, PREP.overhead],
    [0.04, P({
      yaw: -0.50, hips: [0.02, 0.16, 0.01], spine: [-0.04, -0.04, 0], chest: [-0.04, -0.16, 0.06], head: [-0.28, 0.22, 0],
      rUp: [-0.05, 0.30, -1.65], rLow: [0, 0, -0.75], rHand: [0.05, 0, 0], bUp: [0.50, 0, 1.05], bLow: [0, 0, 0.20],
      rThigh: [-0.30, 0.02, 0.10], rCalf: [0.52, 0, 0], rFoot: [-0.06, 0, 0],
      bThigh: [-0.30, 0.04, -0.08], bCalf: [0.50, 0, 0], bFoot: [-0.20, 0, 0],
    })],
    [0.08, P({
      yaw: -0.15, hips: [0.06, 0.20, 0], spine: [0.05, 0.06, 0], chest: [0.04, 0.14, -0.04], head: [-0.18, 0.06, 0],
      rUp: [0.35, 0.15, -1.80], rLow: [0, 0, -0.20], rHand: [0.35, 0, 0], bUp: [0.35, 0, 0.65], bLow: [0, 0, 0.30],
      rThigh: [-0.24, 0.08, 0.08], rCalf: [0.50, 0, 0], rFoot: [0.18, 0, 0],
      bThigh: [-0.28, 0, -0.06], bCalf: [0.46, 0, 0], bFoot: [-0.18, 0, 0],
    })],
    [0.28, P({
      yaw: 0.38, hips: [0.10, 0.24, -0.01], spine: [0.24, 0.12, 0], chest: [0.12, 0.22, -0.06], head: [-0.06, -0.22, 0],
      rUp: [0.95, -0.15, -0.55], rLow: [0, 0, -0.65], rHand: [0.50, 0, 0], bUp: [-0.10, 0, 0.25], bLow: [0, 0, 0.45],
      rThigh: [-0.22, 0.16, 0.06], rCalf: [0.56, 0, 0], rFoot: [0.34, 0, 0],
      bThigh: [-0.26, -0.04, -0.05], bCalf: [0.44, 0, 0], bFoot: [-0.18, 0, 0],
    })],
    [0.55, P({})],
  ],
  smash: [
    [0, PREP.overhead],
    [0.03, P({
      yaw: -0.35, hips: [-0.04, 0.30, 0], spine: [-0.08, 0.04, 0], chest: [-0.12, -0.14, 0.08], head: [-0.32, 0.12, 0],
      rUp: [0.05, 0.30, -1.78], rLow: [0, 0, -0.60], rHand: [0.10, 0, 0], bUp: [0.35, 0, 0.90], bLow: [0, 0, 0.30],
      rThigh: [-0.16, 0.06, 0.08], rCalf: [0.30, 0, 0], rFoot: [0.22, 0, 0],
      bThigh: [-0.14, 0.02, -0.06], bCalf: [0.22, 0, 0], bFoot: [-0.06, 0, 0],
    })],
    [0.07, P({
      yaw: -0.08, hips: [0.06, 0.36, 0], spine: [0.08, 0.14, 0], chest: [0.06, 0.32, -0.08], head: [-0.24, -0.08, 0],
      rUp: [0.45, 0.15, -1.95], rLow: [0, 0, -0.15], rHand: [0.45, 0, 0], bUp: [0.15, 0, 0.45], bLow: [0, 0, 0.50],
      rThigh: [-0.12, 0.12, 0.06], rCalf: [0.26, 0, 0], rFoot: [0.32, 0, 0],
      bThigh: [-0.10, 0, -0.05], bCalf: [0.16, 0, 0], bFoot: [-0.04, 0, 0],
    })],
    [0.26, P({
      yaw: 0.55, hips: [0.18, 0.38, -0.02], spine: [0.38, 0.18, 0], chest: [0.22, 0.36, -0.10], head: [-0.24, -0.35, 0],
      rUp: [1.15, -0.20, -0.50], rLow: [0, 0, -0.70], rHand: [0.60, 0, 0], bUp: [-0.25, 0, 0.20], bLow: [0, 0, 0.60],
      rThigh: [-0.46, 0.20, 0.04], rCalf: [0.74, 0, 0], rFoot: [0.46, 0, 0],
      bThigh: [-0.30, -0.08, -0.06], bCalf: [0.50, 0, 0], bFoot: [-0.20, 0, 0],
    })],
    [0.55, P({})],
  ],
  volleyF: [
    [0, half('forehand')],
    [0.03, P({
      yaw: -0.22, hips: [0.08, 0.12, 0.02], spine: [0.12, 0.02, 0], chest: [0.06, -0.08, 0.02], head: [-0.06, 0.12, 0],
      rUp: [0.10, 0, -0.50], rLow: [0, 0, -0.38], bUp: [0.45, 0, 0.35], bLow: [0, 0, 0.30],
      rThigh: [-0.34, 0.02, 0.10], rCalf: [0.58, 0, 0], rFoot: [-0.12, 0, 0],
      bThigh: [-0.36, 0.04, -0.08], bCalf: [0.58, 0, 0], bFoot: [-0.22, 0, 0],
    })],
    [0.06, P({
      yaw: -0.08, hips: [0.10, 0.16, 0.01], spine: [0.14, 0.06, 0], chest: [0.08, 0.10, -0.02], head: [-0.06, 0.04, 0],
      rUp: [0.52, 0, -0.48], rLow: [0, 0, -0.35], rHand: [0.12, 0, 0], bUp: [0.38, 0, 0.28], bLow: [0, 0, 0.35],
      rThigh: [-0.30, 0.05, 0.08], rCalf: [0.58, 0, 0], rFoot: [0.12, 0, 0],
      bThigh: [-0.36, 0, -0.06], bCalf: [0.56, 0, 0], bFoot: [-0.20, 0, 0],
    })],
    [0.25, P({
      yaw: 0.06, hips: [0.08, 0.18, 0], spine: [0.12, 0.08, 0], chest: [0.06, 0.14, -0.02], head: [-0.05, -0.08, 0],
      rUp: [0.70, 0, -0.30], rLow: [0, 0, -0.42], rHand: [0.15, 0, 0], bUp: [0.28, 0, 0.18], bLow: [0, 0, 0.40],
      rThigh: [-0.28, 0.08, 0.06], rCalf: [0.56, 0, 0], rFoot: [0.20, 0, 0],
      bThigh: [-0.32, -0.02, -0.05], bCalf: [0.50, 0, 0], bFoot: [-0.18, 0, 0],
    })],
    [0.55, P({})],
  ],
  volleyB: [
    [0, half('backhand')],
    [0.03, P({
      yaw: 0.32, hips: [0.08, -0.12, -0.02], spine: [0.12, -0.02, 0], chest: [0.06, 0.08, -0.02], head: [-0.06, -0.14, 0],
      rUp: [0.48, 0, 0.45], rLow: [0, 0, -0.45], bUp: [0.20, 0, 0.10], bLow: [0, 0, 0.30],
      rThigh: [-0.36, -0.04, 0.08], rCalf: [0.58, 0, 0], rFoot: [-0.22, 0, 0],
      bThigh: [-0.34, -0.02, -0.10], bCalf: [0.58, 0, 0], bFoot: [-0.12, 0, 0],
    })],
    [0.06, P({
      yaw: 0.16, hips: [0.10, -0.16, -0.01], spine: [0.14, -0.06, 0], chest: [0.08, -0.10, 0.02], head: [-0.06, -0.06, 0],
      rUp: [0.52, 0, 0.08], rLow: [0, 0, -0.32], rHand: [0.10, 0, 0], bUp: [-0.18, 0, 0.38], bLow: [0, 0, 0.20],
      rThigh: [-0.36, 0, 0.06], rCalf: [0.56, 0, 0], rFoot: [-0.20, 0, 0],
      bThigh: [-0.30, -0.05, -0.08], bCalf: [0.58, 0, 0], bFoot: [0.12, 0, 0],
    })],
    [0.25, P({
      yaw: 0.02, hips: [0.08, -0.18, 0], spine: [0.12, -0.08, 0], chest: [0.06, -0.14, 0.02], head: [-0.05, 0.05, 0],
      rUp: [0.40, 0, -0.60], rLow: [0, 0, -0.30], rHand: [0.14, 0, 0], bUp: [-0.35, 0, 0.55], bLow: [0, 0, 0.15],
      rThigh: [-0.32, 0.02, 0.05], rCalf: [0.50, 0, 0], rFoot: [-0.18, 0, 0],
      bThigh: [-0.28, -0.08, -0.06], bCalf: [0.56, 0, 0], bFoot: [0.20, 0, 0],
    })],
    [0.55, P({})],
  ],
};

function lerpPose(A, B, u) {
  u = u * u * (3 - 2 * u);
  const o = {};
  for (const k in A) o[k] = k === 'yaw' ? A.yaw + (B.yaw - A.yaw) * u : A[k].map((v, i) => v + (B[k][i] - v) * u);
  return o;
}
function track(keys, t) {
  const n = keys.findIndex(k => k[0] > t);
  if (n < 0) return keys[keys.length - 1][1];
  if (n === 0) return keys[0][1];
  const [ta, A] = keys[n - 1], [tb, B] = keys[n];
  return lerpPose(A, B, (t - ta) / (tb - ta));
}

function makeLabel(name, cc) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 48;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, 0, 256, 48);
  x.fillStyle = '#fff'; x.font = 'bold 24px system-ui'; x.textAlign = 'center';
  x.fillText(`${name}  ${cc}`, 128, 32);
  // constant on-screen size: readable far away, never fills the screen in close-up cameras
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, sizeAttenuation: false }));
  s.scale.set(0.11, 0.02, 1);
  return s;
}

function makeBubble() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, sizeAttenuation: false }));
  sprite.scale.set(0.12, 0.03, 1); sprite.visible = false;
  return {
    sprite,
    draw(text) {
      x.clearRect(0, 0, 256, 64);
      x.fillStyle = '#fff'; x.beginPath(); x.roundRect(4, 4, 248, 46, 20); x.fill();
      x.beginPath(); x.moveTo(118, 49); x.lineTo(128, 62); x.lineTo(138, 49); x.fill();  // tail
      x.fillStyle = '#111'; x.font = 'bold 28px system-ui'; x.textAlign = 'center'; x.fillText(text, 128, 37);
      tex.needsUpdate = true;
    },
  };
}
