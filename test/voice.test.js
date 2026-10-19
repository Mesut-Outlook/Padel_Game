import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceGender, pickVoice, voiceTone } from '../src/voice.js';

const V = (name, lang = 'en-GB') => ({ name, lang });
const google = [V('Google US English', 'en-US'), V('Google UK English Female'), V('Google UK English Male')];

test('voiceGender', () => {
  const g = (n) => voiceGender(V(n));
  assert.equal(g('Google US English'), 'f');
  assert.equal(g('Google UK English Female'), 'f');
  assert.equal(g('Google UK English Male'), 'm');
  assert.equal(g('Microsoft David'), 'm');
  assert.equal(g('Microsoft Zira'), 'f');
  assert.equal(g('Samantha'), 'f');
  assert.equal(g('Daniel'), 'm');
  assert.equal(g('Whatever'), null);
});

test('pickVoice matches gender and is stable', () => {
  const m = { id: 'p01', gender: 'm' }, f = { id: 'p08', gender: 'f' };
  assert.equal(voiceGender(pickVoice(google, m)), 'm');
  assert.equal(voiceGender(pickVoice(google, f)), 'f');
  assert.equal(pickVoice(google, f), pickVoice(google, f));
  assert.deepEqual(voiceTone(m, true), voiceTone(m, true));
});

test('pickVoice ignores non-English and falls back', () => {
  const m = { id: 'p01', gender: 'm' };
  assert.equal(pickVoice([V('Daniel', 'fr-FR')], m), null);
  assert.equal(pickVoice([V('Google US English', 'en-US')], m), null);
  assert.ok(voiceTone(m, false).pitch < 0.8);
});
