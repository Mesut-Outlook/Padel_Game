// Online lobby as the players see it: who sits where, who made the room, the room's rules and what to do next.
// Pure (no DOM): lobbyView() turns the server's lobby message into plain data, lobbyHtml() draws it for the
// Friendly wizard and the career Play Online screen. Names come from other players: always escaped.
import { t, N_ } from './i18n.js';

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const DEUCE = { golden: N_('Golden point'), adv: N_('Advantage'), star: N_('Star point') };

// l = the server's lobby message, seat = mine; characters / venues = data/*.json
export function lobbyView(l, seat, characters = [], venues = []) {
  const taken = l.taken || [], away = l.away || [];
  const seats = (l.seats || []).map(id => ({
    id, team: id < 2 ? 0 : 1,
    name: l.names?.[id] || characters[l.chars?.[id]]?.name || '',
    you: id === seat, host: id === l.host,
    human: taken.includes(id), away: away.includes(id),
  })).sort((a, b) => a.team - b.team || a.id - b.id);
  const c = l.cfg || {};
  const host = seats.find(s => s.host);
  return {
    code: l.code, started: !!l.started, seats,
    rules: { venue: venues[c.venue]?.name || '', players: c.players === 2 ? 2 : 4, sets: c.sets || 3, superTiebreak: !!c.superTiebreak, deuce: c.starPoint ? 'star' : c.goldenPoint === false ? 'adv' : 'golden' },
    amHost: seat != null && seat === l.host,
    hostName: host?.name || '',
    humans: taken.length,
    canStart: !l.started && seat === l.host && taken.length >= 2,
  };
}

export function lobbyHtml(v) {
  const r = v.rules;
  const sets = r.sets === 1 ? t('1 set') : r.superTiebreak ? t('2 sets + super tie-break') : t('Best of {n} sets', { n: r.sets });
  const row = (s) => `<li class="lb-seat${s.human ? ' is-human' : ''}${s.you ? ' is-you' : ''}">
      <span class="lb-name">${s.human || s.away ? esc(s.name) : t('Free seat')}</span>
      ${s.you ? `<span class="lb-tag">${t('you')}</span>` : ''}${s.host ? `<span class="lb-tag lb-host">★ ${t('host')}</span>` : ''}
      <span class="lb-state">${s.away ? t('reconnecting… the AI plays') : s.human ? '' : t('the AI plays')}</span></li>`;
  const team = (n) => `<div class="lb-team"><div class="lb-team-name">${t('Team {n}', { n: n + 1 })}</div><ul>${v.seats.filter(s => s.team === n).map(row).join('')}</ul></div>`;
  const next = v.started ? t('The match has started.')
    : v.amHost ? (v.humans < 2 ? t('Send the invite link to your friends. You can start as soon as someone has joined.') : t('Everyone in? Press START MATCH.'))
    : t('You are in! Waiting for {host} to start the match.', { host: esc(v.hostName || '?') });
  return `<div class="lb">
    <div class="lb-head">${t('Room')} <b>${esc(v.code)}</b> · ${t('{n} of {total} players', { n: v.humans, total: v.seats.length })}</div>
    <div class="lb-teams">${team(0)}${team(1)}</div>
    <div class="lb-rules">${[esc(r.venue), r.players === 2 ? t('Singles') : t('Doubles'), sets, t(DEUCE[r.deuce])].filter(Boolean).join(' · ')}</div>
    <div class="lb-next">${next}</div>
  </div>`;
}
