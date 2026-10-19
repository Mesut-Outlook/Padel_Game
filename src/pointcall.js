// Point-end announcement: which single player to name (the one who erred or hit the winner) and the second line.
// Pure — runs in Node tests and main.js. Games/sets/match still announce both team names (not here).

export const teamOf = (pid) => (pid != null && pid >= 0 ? (pid < 2 ? 0 : 1) : null);

// errors: the last hitter is on the losing team
const ERROR_TEXT = {
  'hit opponent wall directly': 'hit the glass directly',
  'bounced own side': 'bounced it on own side',
  'hit own mesh': 'hit own fence',
  'double hit': 'double hit',
  'double fault': 'double fault',
  'volleyed serve': 'volleyed the serve',
};

// -> { pid | null, team, text }; pid null = name the team (no hitter, or the hitter doesn't fit the reason)
export function pointCall(why, scoringTeam, hitterPid) {
  const hitterTeam = teamOf(hitterPid), losingTeam = 1 - scoringTeam;
  const call = (team, text) => ({ pid: hitterTeam === team ? hitterPid : null, team, text });
  if (ERROR_TEXT[why]) return call(losingTeam, ERROR_TEXT[why]);
  if (why === 'double bounce') return call(scoringTeam, 'winner');
  if (why === 'out') {  // out after a bounce on the far side = the hitter's winner; straight out = the hitter's error
    if (hitterTeam === scoringTeam) return call(scoringTeam, 'winner');
    return hitterTeam === losingTeam ? call(losingTeam, 'hit it out') : { pid: null, team: losingTeam, text: 'out' };
  }
  return { pid: null, team: scoringTeam, text: why || 'point' };
}
