import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { charCard, STAT_ORDER, STAT_NAMES, STRENGTH_TIPS, WEAKNESS_TIPS } from '../src/charcard.js';

const chars = JSON.parse(fs.readFileSync(new URL('../data/characters.json', import.meta.url)));

test('charCard: selects top 2 strengths and lowest weakness', () => {
  const stats = { speed: 6, power: 9, control: 5, volley: 7, smash: 8, stamina: 6 };
  const card = charCard(stats);

  assert.deepEqual(card.strengths, [['power', 9], ['smash', 8]]);
  assert.deepEqual(card.weakness, ['control', 5]);
  assert.equal(card.tip, 'Power 9 · Control 5 — go for winners with hard drives, keep rallies short');
});

test('charCard: tie-breaking respects STAT_ORDER (speed, power, control, volley, smash, stamina)', () => {
  // All stats equal (e.g. 6)
  const allSix = { speed: 6, power: 6, control: 6, volley: 6, smash: 6, stamina: 6 };
  const cardAll = charCard(allSix);
  assert.deepEqual(cardAll.strengths, [['speed', 6], ['power', 6]]);
  assert.deepEqual(cardAll.weakness, ['control', 6]);

  // Tie for second strength: speed 9, power 8, control 8 -> power wins tie over control
  const tieStrength = { speed: 9, power: 8, control: 8, volley: 6, smash: 7, stamina: 5 };
  const cardTieS = charCard(tieStrength);
  assert.deepEqual(cardTieS.strengths, [['speed', 9], ['power', 8]]);
  assert.deepEqual(cardTieS.weakness, ['stamina', 5]);

  // Tie for weakness: power 9, smash 8, control 5, volley 5 -> control wins tie over volley
  const tieWeak = { speed: 7, power: 9, control: 5, volley: 5, smash: 8, stamina: 6 };
  const cardTieW = charCard(tieWeak);
  assert.deepEqual(cardTieW.weakness, ['control', 5]);
});

test('charCard: tip string format matches specification', () => {
  const card = charCard({ speed: 7, power: 6, control: 5, volley: 6, smash: 9, stamina: 7 });
  // Top: smash 9, Weakness: control 5
  assert.equal(card.tip, 'Smash 9 · Control 5 — finish at the net, keep rallies short');
});

test('charCard: produces valid strengths, weakness, and non-empty tip for all roster characters', () => {
  assert.ok(chars.length > 0);
  for (const c of chars) {
    const card = charCard(c.stats);
    assert.equal(card.strengths.length, 2, `${c.name} has 2 strengths`);
    assert.ok(card.strengths[0][1] >= card.strengths[1][1], `${c.name} strengths sorted descending`);
    assert.ok(card.weakness[1] <= card.strengths[1][1], `${c.name} weakness <= second strength`);
    assert.ok(typeof card.tip === 'string' && card.tip.length > 0, `${c.name} has non-empty tip`);
    assert.ok(card.tip.includes(' — '), `${c.name} tip has separator`);
    assert.ok(card.tip.includes(' · '), `${c.name} tip has dot`);
  }
});
