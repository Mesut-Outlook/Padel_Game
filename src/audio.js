// Match sounds synthesized with WebAudio (no asset files) + short player call-outs via speechSynthesis.
let ctx, out, musicBus, noise, muted = false;
let musicTimer = null, musicStep = 0, musicNextT = 0;

// must be called from a user gesture (start button / menu click) so the browser lets audio play
export function unlockAudio() {
  if (!ctx) {
    ctx = new AudioContext();
    // compressor keeps the loud racket hits punchy without clipping
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
    out = ctx.createGain(); out.gain.value = 0.75; out.connect(comp);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.22; musicBus.connect(out);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  if (out) out.gain.value = muted ? 0 : 0.75;
  if (muted) speechSynthesis?.cancel();
  return muted;
}

// Adjusts background music level depending on game state ('menu' | 'rally' | 'point' | 'slowmo')
export function setMusicDuck(mode = 'rally') {
  if (!ctx || !musicBus) return;
  const target = mode === 'slowmo' ? 0.06 : mode === 'rally' ? 0.16 : mode === 'point' ? 0.26 : 0.24;
  musicBus.gain.setTargetAtTime(target, ctx.currentTime, 0.18);
}

// Procedural upbeat Padel Tour synth-groove background music (~116 BPM, D Dorian / minor)
const STEP_DUR = 60 / 116 / 4; // 16th note (~0.129s)
const BASS_SEQ = [
  73.42, 0, 73.42, 0,  87.31, 0, 98.00, 0,  110.00, 0, 98.00, 0,  87.31, 0, 65.41, 73.42,
  58.27, 0, 58.27, 0,  65.41, 0, 87.31, 0,   98.00, 0, 87.31, 0,  65.41, 0, 82.41, 0,
];
const CHORD_PROG = [
  [293.66, 349.23, 440.00, 523.25], // Dm7
  [233.08, 293.66, 349.23, 440.00], // BbMaj7
  [196.00, 233.08, 293.66, 349.23], // Gm7
  [220.00, 261.63, 329.63, 392.00], // Am7
];
const ARP_NOTES = [587.33, 698.46, 880.00, 698.46, 523.25, 587.33, 440.00, 523.25];

function scheduleMusicStep(step, t) {
  if (!ctx || muted) return;
  const s16 = step % 16;
  const s32 = step % 32;
  const chord = CHORD_PROG[Math.floor(step / 16) % CHORD_PROG.length];

  // 1) Soft four-on-the-floor kick on 0, 4, 8, 12
  if (s16 % 4 === 0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(115, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.11);
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    o.connect(g).connect(musicBus);
    o.start(t); o.stop(t + 0.14);
  }

  // 2) Crisp hi-hat / shaker on off-beats & 16ths
  if (s16 % 2 === 1 || s16 === 14) {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise; f.type = 'highpass'; f.frequency.value = 6500;
    const v = s16 % 4 === 2 ? 0.09 : 0.04;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    src.connect(f).connect(g).connect(musicBus);
    src.start(t, (step * 0.07) % 0.7, 0.05);
  }

  // 3) Light snare / clap on beats 4 and 12
  if (s16 === 4 || s16 === 12) {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise; f.type = 'bandpass'; f.frequency.value = 1850; f.Q.value = 1.4;
    g.gain.setValueAtTime(0.11, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(f).connect(g).connect(musicBus);
    src.start(t, 0.1, 0.1);
  }

  // 4) Warm synth bassline
  const bf = BASS_SEQ[s32];
  if (bf > 0) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(bf, t);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(bf * 4.5, t);
    f.frequency.exponentialRampToValueAtTime(bf * 1.4, t + STEP_DUR * 1.6);
    f.Q.value = 2.2;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.20, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + STEP_DUR * 1.75);
    o.connect(f).connect(g).connect(musicBus);
    o.start(t); o.stop(t + STEP_DUR * 1.85);
  }

  // 5) Electric piano / synth chord stabs on step 0, 6, 10
  if (s16 === 0 || s16 === 6 || s16 === 10) {
    const dur = s16 === 0 ? STEP_DUR * 4.5 : STEP_DUR * 2.5;
    for (const cf of chord) {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(cf, t);
      f.type = 'lowpass'; f.frequency.value = 1600;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.055, t + 0.018);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(f).connect(g).connect(musicBus);
      o.start(t); o.stop(t + dur + 0.02);
    }
  }

  // 6) Melodic pluck arpeggio on selected 16th steps
  if (s16 % 3 === 1) {
    const af = ARP_NOTES[(step + Math.floor(step / 16)) % ARP_NOTES.length];
    const o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
    o.type = 'sine';
    o.frequency.setValueAtTime(af, t);
    p.pan.value = Math.sin(step * 0.9) * 0.45;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + STEP_DUR * 1.5);
    o.connect(g).connect(p).connect(musicBus);
    o.start(t); o.stop(t + STEP_DUR * 1.6);
  }
}

export function startMusic() {
  if (!ctx || musicTimer) return;
  musicNextT = ctx.currentTime + 0.05;
  musicTimer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (musicNextT < now - 0.2) musicNextT = now;
    while (musicNextT < now + 0.28) {
      scheduleMusicStep(musicStep++, musicNextT);
      musicNextT += STEP_DUR;
    }
  }, 100);
}

// filtered noise burst
function burst({ freq, q = 1, type = 'bandpass', vol, dur, delay = 0, pan = 0 }) {
  const t = ctx.currentTime + delay, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  if (pan) {
    const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    src.connect(f).connect(g).connect(p).connect(out);
  } else {
    src.connect(f).connect(g).connect(out);
  }
  src.start(t, Math.random() * 0.5, dur + 0.05);
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
  const k = Math.max(0.2, Math.min(1, intensity));
  // Individual claps scattered across stereo field
  for (let i = 0; i < 22; i++) {
    burst({
      freq: 1100 + Math.random() * 1700,
      q: 1.3,
      vol: 0.05 + 0.09 * k,
      dur: 0.055,
      delay: Math.random() * (0.65 + k * 0.9),
      pan: Math.random() * 1.6 - 0.8,
    });
  }
  // Stadium crowd swell
  burst({ freq: 850, q: 0.45, vol: 0.14 * k, dur: 1.3 + k, pan: -0.25 });
  burst({ freq: 1350, q: 0.55, vol: 0.10 * k, dur: 1.1 + k * 0.8, delay: 0.08, pan: 0.25 });
}

// Mid-rally & big-point spectator reactions ("ooh" on smashes/saves, "gasp" on deep rally saves, "cheer" on long rallies, "roar" on big winners, "murmur" between points)
let lastReactAt = 0;
export function sfxCrowdReact(kind = 'ooh') {
  if (!ctx || muted) return;
  const now = ctx.currentTime;
  if (kind !== 'roar' && now - lastReactAt < 0.95) return; // avoid overlapping mid-rally crowd reactions
  lastReactAt = now;

  if (kind === 'ooh') {
    // Collective crowd "Ooooh!" formant sweep + a few claps
    for (const [fStart, fPeak, fEnd, pan] of [[340, 520, 390, -0.45], [460, 690, 510, 0.45]]) {
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
      src.buffer = noise; f.type = 'bandpass'; f.Q.value = 3.2;
      f.frequency.setValueAtTime(fStart, now);
      f.frequency.exponentialRampToValueAtTime(fPeak, now + 0.22);
      f.frequency.exponentialRampToValueAtTime(fEnd, now + 0.65);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.14, now + 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.70);
      p.pan.value = pan;
      src.connect(f).connect(g).connect(p).connect(out);
      src.start(now, Math.random() * 0.4, 0.75);
    }
    for (let i = 0; i < 6; i++) {
      burst({ freq: 1400 + Math.random() * 1200, q: 1.4, vol: 0.045, dur: 0.05, delay: 0.15 + Math.random() * 0.45, pan: Math.random() * 1.4 - 0.7 });
    }
  } else if (kind === 'gasp') {
    // Sharp collective intake "Aaah!" on dramatic saves / 10+ shot rallies
    for (const [f0, f1, pan] of [[520, 880, -0.4], [640, 1080, 0.4]]) {
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
      src.buffer = noise; f.type = 'bandpass'; f.Q.value = 3.6;
      f.frequency.setValueAtTime(f0, now);
      f.frequency.exponentialRampToValueAtTime(f1, now + 0.16);
      f.frequency.exponentialRampToValueAtTime(f0 * 0.9, now + 0.42);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.13, now + 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
      p.pan.value = pan;
      src.connect(f).connect(g).connect(p).connect(out);
      src.start(now, Math.random() * 0.4, 0.5);
    }
    for (let i = 0; i < 8; i++) {
      burst({ freq: 1300 + Math.random() * 1300, q: 1.3, vol: 0.05, dur: 0.05, delay: 0.1 + Math.random() * 0.35, pan: Math.random() * 1.5 - 0.75 });
    }
  } else if (kind === 'cheer') {
    // Mid-rally excitement claps & short cheer
    for (let i = 0; i < 12; i++) {
      burst({ freq: 1200 + Math.random() * 1500, q: 1.2, vol: 0.055, dur: 0.05, delay: Math.random() * 0.55, pan: Math.random() * 1.6 - 0.8 });
    }
    burst({ freq: 980, q: 0.6, vol: 0.09, dur: 0.75 });
  } else if (kind === 'roar') {
    // Stadium roar + rhythmic applause on marathon rallies, clean winners, or clutch points
    for (const [f0, fPeak, dur, pan] of [[420, 760, 1.6, -0.5], [680, 1180, 1.5, 0.5], [540, 920, 1.7, 0]]) {
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
      src.buffer = noise; f.type = 'bandpass'; f.Q.value = 1.6;
      f.frequency.setValueAtTime(f0, now);
      f.frequency.exponentialRampToValueAtTime(fPeak, now + 0.28);
      f.frequency.exponentialRampToValueAtTime(f0 * 1.1, now + dur);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.16, now + 0.16);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      p.pan.value = pan;
      src.connect(f).connect(g).connect(p).connect(out);
      src.start(now, Math.random() * 0.3, dur + 0.05);
    }
    for (let i = 0; i < 30; i++) {
      burst({ freq: 1150 + Math.random() * 1800, q: 1.3, vol: 0.065, dur: 0.055, delay: Math.random() * 1.4, pan: Math.random() * 1.7 - 0.85 });
    }
  } else if (kind === 'murmur') {
    // Subtle stadium chatter / light claps between points
    burst({ freq: 620, q: 0.5, vol: 0.045, dur: 0.9, pan: -0.3 });
    burst({ freq: 880, q: 0.6, vol: 0.035, dur: 0.8, delay: 0.1, pan: 0.3 });
  }
}

// Tasteful harmonic chime when the player earns style points or unlocks a medal (tier 1 = micro-callout, tier 2 = big point/medal)
export function sfxReward(tier = 1) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime;
  const notes = tier >= 2
    ? [[587.33, 0, 0.16, 0.07], [739.99, 0.07, 0.18, 0.075], [880.00, 0.14, 0.26, 0.085], [1174.66, 0.22, 0.38, 0.09]] // D5 F#5 A5 D6
    : [[587.33, 0, 0.14, 0.055], [880.00, 0.065, 0.22, 0.065]]; // D5 A5
  for (const [freq, delay, dur, vol] of notes) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t0 + delay);
    g.gain.setValueAtTime(0.001, t0 + delay);
    g.gain.linearRampToValueAtTime(vol, t0 + delay + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + dur);
    o.connect(g).connect(out);
    o.start(t0 + delay);
    o.stop(t0 + delay + dur + 0.02);
  }
}

let smashSetupGains = [];
function clearSmashSetup() {
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const g of smashSetupGains) {
    try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(Math.max(0.001, g.gain.value), now); g.gain.exponentialRampToValueAtTime(0.0008, now + 0.06); } catch {}
  }
  smashSetupGains = [];
}

// Melodic slow-motion sting when an overhead smash opportunity opens up:
// time-warp sub drop + rising heroic synth-brass arpeggio (D4 -> F4 -> A4 -> C5 -> D5 -> F5)
export function sfxSmashSlowMo() {
  if (!ctx || muted) return;
  clearSmashSetup();
  setMusicDuck('slowmo');
  const t0 = ctx.currentTime;
  // 1) Time-dilation sub-bass drop + heartbeat pulse
  knock(155, 46, 0.38, 0.45, 'sine');
  knock(95, 42, 0.25, 0.35, 'triangle');
  // 2) Rising heroic melody notes (D minor / Dorian power motif)
  const notes = [
    [293.66, 0.00, 0.22, 0.16], // D4
    [349.23, 0.11, 0.22, 0.17], // F4
    [440.00, 0.22, 0.26, 0.19], // A4
    [523.25, 0.34, 0.28, 0.20], // C5
    [587.33, 0.46, 0.65, 0.23], // D5 (sustained)
    [698.46, 0.68, 0.75, 0.18], // F5 (high shimmer)
    [146.83, 0.00, 1.20, 0.14], // D3 warm pad root
    [220.00, 0.22, 1.00, 0.12], // A3 fifth
  ];
  for (const [freq, delay, dur, vol] of notes) {
    for (const detune of [-6, 6]) {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = freq < 250 ? 'triangle' : 'sawtooth';
      o.frequency.setValueAtTime(freq, t0 + delay);
      o.detune.value = detune;
      f.type = 'lowpass';
      f.frequency.setValueAtTime(freq * 1.8, t0 + delay);
      f.frequency.exponentialRampToValueAtTime(freq * 4.2, t0 + delay + Math.min(0.12, dur * 0.4));
      f.frequency.exponentialRampToValueAtTime(freq * 1.5, t0 + delay + dur);
      f.Q.value = 1.8;
      g.gain.setValueAtTime(0.001, t0 + delay);
      g.gain.linearRampToValueAtTime(vol * 0.5, t0 + delay + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + dur);
      o.connect(f).connect(g).connect(out);
      o.start(t0 + delay);
      o.stop(t0 + delay + dur + 0.04);
      smashSetupGains.push(g);
    }
  }
}

// Triumphant power chord when the smash / overhead is struck
export function sfxSmashImpact(perfect = false) {
  if (!ctx || muted) return;
  clearSmashSetup();
  setMusicDuck('rally');
  const t0 = ctx.currentTime;
  knock(140, 38, 0.55, 0.32, 'sine'); // sub boom
  const chord = perfect
    ? [146.83, 220.00, 293.66, 369.99, 440.00, 587.33, 739.99, 880.00] // D major bright fanfare + high octave
    : [146.83, 220.00, 293.66, 369.99, 440.00, 587.33];
  chord.forEach((freq, i) => {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = i < 2 ? 'triangle' : 'sawtooth';
    o.frequency.setValueAtTime(freq, t0);
    o.detune.value = (i % 2 === 0 ? 4 : -4);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq * 5, t0);
    f.frequency.exponentialRampToValueAtTime(freq * 1.6, t0 + 0.55);
    g.gain.setValueAtTime(0.001, t0);
    g.gain.linearRampToValueAtTime(0.09, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.58);
    o.connect(f).connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + 0.62);
  });
}

const LINES = {
  en: {
    win: ['Come on!', 'Yes!', 'What a shot!', 'Boom!', "Let's go!", 'Nice one!', 'Got it!'],
    miss: ['Nooo!', 'Ugh…', 'My bad!', 'So close!', 'Unlucky!', 'Next one!'],
    lang: 'en-US',
  },
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// returns the line so the caller can show it as a speech bubble
export function callout(ch, good) {
  const L = LINES.en, text = pick(good ? L.win : L.miss);
  if (!muted && 'speechSynthesis' in window && !speechSynthesis.speaking) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = L.lang; u.rate = 1.12; u.pitch = ch.gender === 'f' ? 1.32 : 0.88; u.volume = 0.8;
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
