// In-game key help: a small colour-coded keyboard (same colours as public/kontroller.html) in a screen corner.
// H or a click toggles it, the corner arrows or Shift+H move it; both choices are remembered. Pressed keys light up.
// Mirrors the bindings in input.js / main.js — keep in sync with public/kontroller.html.
const K = {
  KeyW: ['W', 'move', 'ileri'], KeyA: ['A', 'move', 'sol'], KeyS: ['S', 'move', 'geri'], KeyD: ['D', 'move', 'sağ'],
  ArrowUp: ['↑', 'move'], ArrowDown: ['↓', 'move'], ArrowLeft: ['←', 'move'], ArrowRight: ['→', 'move'],
  Space: ['Space', 'hit', 'vuruş · servis'], KeyJ: ['J', 'hit', 'vuruş'],
  KeyK: ['K', 'shot', 'lob'], KeyL: ['L', 'shot', 'smaç'], KeyU: ['U', 'shot', 'chiq.'], KeyI: ['I', 'shot', 'víbora'],
  KeyO: ['O', 'shot', 'contra'], KeyF: ['F', 'shot', 'slice'],
  KeyC: ['C', 'sys', 'kamera'], KeyR: ['R', 'sys', 'tekrar'], KeyM: ['M', 'sys', 'ses'], KeyH: ['H', 'sys', 'gizle'],
  Escape: ['Esc', 'sys', 'geç'], Enter: ['Enter', 'sys', 'menü'],
};
const ROWS = [
  ['Escape'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Enter'],
  ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM'],
  ['Space'],
];
const STORE = 'padel.helpHidden', POS_STORE = 'padel.helpPos';
const CORNERS = { bl: ['↙', 'sol alt'], tl: ['↖', 'sol üst'], tr: ['↗', 'sağ üst'], br: ['↘', 'sağ alt'] };

export function mountKeyHelp(el) {
  const caps = {};
  const cap = (code, cls = '') => {
    const d = K[code];
    caps[code] = `<div class="hk ${d ? d[1] : ''} ${cls}" data-code="${code}">${d ? d[0] : code.replace('Key', '')}${d?.[2] ? `<small>${d[2]}</small>` : ''}</div>`;
    return caps[code];
  };
  el.innerHTML = `
    <div class="hk-pill" title="Tuşları göster (H)">⌨ Tuşlar <b>H</b></div>
    <div class="hk-board">
      <div class="hk-head"><span>Tuşlar</span><span class="hk-pos">${Object.entries(CORNERS).map(([p, [a, t]]) => `<i data-pos="${p}" title="${t} (Shift+H)">${a}</i>`).join('')}<span class="hk-x" title="Gizle (H)">✕</span></span></div>
      <div class="hk-main">
        <div class="hk-rows">${ROWS.map((r, i) => `<div class="hk-row" style="padding-left:${[0, 0, 8, 18, 56][i]}px">${r.map(c => cap(c, c === 'Space' ? 'hk-space' : c === 'Enter' || c === 'Escape' ? 'hk-wide' : '')).join('')}</div>`).join('')}</div>
        <div class="hk-arrows">${cap('ArrowUp', 'up')}${cap('ArrowLeft', 'lf')}${cap('ArrowDown', 'dn')}${cap('ArrowRight', 'rt')}</div>
      </div>
      <div class="hk-foot">Vururken <b>A</b>/<b>D</b> = yön · Xbox: A vuruş · B lob · X chiq. · Y smaç · RB víbora · LB slice · RT contra · <a href="kontroller.html" target="_blank" rel="noopener">tümü →</a></div>
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
  const keyEl = (code) => el.querySelector(`[data-code="${code}"]`);
  addEventListener('keydown', (e) => {
    if (e.code === 'KeyH' && !e.repeat && !el.hidden) {
      if (e.shiftKey) { const k = Object.keys(CORNERS); place(k[(k.indexOf(pos) + 1) % k.length]); if (hidden) toggle(); }
      else toggle();
    }
    keyEl(e.code)?.classList.add('on');
  });
  addEventListener('keyup', (e) => keyEl(e.code)?.classList.remove('on'));
}
