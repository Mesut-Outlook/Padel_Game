// In-game control help: a small colour-coded keyboard or Xbox controller (same colours as public/kontroller.html)
// in a screen corner. It shows whichever device was used last (or the ⌨/🎮 tab). H, D-pad ↑ or a click toggles it,
// the corner arrows or Shift+H move it; both choices are remembered. Pressed keys and buttons light up.
// Mirrors the bindings in input.js / main.js — keep in sync with public/kontroller.html.
const K = {
  KeyW: ['W', 'move', 'fwd'], KeyA: ['A', 'move', 'left'], KeyS: ['S', 'move', 'back'], KeyD: ['D', 'move', 'right'],
  ArrowUp: ['↑', 'move'], ArrowDown: ['↓', 'move'], ArrowLeft: ['←', 'move'], ArrowRight: ['→', 'move'],
  Space: ['Space', 'hit', 'shot · serve'], KeyJ: ['J', 'hit', 'shot'],
  KeyK: ['K', 'shot', 'lob'], KeyL: ['L', 'shot', 'smash'], KeyU: ['U', 'shot', 'chiq.'], KeyI: ['I', 'shot', 'víbora'],
  KeyO: ['O', 'shot', 'contra'], KeyF: ['F', 'shot', 'slice'],
  KeyE: ['E', 'sys', 'eat'], KeyC: ['C', 'sys', 'cam'], KeyR: ['R', 'sys', 'replay'], KeyM: ['M', 'sys', 'sound'], KeyH: ['H', 'sys', 'hide'],
  Escape: ['Esc', 'sys', 'pause'], Enter: ['Enter', 'sys', 'menu'],
};
const ROWS = [
  ['Escape'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Enter'],
  ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM'],
  ['Space'],
];
// Xbox buttons (standard gamepad indices): drawing [shape, x, y, label] + legend text, coloured like the keyboard
// groups except A/B/X/Y, which keep their real Xbox colours so they are found at a glance
import { padText, isPlayStation } from './padstyle.js';

const PAD = [
  [6, 'sys', 'LT', 44, 2, 'eat (food offer)'], [7, 'shot', 'RT', 168, 2, 'contrapared'],
  [4, 'shot', 'LB', 38, 15, 'slice serve'], [5, 'shot', 'RB', 158, 15, 'víbora'],
  [0, 'xa', 'A', 176, 76, 'shot · serve'], [1, 'xb', 'B', 190, 62, 'lob'], [2, 'xx', 'X', 162, 62, 'chiquita'], [3, 'xy', 'Y', 176, 48, 'smash'],
  [8, 'sys', '', 104, 58, 'camera (View)'], [9, 'sys', '', 136, 58, 'pause (Start)'], [11, 'sys', 'R3', 148, 92, 'replay (press R stick)'],
  [12, 'sys', '', 92, 83, 'hide this help (D-pad ↑)'],
];
const PAD_BODY = 'M60 30C80 22 160 22 180 30C205 34 222 50 228 80C236 118 230 142 210 144C192 146 182 126 170 112C160 104 80 104 70 112C58 126 48 146 30 144C10 142 4 118 12 80C18 50 35 34 60 30Z';
export function padSvg(kind) {
  const btn = ([b, c, t, x, y]) => b === 6 || b === 7 ? `<g data-b="${b}" class="${c}"><rect x="${x}" y="${y}" width="28" height="11" rx="5"/><text x="${x + 14}" y="${y + 8.5}">${padText(t, kind)}</text></g>`
    : b === 4 || b === 5 ? `<g data-b="${b}" class="${c}"><rect x="${x}" y="${y}" width="44" height="11" rx="5"/><text x="${x + 22}" y="${y + 8.5}">${padText(t, kind)}</text></g>`
    : b === 11 ? `<g data-b="11" class="${c}"><circle cx="${x}" cy="${y}" r="11"/><circle class="dot" data-stick="2" cx="${x}" cy="${y}" r="6"/></g>`
    : b === 12 ? ''
    : `<g data-b="${b}" class="${c}"><circle cx="${x}" cy="${y}" r="${t ? 7 : 5}"/>${t ? `<text x="${x}" y="${y + 3}">${padText(t, kind)}</text>` : ''}</g>`;
  const dpad = [[12, 88, 79], [13, 88, 97], [14, 79, 88], [15, 97, 88]].map(([b, x, y]) => `<rect data-b="${b}" class="${b === 12 ? 'sys' : 'off'}" x="${x}" y="${y}" width="9" height="9" rx="1.5"/>`).join('');
  return `<svg class="hp-svg" viewBox="0 0 240 150" width="230" height="144">
    <path class="body" d="${PAD_BODY}"/><circle class="off" cx="120" cy="42" r="7"/>
    <g data-b="10" class="move"><circle cx="64" cy="62" r="13"/><circle class="dot" data-stick="0" cx="64" cy="62" r="7"/></g>
    ${dpad}${PAD.map(btn).join('')}</svg>`;
}
export const padLegend = (kind) => `<div class="hp-legend">
    <div class="pk" data-b="10"><b class="move">L</b>move · tilt while hitting = aim</div>
    ${PAD.filter(p => p[5]).map(([b, c, t, , , txt]) => `<div class="pk" data-b="${b}"><b class="${c}">${t ? padText(t, kind) : { 8: '⧉', 9: '≡', 12: '↑' }[b]}</b>${padText(txt, kind)}</div>`).join('')}
  </div>`;

const STORE = 'padel.helpHidden', POS_STORE = 'padel.helpPos';
const CORNERS = { bl: ['↙', 'bottom-left'], tl: ['↖', 'top-left'], tr: ['↗', 'top-right'], br: ['↘', 'bottom-right'] };

export function mountKeyHelp(el) {
  const caps = {};
  const cap = (code, cls = '') => {
    const d = K[code];
    caps[code] = `<div class="hk ${d ? d[1] : ''} ${cls}" data-code="${code}">${d ? d[0] : code.replace('Key', '')}${d?.[2] ? `<small>${d[2]}</small>` : ''}</div>`;
    return caps[code];
  };
  el.innerHTML = `
    <div class="hk-pill" title="Show controls (H / D-pad ↑)"><span class="kb-only">⌨ Keys <b>H</b></span><span class="pad-only">🎮 Buttons <b>↑</b></span></div>
    <div class="hk-board">
      <div class="hk-head"><span>Controls <span class="hk-dev"><i data-dev="kb" title="Keyboard">⌨</i><i data-dev="pad" title="Controller (Xbox / PlayStation)">🎮</i></span></span><span class="hk-pos">${Object.entries(CORNERS).map(([p, [a, t]]) => `<i data-pos="${p}" title="${t} (Shift+H)">${a}</i>`).join('')}<span class="hk-x" title="Hide (H)">✕</span></span></div>
      <div class="hk-main kb-only">
        <div class="hk-rows">${ROWS.map((r, i) => `<div class="hk-row" style="padding-left:${[0, 0, 8, 18, 56][i]}px">${r.map(c => cap(c, c === 'Space' ? 'hk-space' : c === 'Enter' || c === 'Escape' ? 'hk-wide' : '')).join('')}</div>`).join('')}</div>
        <div class="hk-arrows">${cap('ArrowUp', 'up')}${cap('ArrowLeft', 'lf')}${cap('ArrowDown', 'dn')}${cap('ArrowRight', 'rt')}</div>
      </div>
      <div class="hk-main pad-only">${padSvg('xbox')}${padLegend('xbox')}</div>
      <div class="hk-foot"><span class="kb-only">Hold <b>A</b>/<b>D</b> or <b>←</b>/<b>→</b> while hitting = aim · <b>Esc</b>: pause · ⛶ / <b>F11</b>: fullscreen · </span><span class="pad-only">Phone or tablet: pair an Xbox or PlayStation controller over Bluetooth, then press any button · 2 players: keyboard + a pad, or a pad each · </span><a href="kontroller.html" target="_blank" rel="noopener">all controls →</a></div>
    </div>`;
  let hidden = false, pos = 'bl';
  try { hidden = localStorage.getItem(STORE) === '1'; pos = localStorage.getItem(POS_STORE) || 'bl'; } catch { /* storage blocked: defaults */ }
  const place = (p) => {
    pos = CORNERS[p] ? p : 'bl'; el.dataset.pos = pos;
    el.querySelectorAll('.hk-pos i').forEach(i => i.classList.toggle('cur', i.dataset.pos === pos));
    try { localStorage.setItem(POS_STORE, pos); } catch { /* not kept */ }
  };
  el.querySelectorAll('.hk-pos i').forEach(i => { i.onclick = () => place(i.dataset.pos); });
  place(pos);
  const apply = () => { el.classList.toggle('collapsed', hidden); try { localStorage.setItem(STORE, hidden ? '1' : '0'); } catch { /* not kept */ } };
  const toggle = () => { hidden = !hidden; apply(); };
  el.querySelector('.hk-pill').onclick = toggle;
  el.querySelector('.hk-x').onclick = toggle;
  apply();
  // device: the board follows the last used input; the ⌨/🎮 tabs pick one by hand until the other is used
  let dev = '';
  const setDev = (d) => {
    if (d === dev) return; dev = d; el.dataset.dev = d;
    el.querySelectorAll('.hk-dev i').forEach(i => i.classList.toggle('cur', i.dataset.dev === d));
  };
  el.querySelectorAll('.hk-dev i').forEach(i => { i.onclick = () => setDev(i.dataset.dev); });
  setDev(navigator.getGamepads?.().some(Boolean) ? 'pad' : 'kb');
  let padEls = [...el.querySelectorAll('.pad-only [data-b]')], dots = [...el.querySelectorAll('[data-stick]')], kindNow = 'xbox';
  const relabel = (kind) => {  // a DualShock / DualSense shows ✕ ○ □ △, L1/R1, Options
    kindNow = kind; el.dataset.pad = kind;
    el.querySelector('.hk-main.pad-only').innerHTML = padSvg(kind) + padLegend(kind);
    padEls = [...el.querySelectorAll('.pad-only [data-b]')]; dots = [...el.querySelectorAll('[data-stick]')];
  };
  let upWas = false, lastId = '';
  const pollPad = () => {
    requestAnimationFrame(pollPad);
    if (el.hidden) return;
    // the pad in use: with two pads each player sees their own pad's labels (Xbox A/B or PlayStation ✕/○)
    const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
    const busy = (p) => p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > 0.5);
    const gp = pads.find(busy) || pads.find(p => p.id === lastId) || pads[0];
    if (!gp) return;
    lastId = gp.id;
    const kind = isPlayStation(gp.id) ? 'ps' : 'xbox';
    if (kind !== kindNow) relabel(kind);
    if (gp.buttons.some(b => b.pressed) || gp.axes.some(a => Math.abs(a) > 0.5)) setDev('pad');
    const up = !!gp.buttons[12]?.pressed;
    if (up && !upWas && document.getElementById('pause')?.hidden !== false) toggle();  // D-pad ↑ navigates the pause menu instead
    upWas = up;
    if (hidden || dev !== 'pad') return;
    for (const b of padEls) b.classList.toggle('on', !!gp.buttons[b.dataset.b]?.pressed);
    for (const d of dots) {
      const i = +d.dataset.stick, x = gp.axes[i] || 0, y = gp.axes[i + 1] || 0;
      d.setAttribute('transform', `translate(${(x * 5).toFixed(1)} ${(y * 5).toFixed(1)})`);
      d.parentNode.classList.toggle('on', Math.hypot(x, y) > 0.3 || !!gp.buttons[i ? 11 : 10]?.pressed);
    }
  };
  requestAnimationFrame(pollPad);
  const keyEl = (code) => el.querySelector(`[data-code="${code}"]`);
  addEventListener('keydown', (e) => {
    setDev('kb');
    if (e.code === 'KeyH' && !e.repeat && !el.hidden) {
      if (e.shiftKey) { const k = Object.keys(CORNERS); place(k[(k.indexOf(pos) + 1) % k.length]); if (hidden) toggle(); }
      else toggle();
    }
    keyEl(e.code)?.classList.add('on');
  });
  addEventListener('keyup', (e) => keyEl(e.code)?.classList.remove('on'));
}
