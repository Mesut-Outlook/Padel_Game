// HOME hero "Pick your legend": a coloured lane per active player; in portrait the lanes are swipe cards.
// Pictures: public/assets/home/<id>-{open,closed}.webp, drawn by tools/herorender.html (redo them when a player's look changes).
import { activeIndices } from './roster.js';

// lane colour and name ink (dark on the bright lanes), in the order they stand on screen
const LANES = {
  p27: ['#ff1f8f', '#fff'], p31: ['#ff6b00', '#16052f'], p25: ['#00b8f5', '#16052f'],
  p35: ['#f5204b', '#fff'], p26: ['#8a2bff', '#fff'], p37: ['#1f4dff', '#fff'],
  p36: ['#00c986', '#16052f'], p28: ['#d21cff', '#fff'], p34: ['#00c9c9', '#16052f'],
};
const ORDER = Object.keys(LANES);

function countryName(ch, lang) {
  try { return new Intl.DisplayNames([lang], { type: 'region' }).of(ch.countryCode) || ch.country; } catch { return ch.country; }
}

export function heroHtml(list, picked, lang = 'en') {
  const shown = activeIndices(list).filter(i => LANES[list[i].id]).sort((a, b) => ORDER.indexOf(list[a].id) - ORDER.indexOf(list[b].id));
  const on = shown.includes(picked) ? picked : shown[Math.floor(shown.length / 2)];
  return `<div class="hm-lanes">${shown.map(i => {
    const c = list[i], [bg, ink] = LANES[c.id];
    return `<button type="button" class="hm-lane${i === on ? ' is-on' : ''}" data-idx="${i}" aria-pressed="${i === on}" style="--lane:${bg};--ink:${ink}">
      <img class="hm-shut" src="assets/home/${c.id}-closed.webp" alt="" loading="lazy" draggable="false">
      <img class="hm-open" src="assets/home/${c.id}-open.webp" alt="" draggable="false">
      <span class="hm-who"><b lang="en">${c.name}</b><i>${countryName(c, lang)}</i></span></button>`;
  }).join('')}</div>`;
}

export function centredIndex(middle, centres) {
  return centres.reduce((best, c, i) => (Math.abs(c - middle) < Math.abs(centres[best] - middle) ? i : best), 0);
}

const SETTLE_MS = 110;
const midOf = (el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };

// Only the visitor's own swipe picks by scrolling: hiding HOME, rotating and focus moves scroll the box too.
export function wireHero(root, { picked, onPick, media = globalThis.matchMedia?.('(orientation: portrait)') } = {}) {
  const box = root.querySelector('.hm-lanes'), lanes = [...root.querySelectorAll('.hm-lane')];
  let cur = picked, swiped = false, timer = null;

  function pick(lane) {
    const idx = Number(lane.dataset.idx);
    if (idx === cur) return;
    cur = idx;
    for (const l of lanes) {
      l.classList.toggle('is-on', l === lane);
      l.setAttribute('aria-pressed', String(l === lane));
    }
    onPick?.(idx);
  }
  const cards = () => !!media?.matches && box.clientWidth > 0;
  function centre(lane, behavior) {
    if (lane && cards()) box.scrollTo({ left: box.scrollLeft + midOf(lane) - midOf(box), behavior });
  }
  function settle() {
    clearTimeout(timer);
    if (swiped && cards()) pick(lanes[centredIndex(midOf(box), lanes.map(midOf))]);
  }

  for (const lane of lanes) {
    lane.onclick = () => {
      swiped = false;
      clearTimeout(timer);
      pick(lane);
      centre(lane, globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth');
    };
  }
  const own = () => { swiped = true; };
  box?.addEventListener('pointerdown', own, { passive: true });
  box?.addEventListener('wheel', own, { passive: true });
  box?.addEventListener('scroll', () => {
    if (!swiped || !cards()) return;
    clearTimeout(timer);
    timer = setTimeout(settle, SETTLE_MS);
  }, { passive: true });

  return {
    flush() { settle(); swiped = false; },
    // left / right between lanes by order: their skewed boxes overlap, so spatialFocus skips the neighbour
    step(from, dx) {
      const i = lanes.indexOf(from);
      if (i < 0 || !dx) return false;
      const to = lanes[Math.max(0, Math.min(lanes.length - 1, i + dx))];
      to.focus({ focusVisible: true, preventScroll: true });
      to.scrollIntoView({ block: 'nearest', inline: cards() ? 'center' : 'nearest' });
      return true;
    },
    recentre() {
      swiped = false;
      clearTimeout(timer);
      centre(lanes.find(l => Number(l.dataset.idx) === cur), 'instant');
    },
    dispose() { clearTimeout(timer); swiped = false; },
  };
}
