import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadSchedule, saveSchedule } from '../server/schedulestore.js';

const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'padel-sched-'));

test('saveSchedule then loadSchedule returns the same object and leaves no .tmp file', () => {
  const d = dir(), f = path.join(d, 'schedule.json'), data = { games: [{ id: 'g1', at: 123, seats: [] }] };
  assert.equal(saveSchedule(f, data), true);
  assert.deepEqual(loadSchedule(f), data);
  assert.deepEqual(fs.readdirSync(d), ['schedule.json']);
});

test('no path or a garbage file → null with one log line; a missing file (first start) → null silently; unwritable dir → false; never throws', () => {
  const logs = [], log = (l) => logs.push(l);
  assert.equal(loadSchedule('', log), null);
  const d = dir(), f = path.join(d, 'schedule.json');
  assert.equal(loadSchedule(f, log), null);
  fs.writeFileSync(f, '{nope');
  assert.equal(loadSchedule(f, log), null);
  assert.deepEqual(logs, ['schedule: not persistent', 'schedule: not persistent']);
  assert.equal(saveSchedule(path.join(d, 'no', 'such', 'dir', 'x.json'), {}), false);
  assert.equal(saveSchedule('', {}), false);
});
