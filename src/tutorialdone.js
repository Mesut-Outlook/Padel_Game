// Has this visitor finished every training lesson? Pure (storage passed in), so HOME can ask without loading the tutorial (three.js).
export const TUTORIAL_STORE = 'padel.tutorial';
export const LESSON_IDS = ['move', 'serve', 'slice', 'forehand', 'backhand', 'aim', 'lob', 'chiquita', 'volley', 'smash', 'glass', 'contra', 'ui', 'match'];  // = LESSONS in tutorial.js (a test checks)

export function tutorialFinished(storage = globalThis.localStorage) {
  try {
    const done = new Set(JSON.parse(storage?.getItem(TUTORIAL_STORE) || '[]'));
    return LESSON_IDS.every(id => done.has(id));
  } catch { return false; }
}
