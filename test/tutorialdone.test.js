import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tutorialFinished, LESSON_IDS, TUTORIAL_STORE } from '../src/tutorialdone.js';

const store = (v) => ({ getItem: (k) => (k === TUTORIAL_STORE ? v : null) });

test('tutorialFinished: all lesson ids done → true; one missing, empty, garbage JSON or throwing storage → false', () => {
  assert.equal(tutorialFinished(store(JSON.stringify(LESSON_IDS))), true);
  assert.equal(tutorialFinished(store(JSON.stringify(LESSON_IDS.slice(1)))), false);
  assert.equal(tutorialFinished(store(null)), false);
  assert.equal(tutorialFinished(store('{oops')), false);
  assert.equal(tutorialFinished({ getItem: () => { throw new Error('blocked'); } }), false);
});

test('LESSON_IDS match the lessons in tutorial.js', () => {
  const ids = [...readFileSync(new URL('../src/tutorial.js', import.meta.url), 'utf8').matchAll(/\{ id: '([a-z]+)'/g)].map(m => m[1]);
  assert.deepEqual(LESSON_IDS, ids);
});
