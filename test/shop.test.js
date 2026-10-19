import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newProfile, buyItem, equip, bagRoom, normalizeProfile } from '../src/career.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../data/${f}`, import.meta.url)));
const shop = read('shop.json'), chars = read('characters.json'), rackets = read('rackets.json');
const item = (id) => shop.items.find(i => i.id === id) || rackets.find(r => r.id === id);

test('shop gating follows bestTier', () => {
  const p = { ...newProfile(chars[0], {}), credits: 99999, bestTier: 3 };
  assert.equal(buyItem(p, shop.items.find(i => i.tier === 'club'), shop).ok, true);
  assert.equal(buyItem(p, shop.items.find(i => i.tier === 'regional'), shop).reason, 'tier');
});

test('buyItem rejects owned, locked and unaffordable items without changing the profile', () => {
  const p = { ...newProfile(chars[0], {}), credits: 100 };
  const before = structuredClone(p);
  assert.deepEqual(buyItem(p, item('r01'), shop), { ok: false, reason: 'owned' });
  assert.deepEqual(buyItem(p, item('ball_pro_s'), shop), { ok: false, reason: 'tier' });
  assert.deepEqual(buyItem({ ...p, bestTier: 3 }, item('r04'), shop), { ok: false, reason: 'credits' });
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
  const validPatterns = ['none', 'chest', 'sash', 'side', 'stripes', 'split'];
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


test('bag: starter bag, packs fill up to the limit (charged in proportion), Pro bag doubles it', () => {
  const water = item('bag_water'), banana = item('bag_banana'), gel = item('bag_gel'), pro = item('bag_pro');
  let p = { ...newProfile(chars[0], {}), credits: 5000 };
  assert.deepEqual(p.bag, { bag_water: 4, bag_banana: 3 });
  assert.equal(bagRoom(p, water), 4);
  p = buyItem(p, water, shop).profile;  // 6-pack, room for 4: four bottles at 4/6 of the price
  assert.equal(p.bag.bag_water, 8);
  assert.equal(p.credits, 5000 - Math.ceil(water.price * 4 / 6));
  assert.equal(buyItem(p, water, shop).reason, 'bagfull');
  assert.equal(buyItem(p, item('bag_isotonic'), { ...shop, tiers: { ...shop.tiers, club: 1 } }).reason, 'bagfull');  // isotonic is a drink too
  p = buyItem(p, banana, shop).profile;
  assert.equal(p.bag.bag_banana, 8);
  assert.equal(buyItem(p, gel, shop).reason, 'tier');
  p = buyItem({ ...p, bestTier: 5 }, pro, shop).profile;
  assert.ok(p.inventory.includes('bag_pro'));
  assert.equal(bagRoom(p, water), 8);
  assert.equal(buyItem(p, pro, shop).reason, 'owned');
});

test('bag: a profile from before the bag gets the starter bag plus its energy products', () => {
  const old = { ...newProfile(chars[0], {}), supplies: { fuel_banana: 7, fuel_gel: 2 }, equipped: { ...newProfile(chars[0], {}).equipped, fuel: 'fuel_banana' } };
  delete old.bag;
  const p = normalizeProfile(old);
  assert.deepEqual(p.bag, { bag_water: 4, bag_banana: 10, bag_gel: 2 });  // 10 bananas > 8: kept, just no buying more
  assert.equal('supplies' in p, false);
  assert.equal('fuel' in p.equipped, false);
  assert.equal(normalizeProfile(p), p);  // nothing to do: same object
  assert.equal(buyItem({ ...p, credits: 999 }, item('bag_banana'), shop).reason, 'bagfull');
});
