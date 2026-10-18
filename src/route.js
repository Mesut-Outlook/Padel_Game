// Pure route parser for Padel Legends navigation:
// parseRoute(hash, search) -> { screen: 'home' | 'friendly' | 'career', room?: string }

export function parseRoute(hash = '', search = '') {
  const h = String(hash || '').replace(/^#/, '').toLowerCase().trim();
  const sp = new URLSearchParams(search || '');
  const rawRoom = sp.get('room');
  const room = rawRoom ? String(rawRoom).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) : undefined;

  let screen = 'home';
  if (h === 'career') screen = 'career';
  else if (h === 'friendly') screen = 'friendly';
  else if (h === 'home') screen = 'home';
  else if (room) screen = 'friendly';
  else screen = 'home';

  const res = { screen };
  if (room) res.room = room;
  return res;
}
