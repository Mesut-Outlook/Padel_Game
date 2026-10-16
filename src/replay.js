// Ring-buffer replay. Plain data, no three import. Snapshot format: see game.js snapshot().
const TAU = Math.PI * 2;
const lerp = (a, b, u) => a + (b - a) * u;
const lerpAngle = (a, b, u) => a + ((((b - a + Math.PI) % TAU) + TAU) % TAU - Math.PI) * u;

export function createReplay(seconds = 15, hz = 60) {
  const cap = Math.ceil(seconds * hz);
  const buf = new Array(cap).fill(null);
  let start = 0, n = 0;
  let marks = [];
  let pt = 0, from = 0, to = 0, speed = 0.5;
  const at = i => buf[(start + i) % cap];

  function sample(t) {
    if (!n) return null;
    let lo = 0, hi = n - 1;
    if (t <= at(0).t) return at(0);
    if (t >= at(hi).t) return at(hi);
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (at(m).t <= t) lo = m; else hi = m; }
    const a = at(lo), b = at(hi), u = (t - a.t) / ((b.t - a.t) || 1);
    const near = u < 0.5 ? a : b;
    const pl = a.pl.map((p, i) => {
      const q = b.pl[i], r = near.pl[i].slice();
      r[0] = lerp(p[0], q[0], u); r[1] = lerp(p[1], q[1], u); r[2] = lerpAngle(p[2], q[2], u);
      return r;
    });
    return { ...near, t, b: [lerp(a.b[0], b.b[0], u), lerp(a.b[1], b.b[1], u), lerp(a.b[2], b.b[2], u)], pl };
  }

  const r = {
    playing: false,
    get length() { return n; },
    get oldest() { return n ? at(0).t : 0; },
    get newest() { return n ? at(n - 1).t : 0; },
    record(snap) {
      if (n < cap) buf[(start + n++) % cap] = snap;
      else { buf[start] = snap; start = (start + 1) % cap; }
    },
    mark(label) { if (n) marks.push({ label, t: r.newest }); },
    highlights() { marks = marks.filter(m => m.t >= r.oldest); return marks; },
    // from/to are snapshot times; with only `label`, plays +-3s around the latest matching mark.
    play({ from: f, to: e, speed: s = 0.5, label } = {}) {
      if (!n) return;
      const m = label && marks.findLast(k => k.label === label);
      if (f === undefined && e === undefined) {
        if (m) { f = m.t - 3; e = m.t + 3; } else { e = r.newest; f = e - 6; }
      }
      e ??= r.newest; f ??= e - 6;
      from = Math.max(f, r.oldest); to = Math.min(e, r.newest);
      pt = from; speed = s; r.playing = true;
    },
    stop() { r.playing = false; },
    setSpeed(s) { speed = s; },
    scrub(t) { pt = Math.min(Math.max(t, from), to); return sample(pt); },
    update(dt) {
      if (!r.playing) return null;
      pt += dt * speed;
      if (pt >= to - 1e-9) { r.playing = false; return null; }
      return sample(pt);
    },
  };
  return r;
}
