// Corner performance panel, on with ?debug (remembered for the session, ?debug=0 turns it off). Off = no DOM, one boolean per frame.
// Labels are technical abbreviations on purpose (not translated). No data leaves the page.
let on = false;
try {
  const q = new URLSearchParams(location.search).get('debug');
  if (q !== null) sessionStorage.setItem('padel.debug', q === '0' ? '' : '1');
  on = !!sessionStorage.getItem('padel.debug');
} catch {}
export const debugOn = () => on;

let el, t0 = 0, n = 0, sum = 0, max = 0, prev = 0;
// once per frame, right after the main render (renderer.info resets on the next render call); net = online net or null
export function debugFrame(now, renderer, net) {
  if (!on) return;
  if (prev) { const d = now - prev; sum += d; n++; if (d > max) max = d; }
  prev = now;
  if (now - t0 < 500 || !n) return;
  if (!el) {
    el = document.createElement('pre');
    el.style.cssText = 'position:fixed;left:6px;bottom:6px;margin:0;padding:4px 6px;font:10px/1.3 monospace;color:#0f0;background:#000a;pointer-events:none;z-index:99';
    document.body.appendChild(el);
  }
  const i = renderer.info, m = performance.memory;
  el.textContent = [
    `${(1000 * n / sum).toFixed(0)} FPS  ${(sum / n).toFixed(1)}/${max.toFixed(1)} ms`,
    `${i.render.calls} calls  ${i.render.triangles} tris`,
    `${i.memory.geometries} geo  ${i.memory.textures} tex`,
    m && `${(m.usedJSHeapSize / 1048576).toFixed(0)} MB heap`,
    net && net.rtt != null && `ping ${net.rtt.toFixed(0)} ms  srv tick ${net.srvTick} ms`,
  ].filter(Boolean).join('\n');
  t0 = now; n = sum = max = 0;
}
