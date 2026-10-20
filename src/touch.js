// Touch controls for phones and tablets (only on touch screens, or with ?touch for testing on a desktop):
// a floating stick where the left thumb lands, shot buttons on the right, pause/camera at the top.
// They feed input.js like a keyboard, so the {move, swing, aim} input stays the same everywhere.
import { setTouchMove } from './input.js';
import { padText } from './padstyle.js';
import { t } from './i18n.js';

export const isTouch = () => (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('touch'));

export function offerKeyLabel({ pid = 0, humans = [0], device = 'kb', control = 'auto', touch = isTouch() } = {}) {
  const h = humans.indexOf(pid);
  const hasPad = (h > 0 || device === 'pad' || control === 'pad');
  return hasPad ? padText('LT') : (touch ? t('tap') : 'E');
}

const TIPS_SEEN = 'padel.touchTipsSeen';
const STICK_R = 56;  // px from the centre to full speed
// shot buttons ring the big SHOT button (bottom right): [key, label, class, radius px, angle° (180 = left, 90 = up)].
// Inner ring = rally shots by height (lob left, víbora diagonal, smash up); outer ring = special shots.
const BUTTONS = [
  ['Space', 'SHOT', 'tc-shot', 0, 0],
  ['KeyK', 'LOB', 'tc-ring', 100, 180], ['KeyI', 'VÍBORA', 'tc-ring', 100, 135], ['KeyL', 'SMASH', 'tc-ring', 100, 90],
  ['KeyU', 'CHIQUITA', 'tc-mini', 172, 172], ['KeyO', 'CONTRA', 'tc-mini', 172, 135], ['KeyF', 'SLICE', 'tc-mini', 172, 98],
];
const SHOT_C = 50;  // px from the box's right/bottom edge to the SHOT button's centre
const TOP = [['KeyC', '🎥', 'Camera'], ['Escape', '⏸', 'Pause'], ['KeyR', '🔁', 'Replay'], ['KeyM', '🔈', 'Sound on / off'], ['KeyB', '📊', 'Scoreboard: auto / hidden / always on']];

export function mountTouch(el) {
  el.innerHTML = `
    <div class="tc-zone"><div class="tc-base" hidden><i class="tc-knob"></i></div></div>
    <div class="tc-btns">${BUTTONS.map(([code, label, cls, r, deg]) => {
      const a = deg * Math.PI / 180, x = SHOT_C - r * Math.cos(a), y = SHOT_C + r * Math.sin(a);
      return `<button type="button" class="tc-btn ${cls}" data-key="${code}" style="right:${x.toFixed(0)}px;bottom:${y.toFixed(0)}px">${t(label)}</button>`;
    }).join('')}</div>
    <div class="tc-top">${TOP.map(([code, icon, name]) => `<button type="button" class="tc-btn tc-small" data-key="${code}" aria-label="${t(name)}">${icon}</button>`).join('')}<button type="button" class="tc-btn tc-small tc-q" aria-label="${t('How to play')}">❔</button></div>
    <div class="tc-tips" hidden>
      <div class="tc-tip tt-move">${t('👆 Put your thumb down anywhere here<br>and drag to run')}</div>
      <div class="tc-tip tt-btns">${t('SHOT: smart shot · serve<br>stick left / right while tapping = aim<br>inner ring: LOB · VÍBORA · SMASH<br>outer ring: CHIQUITA · CONTRA (off your glass) · SLICE serve')}</div>
      <div class="tc-tip tt-top">${t('camera · pause · replay · sound · scoreboard · these tips')}</div>
      <button type="button" class="tc-tip tt-ok">${t('Got it ✓')}</button>
    </div>`;
  const zone = el.querySelector('.tc-zone'), base = el.querySelector('.tc-base'), knob = el.querySelector('.tc-knob');
  let id = null, cx = 0, cy = 0;
  const move = (e) => {
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    setTouchMove(dx / STICK_R, -dy / STICK_R);  // screen up = stick up
  };
  zone.addEventListener('pointerdown', (e) => {
    if (id !== null) return;
    id = e.pointerId; cx = e.clientX; cy = e.clientY;
    try { zone.setPointerCapture(id); } catch { /* synthetic or already lifted pointer */ }
    base.style.left = `${cx}px`; base.style.top = `${cy}px`; base.hidden = false;
    move(e);
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  const end = (e) => { if (e.pointerId !== id) return; id = null; base.hidden = true; setTouchMove(0, 0); };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
  // the tips go away on 'Got it', on the first use of the stick or a button (it is learned), or after 10 s
  const tips = el.querySelector('.tc-tips');
  const seen = () => {
    tips.hidden = true; clearTimeout(tipsTimer);
    try { localStorage.setItem(TIPS_SEEN, '1'); } catch { /* storage blocked: tips come back next match */ }
  };
  el.querySelector('.tc-q').addEventListener('pointerdown', (e) => { e.preventDefault(); tips.hidden = !tips.hidden; armTips(); });
  el.querySelector('.tt-ok').addEventListener('pointerdown', (e) => { e.preventDefault(); seen(); });
  el.addEventListener('pointerdown', (e) => { if (!tips.hidden && !e.target.closest('.tc-q, .tc-tips')) seen(); }, true);
  for (const b of el.querySelectorAll('[data-key]')) {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();  // a button is a key press: input.js queues it, and a tap skips a replay like a key does
      window.dispatchEvent(new KeyboardEvent('keydown', { code: b.dataset.key }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: b.dataset.key }));
    });
  }
}

// the touch tips show at a match start on a touch screen until they are seen; ❔ brings them back
let tipsTimer = 0;
function armTips() {
  clearTimeout(tipsTimer);
  const tips = document.querySelector('#touchUi .tc-tips');
  if (tips && !tips.hidden) tipsTimer = setTimeout(() => { tips.hidden = true; }, 10000);
}
export function showTouchTips(el) {
  try { if (localStorage.getItem(TIPS_SEEN)) return; } catch { /* storage blocked: show them */ }
  el.querySelector('.tc-tips').hidden = false;
  armTips();
}
