import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const chars = JSON.parse(fs.readFileSync(new URL('../data/characters.json', import.meta.url)));
const ACTIVE = ['p26', 'p27', 'p25', 'p28', 'p31', 'p34', 'p35', 'p36', 'p37'];

test('nine active players from nine countries, the rest archived and still in the file', () => {
  const active = chars.filter(c => !c.archived);
  assert.deepEqual(active.map(c => c.id).sort(), [...ACTIVE].sort());
  assert.equal(new Set(active.map(c => c.countryCode)).size, 9);
  assert.equal(chars.length, 37);
  assert.deepEqual(chars.slice(33).map(c => c.id), ['p34', 'p35', 'p36', 'p37']);  // appended, nothing moved
  assert.equal(chars.map(c => c.id).slice(0, 33).join(), 'p01,p02,p03,p04,p05,p07,p06,p08,p09,p10,p33,p11,p12,p18,p25,p26,p14,p13,p15,p16,p17,p20,p19,p22,p23,p21,p24,p27,p28,p29,p30,p31,p32');  // existing indices stay put (online seats send indices)
});

test('new players have the same fields as the old ones, and every active player has a stance', () => {
  const keys = (c) => Object.keys(c).filter(k => !['archived', 'stance', 'ranked', 'beard', 'beardColor', 'hairOpacity', 'ponytail', 'topknot', 'makeup', 'glasses', 'headwear'].includes(k)).sort();
  const mesut = chars.find(c => c.id === 'p26');
  for (const c of chars.slice(33)) assert.deepEqual(keys(c), keys(mesut), c.id);
  const active = chars.filter(c => !c.archived);
  assert.equal(active.filter(c => c.stance?.yaw === 0).length, 6);
  assert.equal(active.filter(c => c.stance?.yaw > 0).length, 3);
});

import { isActive, activeIndices, resolvePick, STANCE_CLIPS, aiSeatChar } from '../src/roster.js';
import { pairUp } from '../src/tournament.js';
import { aiRankingTable } from '../src/career.js';

test('a saved pick of an archived player falls back to one of the nine', () => {
  const act = activeIndices(chars);
  assert.equal(act.length, 9);
  assert.equal(resolvePick(15, chars), 15);                 // Mesut (index 15) stays
  assert.ok(act.includes(resolvePick(0, chars, () => 0.5))); // Ahmet is archived
  assert.ok(act.includes(resolvePick(999, chars)));          // out of range
});

test('career tournaments still find enough AI players (16 pairs need 30 besides you and your partner)', () => {
  assert.ok(chars.length - 2 >= 30);
  assert.ok(chars.filter(isActive).length < 30);  // so the draw must use the full list, not the pickable one
});

test('pairUp gives 15 pairs of 30 different players from a big pool, and never undefined from a small one', () => {
  const big = Array.from({ length: 35 }, (_, i) => i);
  const pairs = pairUp(big, 15);
  assert.equal(new Set(pairs.flat()).size, 30);
  const small = pairUp([0, 1, 2, 3, 4, 5, 6], 15);
  assert.equal(small.length, 15);
  assert.ok(small.every(([a, b]) => a !== undefined && b !== undefined && a !== b));
});

test('the world ranking keeps the 33 original players, so a saved career keeps its place', () => {
  const ranked = chars.filter(c => c.ranked !== false);
  assert.equal(ranked.length, 33);
  assert.deepEqual(aiRankingTable(ranked).map(r => r.id), aiRankingTable(chars.slice(0, 33)).map(r => r.id));
});

test('every stance idle names a clip in the animation file', () => {
  const glb = fs.readFileSync(new URL('../public/assets/anims/UAL1_Standard.glb', import.meta.url));
  const names = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()).animations.map(a => a.name);
  for (const c of chars.filter(isActive)) assert.ok(names.includes(STANCE_CLIPS[c.stance.idle]), c.id);
});

test('an empty online seat played by the AI shows one of the active players', () => {
  for (const id of [0, 1, 2, 3]) assert.ok(isActive(chars[aiSeatChar(id, chars)]), String(id));
});

import { portraitKey } from '../src/roster.js';
test('a stance change makes a new portrait key', () => {
  const c = chars.find(x => x.id === 'p27');
  assert.notEqual(portraitKey(c), portraitKey({ ...c, stance: { ...c.stance, yaw: 0 } }));
});

