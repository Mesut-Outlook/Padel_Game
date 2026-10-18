import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newProfile, tierOf, buyItem, equip } from '../src/career.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../data/${f}`, import.meta.url)));
const shop = read('shop.json'), chars = read('characters.json'), rackets = read('rackets.json');
const item = (id) => shop.items.find(i => i.id === id) || rackets.find(r => r.id === id);

test('tier thresholds from ranking points', () => {
  assert.equal(tierOf(0, shop), 'amateur');
  assert.equal(tierOf(59, shop), 'club');
  assert.equal(tierOf(60, shop), 'regional');
  assert.equal(tierOf(99999, shop), 'elite');
});

test('buyItem rejects owned, locked and unaffordable items without changing the profile', () => {
  const p = { ...newProfile(chars[0], {}), credits: 100 };
  const before = structuredClone(p);
  assert.deepEqual(buyItem(p, item('r01'), shop), { ok: false, reason: 'owned' });
  assert.deepEqual(buyItem(p, item('ball_pro_s'), shop), { ok: false, reason: 'tier' });
  assert.deepEqual(buyItem({ ...p, rankingPoints: 10 }, item('r04'), shop), { ok: false, reason: 'credits' });
  assert.deepEqual(p, before);
});

test('buyItem success deducts the price and adds the item; equip only takes owned items', () => {
  const p = { ...newProfile(chars[0], {}), credits: 1000 }, shoe = shop.items.find(i => i.type === 'shoes' && i.tier === 'amateur' && i.price > 0);
  const r = buyItem(p, shoe, shop);
  assert.equal(r.ok, true);
  assert.equal(r.profile.credits, 1000 - shoe.price);
  assert.ok(r.profile.inventory.includes(shoe.id));
  assert.equal(equip(r.profile, 'shoes', shoe.id).equipped.shoes, shoe.id);
  assert.equal(equip(p, 'shoes', shoe.id).equipped.shoes, 'shoe_starter');
});

test('every shop item and racket has a known tier and a non-negative price; starters are free', () => {
  for (const i of [...shop.items, ...rackets]) {
    assert.ok(i.tier in shop.tiers, i.id);
    assert.ok(i.price >= 0, i.id);
  }
  for (const id of ['r01', 'shoe_starter', 'kit_starter', 'ball_standard']) assert.equal(item(id).price, 0, id);
});

test('every kit and roster character has allowed style and pattern', () => {
  const validStyles = ['crew', 'polo', 'vneck', 'tank'];
  const validPatterns = ['none', 'chest', 'sash', 'side'];
  const COLOR = /^#[0-9a-f]{6}$/i;

  const kits = shop.items.filter(i => i.type === 'kit');
  assert.ok(kits.length >= 13, `expected >= 13 kits, got ${kits.length}`);
  for (const k of kits) {
    if (k.style != null) assert.ok(validStyles.includes(k.style), `kit ${k.id} style ${k.style}`);
    if (k.pattern != null) assert.ok(validPatterns.includes(k.pattern), `kit ${k.id} pattern ${k.pattern}`);
    if (k.accent != null) assert.ok(COLOR.test(k.accent), `kit ${k.id} accent ${k.accent}`);
  }

  for (const c of chars) {
    if (c.outfit?.style != null) assert.ok(validStyles.includes(c.outfit.style), `char ${c.id} style ${c.outfit.style}`);
    if (c.outfit?.pattern != null) assert.ok(validPatterns.includes(c.outfit.pattern), `char ${c.id} pattern ${c.outfit.pattern}`);
    if (c.outfit?.accent != null) assert.ok(COLOR.test(c.outfit.accent), `char ${c.id} accent ${c.outfit.accent}`);
  }
});

