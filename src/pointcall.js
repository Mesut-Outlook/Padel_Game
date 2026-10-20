// Point-end announcement: which single player to name (the one who erred or hit the winner) and the second line.
// Pure — runs in Node tests and main.js. Games/sets/match still announce both team names (not here).

import { N_ } from './i18n.js';

export const teamOf = (pid) => (pid != null && pid >= 0 ? (pid < 2 ? 0 : 1) : null);

// errors: the last hitter is on the losing team
const ERROR_TEXT = {
  'hit opponent wall directly': N_('hit the glass directly'),
  'bounced own side': N_('bounced it on own side'),
  'hit own mesh': N_('hit own fence'),
  'double hit': N_('double hit'),
  'double fault': N_('double fault'),
  'volleyed serve': N_('volleyed the serve'),
};

// -> { pid | null, team, text }; pid null = name the team (no hitter, or the hitter doesn't fit the reason)
export function pointCall(why, scoringTeam, hitterPid) {
  const hitterTeam = teamOf(hitterPid), losingTeam = 1 - scoringTeam;
  const call = (team, text) => ({ pid: hitterTeam === team ? hitterPid : null, team, text });
  if (ERROR_TEXT[why]) return call(losingTeam, ERROR_TEXT[why]);
  if (why === 'double bounce') return call(scoringTeam, N_('winner'));
  if (why === 'out') {  // out after a bounce on the far side = the hitter's winner; straight out = the hitter's error
    if (hitterTeam === scoringTeam) return call(scoringTeam, N_('winner'));
    return hitterTeam === losingTeam ? call(losingTeam, N_('hit it out')) : { pid: null, team: losingTeam, text: N_('out') };
  }
  return { pid: null, team: scoringTeam, text: why || N_('point') };
}
