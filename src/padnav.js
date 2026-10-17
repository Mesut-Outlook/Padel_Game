// Controller navigation for DOM menus: D-pad / left stick direction and spatial focus moves.

// [-1|0|1, -1|0|1]; the D-pad wins, the stick needs a firm push (a resting stick drifts a few hundredths)
export function padDir(pad) {
  const b = (i) => !!pad.buttons[i]?.pressed, dz = (v) => (Math.abs(v || 0) > 0.6 ? Math.sign(v) : 0);
  const x = b(15) ? 1 : b(14) ? -1 : dz(pad.axes[0]);
  const y = b(13) ? 1 : b(12) ? -1 : dz(pad.axes[1]);
  return [x, y];
}

const FOCUSABLE = 'button, input:not([type="file"]):not([type="hidden"]), select';

// Focus the nearest visible control in direction (dx, dy) inside root, by on-screen position, so rows of
// different widths, footers and tab bars are all reachable. Returns the focused element (or null).
export function spatialFocus(root, dx, dy) {
  const els = [...root.querySelectorAll(FOCUSABLE)].filter(e => e.offsetParent != null && !e.disabled);
  if (!els.length) return null;
  const cur = document.activeElement;
  if (!els.includes(cur)) return show(els[0]);
  const r = cur.getBoundingClientRect();
  let best = null, bestScore = Infinity;
  for (const e of els) {
    if (e === cur) continue;
    const q = e.getBoundingClientRect();
    // distance past the current edge in the move direction; overlap across the move axis costs nothing
    const gap = dx > 0 ? q.left - r.right : dx < 0 ? r.left - q.right : dy > 0 ? q.top - r.bottom : r.top - q.bottom;
    if (gap < -4) continue;
    const across = dx ? Math.max(0, q.top - r.bottom, r.top - q.bottom) : Math.max(0, q.left - r.right, r.left - q.right);
    const centre = dx ? Math.abs((q.top + q.bottom - r.top - r.bottom) / 2) : Math.abs((q.left + q.right - r.left - r.right) / 2);
    const score = Math.max(0, gap) + across * 3 + centre * 0.1;
    if (score < bestScore) { bestScore = score; best = e; }
  }
  return best ? show(best) : null;
}

function show(el) {
  el.focus({ focusVisible: true, preventScroll: true });  // focusVisible: draw the ring even after mouse use
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  return el;
}
