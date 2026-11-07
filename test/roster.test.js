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
