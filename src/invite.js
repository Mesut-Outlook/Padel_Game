// Invite a friend: the link that opens a room with one tap, and how it leaves this device (phone share sheet, else the clipboard).
import { N_ } from './i18n.js';

export const INVITE_TEXT = N_('Play padel with me!');

// a game played through ?server= keeps that server in the link, or the friend lands on no server
export function inviteUrl(code, loc, server) {
  const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (!c) return '';
  return `${loc.origin}${loc.pathname}?room=${c}${server ? `&server=${encodeURIComponent(server)}` : ''}`;
}

// -> 'shared' | 'copied' | 'cancelled' | 'failed'. Web Share only where it opens the system sheet (phones, tablets); desktops copy.
export async function shareInvite(url, text, nav = globalThis.navigator, touch = false) {
  if (!url) return 'failed';
  if (touch && nav?.share) {
    try { await nav.share({ title: 'Padel Legends', text, url }); return 'shared'; } catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  }
  try { await nav.clipboard.writeText(url); return 'copied'; } catch { return 'failed'; }
}
