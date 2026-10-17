// Xbox and PlayStation pads share the browser's "standard" button layout; only the printed labels differ.
const PS = { A: '✕', B: '○', X: '□', Y: '△', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', View: 'Share', Start: 'Options' };

// 054c = Sony's USB vendor id (a DualShock 4 reports itself as a plain 'Wireless Controller', like Xbox pads do)
export const isPlayStation = (id = '') => /054c|sony|playstation|dualshock|dualsense/i.test(id);

// 'ps' when the first connected pad is a DualShock / DualSense, else 'xbox'
export function padKind() {
  const gp = [...(navigator.getGamepads?.() || [])].find(Boolean);
  return gp && isPlayStation(gp.id) ? 'ps' : 'xbox';
}

// one button name ('A', 'RB', 'Start'…) or a short label made of them ('Start → menu') in the pad's own glyphs
export const padText = (text, kind = padKind()) =>
  kind === 'ps' ? String(text).replace(/\b(LB|RB|LT|RT|View|Start|[ABXY])\b/g, (m) => PS[m]) : text;
