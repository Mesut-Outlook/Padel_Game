// Local input: keyboard = first human, each gamepad = next human. Output matches game.stepWorld input shape.
const keys = new Set();
const pressed = new Set();
addEventListener('keydown', e => { if (!keys.has(e.code)) pressed.add(e.code); keys.add(e.code); });
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

const SWING_KEYS = { Space: 'auto', KeyJ: 'auto', KeyK: 'lob', KeyL: 'smash', KeyU: 'chiquita', KeyI: 'vibora' };
const PAD_BTN = { 0: 'auto', 1: 'lob', 3: 'smash', 2: 'chiquita', 5: 'vibora' };
const padPrev = {};

export function consumePressed(code) { const had = pressed.has(code); pressed.delete(code); return had; }

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
