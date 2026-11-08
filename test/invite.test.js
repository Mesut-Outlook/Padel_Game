import test from 'node:test';
import assert from 'node:assert/strict';
import { inviteUrl, shareInvite } from '../src/invite.js';

const loc = { origin: 'https://padellegends.eu', pathname: '/' };
test('invite link: a clean code, and the server only when one is in use', () => {
  assert.equal(inviteUrl('ab-c12z9', loc), 'https://padellegends.eu/?room=ABC12Z');
  assert.equal(inviteUrl('ABC123', loc, 'wss://x.example/a b'), 'https://padellegends.eu/?room=ABC123&server=wss%3A%2F%2Fx.example%2Fa%20b');
  assert.equal(inviteUrl('', loc), '');
});

test('share: phones get the share sheet, desktops and a failed share copy the link', async () => {
  const copied = [];
  const nav = { share: async () => {}, clipboard: { writeText: async (u) => { copied.push(u); } } };
  assert.equal(await shareInvite('u1', 't', nav, true), 'shared');
  assert.equal(await shareInvite('u2', 't', nav, false), 'copied');
  assert.equal(await shareInvite('u3', 't', { ...nav, share: async () => { throw Object.assign(new Error(), { name: 'AbortError' }); } }, true), 'cancelled');
  assert.equal(await shareInvite('u4', 't', { clipboard: { writeText: async () => { throw new Error('no'); } } }, false), 'failed');
  assert.deepEqual(copied, ['u2']);
});
