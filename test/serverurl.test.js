import test from 'node:test';
import assert from 'node:assert/strict';
import { serverUrl, trustedServer } from '../src/serverurl.js';

const loc = (href) => new URL(href);

test('static build: no server unless ?server= is given, whatever the domain', () => {
  assert.equal(serverUrl(loc('https://padellegends.eu/'), true), null);
  assert.equal(serverUrl(loc('https://mesut-outlook.github.io/Padel_Game/'), true), null);
  assert.equal(serverUrl(loc('https://padellegends.eu/?server=wss://s.example:9000'), true), 'wss://s.example:9000');
  assert.equal(serverUrl(loc('https://padellegends.eu/'), true, 'wss://server.padellegends.eu'), 'wss://server.padellegends.eu');
});

test('dev and self-hosted builds connect to their own server', () => {
  assert.equal(serverUrl(loc('http://localhost:5173/'), false), 'ws://localhost:8080');
  assert.equal(serverUrl(loc('http://192.168.1.5:8080/'), false), 'ws://192.168.1.5:8080');
  assert.equal(serverUrl(loc('https://abc.trycloudflare.com/'), false), 'wss://abc.trycloudflare.com');
  assert.equal(serverUrl(loc('http://localhost:5173/?server=ws://x:1'), false), 'ws://x:1');
});

test('a ?server= taken out of the URL by index.html still counts', () => {
  assert.equal(serverUrl(loc('https://padellegends.eu/'), true, null, 'wss://s.example'), 'wss://s.example');
  assert.equal(serverUrl(loc('https://padellegends.eu/?server=wss://a.example'), true, null, 'wss://s.example'), 'wss://a.example');
});

test('only our own, same-host and local servers connect without asking', () => {
  const site = loc('https://padellegends.eu/');
  assert.equal(trustedServer('wss://server.padellegends.eu', site, 'wss://server.padellegends.eu'), true);
  assert.equal(trustedServer('wss://padellegends.eu', site, null), true);
  assert.equal(trustedServer('ws://localhost:8080', site, null), true);
  assert.equal(trustedServer('wss://abc.trycloudflare.com', site, null), false);
  assert.equal(trustedServer('wss://server.padellegends.eu.evil.example', site, 'wss://server.padellegends.eu'), false);
  assert.equal(trustedServer('https://padellegends.eu', site, null), false);
  assert.equal(trustedServer('not a url', site, null), false);
});
