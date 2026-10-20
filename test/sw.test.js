import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// public/sw.js is a classic script (not bundled), so run it in a sandbox and take cachePolicy out.
const ctx = { self: { addEventListener() {}, location: { search: '?v=t' } }, URLSearchParams };
vm.runInNewContext(fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), ctx);
const O = 'https://padellegends.eu', S = O + '/';
const p = (u, m = 'GET', nav = false) => ctx.cachePolicy(new URL(u), O, S, m, nav);

test('hashed build files are cache first; models and fonts come from the cache and refresh in the background', () => {
  assert.equal(p(S + 'assets/main-61kw_4eF.js'), 'cache');
  assert.equal(p(S + 'assets/index-AbC12_3x.css'), 'cache');
  assert.equal(p(S + 'assets/anims/UAL1_Standard.glb'), 'stale');
  assert.equal(p(S + 'assets/ubc/Hair_BuzzedFemale.bin'), 'stale');
  assert.equal(p(S + 'fonts/x.woff2'), 'stale');
});
test('html pages are network first', () => {
  assert.equal(p(S, 'GET', true), 'network');
  assert.equal(p(S + 'privacy.html', 'GET', true), 'network');
});
test('other sites, websockets, non-GET and other paths are left alone', () => {
  assert.equal(p('https://gc.zgo.at/count.v5.js'), 'skip');
  assert.equal(p('wss://game.example.com/ws'), 'skip');
  assert.equal(p(S + 'assets/a.glb', 'POST'), 'skip');
  assert.equal(p(S + 'sw.js'), 'skip');
  assert.equal(p(S + 'manifest.webmanifest'), 'skip');
});
