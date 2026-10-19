// Pure settings manager for Padel Legends
// Storage key: padel.settings.v1
// Schema: { control: 'auto' | 'kb' | 'pad', speed: 0.7 | 0.85 | 1, tips: boolean (changeover tips), lang: '' (browser) | LANGS code }

import { track } from './track.js';
import { LANGS } from './i18n.js';

export const DEFAULT_SETTINGS = Object.freeze({
  control: 'auto',
  speed: 0.85,
  tips: true,
  lang: '',
});

export const VALID_CONTROLS = Object.freeze(['auto', 'kb', 'pad']);
export const VALID_SPEEDS = Object.freeze([0.7, 0.85, 1]);
export const SETTINGS_KEY = 'padel.settings.v1';

function safeStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadSettings(storage) {
  const store = safeStorage(storage);
  try {
    if (!store) return { ...DEFAULT_SETTINGS };
    const raw = store.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const data = JSON.parse(raw);
    const control = VALID_CONTROLS.includes(data?.control) ? data.control : DEFAULT_SETTINGS.control;
    const numSpeed = Number(data?.speed);
    const speed = VALID_SPEEDS.includes(numSpeed) ? numSpeed : DEFAULT_SETTINGS.speed;
    const tips = typeof data?.tips === 'boolean' ? data.tips : DEFAULT_SETTINGS.tips;
    return { control, speed, tips, lang: validLang(data?.lang) ? data.lang : DEFAULT_SETTINGS.lang };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

const validLang = (l) => l === '' || LANGS.some(([c]) => c === l);

export function saveSettings(settings, storage) {
  const store = safeStorage(storage);
  const current = loadSettings(store);
  const nextControl = settings?.control !== undefined && VALID_CONTROLS.includes(settings.control)
    ? settings.control
    : current.control;
  const numSpeed = Number(settings?.speed);
  const nextSpeed = settings?.speed !== undefined && VALID_SPEEDS.includes(numSpeed)
    ? numSpeed
    : current.speed;
  const tips = typeof settings?.tips === 'boolean' ? settings.tips : current.tips;
  const lang = validLang(settings?.lang) ? settings.lang : current.lang;
  const result = { control: nextControl, speed: nextSpeed, tips, lang };
  for (const k of ['control', 'speed', 'tips', 'lang']) if (result[k] !== current[k]) track(`settings-change/${k}`);  // which setting, never its value
  try {
    store?.setItem(SETTINGS_KEY, JSON.stringify(result));
  } catch {
    // storage throws or blocked: proceed in-memory
  }
  return result;
}
