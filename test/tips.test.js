import test from 'node:test';
import assert from 'node:assert/strict';
import { TIPS, tipCycle } from '../src/tips.js';

test('tips: no repeat until every tip was shown, keyboard and pad wording', () => {
  const next = tipCycle(() => 0.5);
  const seen = new Set(TIPS.map(() => next('kb')));
  assert.equal(seen.size, TIPS.length);
  const pad = tipCycle(() => 0)('pad');
  assert.equal(pad, TIPS[0].pad);
  assert.notEqual(pad, TIPS[0].kb);
});
