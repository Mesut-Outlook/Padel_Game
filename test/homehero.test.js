import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { heroHtml, centredIndex, wireHero } from '../src/homehero.js';

const chars = JSON.parse(fs.readFileSync(new URL('../data/characters.json', import.meta.url)));
const pressed = (html) => [...html.matchAll(/data-idx="(\d+)" aria-pressed="true"/g)].map(m => +m[1]);

test('nine lanes, only the picked one open', () => {
  const html = heroHtml(chars, 15, 'en');
  assert.equal(html.match(/data-idx="/g).length, 9);
  assert.deepEqual(pressed(html), [15]);
});

test('an archived or missing pick still opens one active lane', () => {
  for (const bad of [0, 999, NaN, undefined]) {
    const open = pressed(heroHtml(chars, bad, 'en'));
    assert.equal(open.length, 1);
    assert.ok(!chars[open[0]].archived);
  }
});

test('country names follow the language, an unknown language does not throw', () => {
  assert.match(heroHtml(chars, 15, 'tr'), /İspanya/);
  assert.match(heroHtml(chars, 15, 'de'), /Spanien/);
  assert.doesNotThrow(() => heroHtml(chars, 15, '!!'));
});

test('every lane has both of its pictures on disk, 320 KB at most in total', () => {
  const files = [...heroHtml(chars, 15, 'en').matchAll(/src="(assets\/home\/[^"]+)"/g)].map(m => m[1]);
  assert.equal(files.length, 18);
  const bytes = files.reduce((n, f) => n + fs.statSync(new URL(`../public/${f}`, import.meta.url)).size, 0);
  assert.ok(bytes <= 320 * 1024, String(bytes));
});

test('centredIndex: the card nearest the middle', () => {
  assert.equal(centredIndex(195, [-120, 190, 500]), 1);
  assert.equal(centredIndex(195, [190]), 0);
});

// three cards of 300 px in a 390 px box; card n is centred at scrollLeft n * 300
function stage({ portrait = true } = {}) {
  const box = {
    scrollLeft: 300, clientWidth: 390, on: {},
    addEventListener(k, fn) { this.on[k] = fn; },
    getBoundingClientRect() { return { left: 0, width: this.clientWidth }; },
    scrollTo({ left }) { this.scrollLeft = left; },
  };
  const lanes = [27, 31, 14].map((idx, n) => ({
    dataset: { idx: String(idx) }, pressed: null,
    classList: { toggle() {} },
    setAttribute(k, v) { this.pressed = v; },
    getBoundingClientRect: () => ({ left: 45 + n * 300 - box.scrollLeft, width: 300 }),
  }));
  const picks = [];
  const root = { querySelector: () => box, querySelectorAll: () => lanes };
  const hero = wireHero(root, { picked: 31, onPick: (i) => picks.push(i), media: { matches: portrait } });
  return { box, lanes, hero, picks };
}

test('flush picks the card that is centred while the swipe still glides', () => {
  const { box, hero, picks } = stage();
  box.on.pointerdown();
  box.scrollLeft = 590;
  box.on.scroll();
  hero.flush();
  assert.deepEqual(picks, [14]);
});

test('a scroll while HOME is hidden never picks', () => {
  const { box, hero, picks } = stage();
  box.on.pointerdown();
  box.clientWidth = 0;
  box.scrollLeft = 0;
  box.on.scroll();
  hero.flush();
  assert.deepEqual(picks, []);
});

test('re-centring (rotation, showing HOME) and a scroll nobody made never pick', () => {
  const { box, hero, picks } = stage();
  box.on.pointerdown();
  hero.recentre();
  box.scrollLeft = 0;
  box.on.scroll();
  hero.flush();
  assert.deepEqual(picks, []);
});

test('left / right step to the next lane (skewed boxes overlap, spatialFocus would skip it) and stay at the ends', () => {
  const { lanes, hero, picks } = stage({ portrait: false });
  const focused = [];
  lanes.forEach((l, n) => { l.focus = () => focused.push(n); l.scrollIntoView = () => {}; });
  assert.equal(hero.step(lanes[0], 1), true);
  assert.equal(hero.step(lanes[1], 1), true);
  assert.equal(hero.step(lanes[2], 1), true);
  assert.equal(hero.step(lanes[2], -1), true);
  assert.deepEqual(focused, [1, 2, 2, 1]);
  assert.equal(hero.step({}, 1), false);
  assert.equal(hero.step(lanes[0], 0), false);
  assert.deepEqual(picks, []);
});

test('a tap picks and centres; lanes in landscape pick without scrolling', () => {
  const a = stage();
  a.lanes[0].onclick();
  assert.deepEqual(a.picks, [27]);
  assert.equal(a.box.scrollLeft, 0);
  assert.equal(a.lanes[0].pressed, 'true');
  const b = stage({ portrait: false });
  b.lanes[2].onclick();
  assert.deepEqual(b.picks, [14]);
  assert.equal(b.box.scrollLeft, 300);
});
