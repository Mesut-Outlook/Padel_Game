// Match sounds synthesized with WebAudio (no asset files) + short player call-outs via speechSynthesis.
let ctx, out, noise, muted = false;

// must be called from a user gesture (start button) so the browser lets audio play
export function unlockAudio() {
  if (!ctx) {
    ctx = new AudioContext();
    // compressor keeps the loud racket hits punchy without clipping
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
    out = ctx.createGain(); out.gain.value = 0.7; out.connect(comp);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function toggleMute() { muted = !muted; if (out) out.gain.value = muted ? 0 : 0.7; if (muted) speechSynthesis?.cancel(); return muted; }

// filtered noise burst
function burst({ freq, q = 1, type = 'bandpass', vol, dur, delay = 0 }) {
  const t = ctx.currentTime + delay, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(out); src.start(t, Math.random() * 0.5, dur + 0.05);
}
// pitched knock that drops in pitch; triangle adds body ("tok"), sine is a clean thump
function knock(f0, f1, vol, dur, type = 'sine') {
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
}

// Racket: deep, solid "pock" (foam-core padel racket) — the loudest sound on court.
// power 0..1: harder hits are louder, a little higher and longer.
export function sfxHit(power) {
  if (!ctx || muted) return;
  const p = Math.max(0, Math.min(1, power));
  burst({ freq: 1000 + 300 * p, q: 1.2, vol: 0.3 + 0.2 * p, dur: 0.025 });           // contact click
  knock(380 + 80 * p, 170, 0.75 + 0.45 * p, 0.09 + 0.04 * p, 'triangle');            // hollow body
  knock(130, 55, 0.5 + 0.3 * p, 0.08);                                                // low thump
}

// Air: band-passed noise sweep. pan -1..1 (left/right speaker), vol 0..1.
export function sfxWhoosh(vol, pan = 0, dur = 0.32) {
  if (!ctx || muted || vol < 0.05) return;
  const t = ctx.currentTime, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
  src.buffer = noise; f.type = 'bandpass'; f.Q.value = 1.6;
  f.frequency.setValueAtTime(450, t); f.frequency.exponentialRampToValueAtTime(1700, t + dur * 0.5); f.frequency.exponentialRampToValueAtTime(500, t + dur);
  g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.5 * vol, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  p.pan.value = Math.max(-1, Math.min(1, pan));
  src.connect(f).connect(g).connect(p).connect(out); src.start(t, Math.random() * 0.5, dur + 0.05);
}

export function sfxContact(kind, speed = 8) {
  if (!ctx || muted) return;
  const v = Math.min(1, speed / 20);
  if (kind === 'floor') { knock(230, 100, 0.2 + 0.25 * v, 0.06, 'triangle'); burst({ freq: 450, type: 'lowpass', vol: 0.08 + 0.1 * v, dur: 0.03 }); }  // ball on turf: softer, lower "tup"
  else if (kind === 'glass') { knock(1150, 700, 0.25 + 0.3 * v, 0.16); burst({ freq: 3200, q: 2, vol: 0.3 * v + 0.1, dur: 0.12 }); knock(240, 120, 0.3 * v, 0.12); }
  else if (kind === 'mesh') for (let i = 0; i < 6; i++) burst({ freq: 2400 + i * 150, q: 3, vol: (0.25 + 0.2 * v) * (1 - i / 7), dur: 0.05, delay: i * 0.035 });
  else if (kind === 'net') burst({ freq: 350, type: 'lowpass', vol: 0.5 * v + 0.15, dur: 0.25 });
}

export function sfxCrowd(intensity) {
  if (!ctx || muted) return;
  for (let i = 0; i < 18; i++) burst({ freq: 1200 + Math.random() * 1600, q: 1.2, vol: 0.06 + 0.1 * intensity, dur: 0.06, delay: Math.random() * (0.6 + intensity) });
  burst({ freq: 900, q: 0.4, vol: 0.12 * intensity, dur: 1.2 + intensity });
}

const LINES = {
  es: { win: ['¡Vamos!', '¡Toma!', '¡Venga!', '¡Bien!', '¡Eso es!'], miss: ['¡Nooo!', 'Uff…', '¡Perdón!', '¡Madre mía!'], lang: 'es-ES' },
  tr: { win: ['Hadi be!', 'İşte bu!', 'Aldık!', 'Bravo!'], miss: ['Of ya!', 'Yazık!', 'Pardon!', 'Olmadı!'], lang: 'tr-TR' },
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// returns the line so the caller can show it as a speech bubble
export function callout(ch, good) {
  const L = ch.countryCode === 'TR' ? LINES.tr : LINES.es, text = pick(good ? L.win : L.miss);
  if (!muted && 'speechSynthesis' in window && !speechSynthesis.speaking) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = L.lang; u.rate = 1.15; u.pitch = ch.gender === 'f' ? 1.35 : 0.85; u.volume = 0.8;
    speechSynthesis.speak(u);
  }
  return text;
}

// Recording tap: a MediaStream carrying everything the game plays (used for promo/video capture).
export function audioStream() {
  if (!ctx) return null;
  const d = ctx.createMediaStreamDestination();
  out.connect(d);
  return d.stream;
}
