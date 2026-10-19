// Call-out voice choice: gender-matched speechSynthesis voice + per-player tone (pure, no DOM).
const MALE = /\b(male|david|mark|guy|daniel|alex|fred|rishi|arthur|aaron|oliver|gordon|george|james|ryan|thomas)\b/i;
const FEMALE = /\b(female|woman|zira|aria|jenny|samantha|victoria|karen|moira|tessa|fiona|susan|serena|hazel|libby|sonia|google us english)\b/i;

export function voiceGender(voice) {
  const n = voice?.name || '';
  if (FEMALE.test(n)) return 'f';  // first: "Female" must not hit the male rule
  if (MALE.test(n)) return 'm';
  return null;
}

const hash = (ch) => {
  let h = 2166136261;
  for (const c of String(ch.id || ch.name || '')) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};

export function pickVoice(voices, ch) {
  const g = ch.gender === 'f' ? 'f' : 'm';
  const ok = (voices || []).filter((v) => /^en/i.test(v.lang || '') && voiceGender(v) === g)
    .sort((a, b) => (a.name < b.name ? -1 : 1));
  return ok.length ? ok[hash(ch) % ok.length] : null;
}

export function voiceTone(ch, matched) {
  const h = hash(ch), a = (h % 1000) / 999, b = ((h >>> 10) % 1000) / 999;
  const m = ch.gender !== 'f';
  const [lo, hi] = matched ? (m ? [0.72, 1.1] : [0.9, 1.3]) : (m ? [0.55, 0.75] : [1.25, 1.45]);
  const c = (x) => Math.min(2, Math.max(0.1, x));
  return { pitch: c(lo + (hi - lo) * a), rate: c(0.95 + 0.25 * b) };
}
