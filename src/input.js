// Local input: keyboard = first human, each gamepad = next human. Output matches game.stepWorld input shape.
const keys = new Set();
const pressed = new Set();
addEventListener('keydown', e => { if (!keys.has(e.code)) pressed.add(e.code); keys.add(e.code); });
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// 'slice' = slice serve; in a rally it falls back to the automatic shot
// 'contra' = contrapared off your own glass: hold left/right for a side glass, nothing for the back glass
const SWING_KEYS = { Space: 'auto', KeyJ: 'auto', KeyK: 'lob', KeyL: 'smash', KeyU: 'chiquita', KeyI: 'vibora', KeyF: 'slice', KeyO: 'contra' };
const PAD_BTN = { 0: 'auto', 1: 'lob', 3: 'smash', 2: 'chiquita', 5: 'vibora', 4: 'slice', 7: 'contra' };  // Xbox: A B Y X RB LB RT
const padPrev = {};

// gamepad shortcuts mapped onto keyboard codes so the game checks one thing: View = camera, R3 = replay,
// Start = pause menu (any button skips a replay, see main.js)
const PAD_KEYS = { 8: 'KeyC', 11: 'KeyR', 9: 'Pause' };
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

export function consumePressed(code) { pollPadKeys(); const had = pressed.has(code); pressed.delete(code); return had; }

// team 0 looks toward -z, team 1 toward +z: screen "up" means toward the net.
function toWorld(sx, sy, team) { const s = team === 0 ? 1 : -1; return [sx * s, -sy * s]; }

export function readKeyboard(team) {
  const sx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const sy = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  let swing = null;
  for (const k in SWING_KEYS) if (consumePressed(k)) swing = SWING_KEYS[k];
  const move = toWorld(sx, sy, team);
  return { move, swing, aim: move[0] }; // aim: hold left/right while swinging to place the ball
}

export function readGamepad(index, team) {
  const gp = navigator.getGamepads?.()[index];
  if (!gp) return null;
  const dz = v => (Math.abs(v) < 0.18 ? 0 : v);
  const sx = dz(gp.axes[0]), sy = -dz(gp.axes[1]);
  let swing = null;
  const prev = padPrev[index] || [];
  for (const b in PAD_BTN) if (gp.buttons[b]?.pressed && !prev[b]) swing = PAD_BTN[b];
  padPrev[index] = gp.buttons.map(b => b.pressed);
  const move = toWorld(sx, sy, team);
  return { move, swing, aim: move[0] };
}

export const gamepadCount = () => [...(navigator.getGamepads?.() || [])].filter(Boolean).length;

// first local player: 'kb' keyboard only, 'pad' first gamepad only, 'auto' both
export function readLocal(team, mode = 'auto') {
  if (mode === 'pad') return readGamepad(0, team) || { move: [0, 0], swing: null, aim: 0 };
  const kb = readKeyboard(team), pad = mode === 'auto' && readGamepad(0, team);
  if (!pad) return kb;
  const move = kb.move[0] || kb.move[1] ? kb.move : pad.move;
  return { move, swing: kb.swing || pad.swing, aim: move[0] };
}
