import test from 'node:test';
import assert from 'node:assert/strict';
import { serverUrl } from '../src/serverurl.js';

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
