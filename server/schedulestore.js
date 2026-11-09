// The schedule file on the Pi (PADEL_STATE, e.g. /var/lib/padel/schedule.json): written whole on every change (temp file + rename,
// so a power cut leaves the old or the new file, never half of one), read once at start. Never throws: without it the schedule just lives in memory.
import fs from 'node:fs';

export function loadSchedule(path, log = () => {}) {
  if (!path) { log('schedule: not persistent'); return null; }
  let text;
  try { text = fs.readFileSync(path, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') log('schedule: not persistent'); return null; }  // first start: no file yet
  try { return JSON.parse(text); } catch { log('schedule: not persistent'); return null; }
}

export function saveSchedule(path, data) {
  if (!path) return false;
  try {
    fs.writeFileSync(path + '.tmp', JSON.stringify(data), { mode: 0o600 });  // only the server's user reads it
    fs.renameSync(path + '.tmp', path);
    return true;
  } catch { return false; }
}
