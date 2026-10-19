// Local input: keyboard = first human, each gamepad = next human. Output matches game.stepWorld input shape.
const keys = new Set();
const pressed = new Set();
const GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
if (typeof addEventListener !== 'undefined') {  // node tests import toWorld
  addEventListener('keydown', e => {
    // in a match (#hud shown) arrows and Space must not scroll the page; menus keep them for selects and buttons
    if (GAME_KEYS.includes(e.code) && document.getElementById('hud')?.hidden === false) e.preventDefault();
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
}

// 'slice' = slice serve; in a rally it falls back to the automatic shot
// 'contra' = contrapared off your own glass: hold left/right for a side glass, nothing for the back glass
const SWING_KEYS = { Space: 'auto', KeyJ: 'auto', KeyK: 'lob', KeyL: 'smash', KeyU: 'chiquita', KeyI: 'vibora', KeyF: 'slice', KeyO: 'contra' };
const PAD_BTN = { 0: 'auto', 1: 'lob', 3: 'smash', 2: 'chiquita', 5: 'vibora', 4: 'slice', 7: 'contra' };  // Xbox: A B Y X RB LB RT
const padPrev = {};

// gamepad shortcuts mapped onto keyboard codes so the game checks one thing: View = camera, R3 = replay,
// Start = pause menu (any button skips a replay, see main.js), D-pad ↓ = scoreboard mode
const PAD_KEYS = { 8: 'KeyC', 11: 'KeyR', 9: 'Pause', 13: 'KeyB' };
const padKeyPrev = {};
function pollPadKeys() {
  for (const gp of navigator.getGamepads?.() || []) {
    if (!gp) continue;
    for (const b in PAD_KEYS) {
      const on = !!gp.buttons[b]?.pressed, k = gp.index + ':' + b;
      if (on && !padKeyPrev[k]) pressed.add(PAD_KEYS[b]);
      padKeyPrev[k] = on;
    }
  }
}

// drop queued presses (e.g. the key that skipped a replay must not become a swing afterwards)
export function clearPressed() { pressed.clear(); }

// touch controls (src/touch.js): the virtual stick adds to the keyboard's direction (its buttons send key events)
let touchMove = [0, 0];
export function setTouchMove(x, y) { touchMove = [x, y]; }

export function consumePressed(code) { pollPadKeys(); const had = pressed.has(code); pressed.delete(code); return had; }

// Translates screen input (sx, sy: -1..1) to world movement [x, z].
// When camPlane is supplied (from active camera rig), movement is screen-oriented:
// screen UP moves up on-screen, screen LEFT moves left on-screen, in any camera angle.
export function toWorld(sx, sy, team, camPlane) {
  if (camPlane?.right && camPlane?.forward) {
    const [rx, rz] = camPlane.right;
    const [fx, fz] = camPlane.forward;
    const x = sx * rx + sy * fx;
    const z = sx * rz + sy * fz;
    return [x === 0 ? 0 : x, z === 0 ? 0 : z];
  }
  const s = team === 0 ? 1 : -1;
  const x = sx * s;
  const z = -sy * s;
  return [x === 0 ? 0 : x, z === 0 ? 0 : z];
}

export function readKeyboard(team, camPlane) {
  const clamp1 = (v) => Math.max(-1, Math.min(1, v));
  const sx = clamp1((keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touchMove[0]);
  const sy = clamp1((keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + touchMove[1]);
  let swing = null;
  for (const k in SWING_KEYS) if (consumePressed(k)) swing = SWING_KEYS[k];
  const move = toWorld(sx, sy, team, camPlane);
  return { move, swing, aim: move[0], ...(consumePressed('KeyE') && { eat: true }) }; // aim: hold left/right while swinging to place the ball
}

export function readGamepad(index, team, camPlane) {  // index = the n-th connected pad (browser slots can have gaps after a reconnect)
  const gp = [...(navigator.getGamepads?.() || [])].filter(Boolean)[index];
  if (!gp) return null;
  const dz = v => (Math.abs(v) < 0.18 ? 0 : v);
  const sx = dz(gp.axes[0]), sy = -dz(gp.axes[1]);
  let swing = null;
  const prev = padPrev[index] || [];
  for (const b in PAD_BTN) if (gp.buttons[b]?.pressed && !prev[b]) swing = PAD_BTN[b];
  const eat = gp.buttons[6]?.pressed && !prev[6];  // LT (Y is smash)
  padPrev[index] = gp.buttons.map(b => b.pressed);
  const move = toWorld(sx, sy, team, camPlane);
  return { move, swing, aim: move[0], ...(eat && { eat: true }) };
}

export const gamepadCount = () => [...(navigator.getGamepads?.() || [])].filter(Boolean).length;

// control for this frame: with several local humans and a pad each, everyone plays on a pad (P1 = 1st pad,
// P2 = 2nd…); with fewer pads P1 keeps the keyboard and the pads go to P2 onward. Checked every frame, so a pad
// plugged in mid-match takes over.
export const localControl = (control, humans, pads = gamepadCount()) =>
  control === 'auto' && humans > 1 ? (pads >= humans ? 'pad' : 'kb') : control;

// first local player: 'kb' keyboard only, 'pad' first gamepad only, 'auto' both
export function readLocal(team, mode = 'auto', camPlane) {
  if (mode === 'pad') return readGamepad(0, team, camPlane) || { move: [0, 0], swing: null, aim: 0 };
  const kb = readKeyboard(team, camPlane), pad = mode === 'auto' && readGamepad(0, team, camPlane);
  if (!pad) return kb;
  const move = kb.move[0] || kb.move[1] ? kb.move : pad.move;
  return { move, swing: kb.swing || pad.swing, aim: move[0], ...((kb.eat || pad.eat) && { eat: true }) };
}
