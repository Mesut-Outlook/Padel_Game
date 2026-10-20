import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { collectKeys } from '../tools/extract-keys.js';

const keys = collectKeys();
const has = (k) => assert.ok(keys.has(k), `missing key: ${k}`);

test('collectKeys: dynamic keys marked with N_ and data files are found', () => {
  ['Athletic',                                  // careerui BODY_TYPES label
    'VÍBORA',                                   // main.js SHOT_NAME
    'Press C to switch camera angles',          // tips.js
    'winner',                                   // pointcall.js
    'Legend',                                   // level.js TIERS
    'You were dehydrated for {s} s',            // career.js coachTip
    'Starter Court',                            // data/shop.json name
    'DEUCE', 'RALLY TO 16',                     // rules.js score labels
  ].forEach(has);
  assert.ok([...keys.values()].flat().some((l) => l === 'data/shop.json'));
  assert.ok(![...keys.keys()].some((k) => k.includes('${')));
  assert.ok(![...keys.values()].some((v) => v.length === 0));
});

const placeholders = (s) => [...new Set(s.match(/\{\w+\}/g) || [])].sort().join();
const count = (s, c) => s.split(c).length - 1;

for (const f of fs.readdirSync(new URL('../src/locales/', import.meta.url)).filter((f) => f.endsWith('.js'))) {
  test(`locales: ${f} has every key with the same placeholders and tags`, async () => {
    const tbl = (await import(`../src/locales/${f}`)).default;
    const missing = [], bad = [];
    for (const k of keys.keys()) {
      const v = tbl[k];
      if (typeof v !== 'string' || !v) missing.push(k);
      else if (placeholders(v) !== placeholders(k) || count(v, '<') !== count(k, '<')) bad.push(k);
    }
    assert.deepEqual(missing.slice(0, 20), [], `${f}: ${missing.length} keys missing (first 20)`);
    assert.deepEqual(bad.slice(0, 20), [], `${f}: ${bad.length} keys with other placeholders or tags (first 20)`);
  });
}
