// Friendly character card generator (pure: no DOM or three.js imports).
// Evaluates character stats to highlight top strengths, main weakness, and actionable play tips.
import { t, N_ } from './i18n.js';

export const STAT_ORDER = ['speed', 'power', 'control', 'volley', 'smash', 'stamina'];

export const STAT_NAMES = {
  speed: N_('Speed'),
  power: N_('Power'),
  control: N_('Control'),
  volley: N_('Volley'),
  smash: N_('Smash'),
  stamina: N_('Stamina'),
};

export const STRENGTH_TIPS = {
  speed: N_('chase every ball down'),
  power: N_('go for winners with hard drives'),
  control: N_('place the ball into the corners'),
  volley: N_('take the net early'),
  smash: N_('finish at the net'),
  stamina: N_('wear them down in long rallies'),
};

export const WEAKNESS_TIPS = {
  speed: N_('stay central and let your partner cover'),
  power: N_('play for placement, not pace'),
  control: N_('keep rallies short'),
  volley: N_('let the ball bounce off the glass'),
  smash: N_('play a bandeja instead of a full smash'),
  stamina: N_('keep points short and eat at changeovers'),
};

/**
 * Evaluates a character's stats to produce strengths, weakness, and gameplay advice.
 * @param {Record<string, number>} stats
 * @returns {{ strengths: [string, number][], weakness: [string, number], tip: string }}
 */
export function charCard(stats = {}) {
  const entries = STAT_ORDER.map(k => [k, Number(stats?.[k] ?? 6)]);

  // Strengths: top 2 stats descending. Stable sort preserves STAT_ORDER for ties.
  const sortedDesc = [...entries].sort((a, b) => b[1] - a[1]);
  const s1 = sortedDesc[0];
  const s2 = sortedDesc[1];
  const strengths = [s1, s2];

  // Weakness: lowest stat not in strengths. Ties resolve to the first in STAT_ORDER.
  const remaining = entries.filter(([k]) => k !== s1[0] && k !== s2[0]);
  let weakness = remaining[0];
  for (let i = 1; i < remaining.length; i++) {
    if (remaining[i][1] < weakness[1]) {
      weakness = remaining[i];
    }
  }

  const s1Name = t(STAT_NAMES[s1[0]] || s1[0]);
  const wName = t(STAT_NAMES[weakness[0]] || weakness[0]);
  const s1Tip = t(STRENGTH_TIPS[s1[0]] || N_('play to your strengths'));
  const wTip = t(WEAKNESS_TIPS[weakness[0]] || N_('manage your weakness'));

  const tip = t('{sName} {sVal} · {wName} {wVal} — {sTip}, {wTip}', {
    sName: s1Name,
    sVal: s1[1],
    wName: wName,
    wVal: weakness[1],
    sTip: s1Tip,
    wTip: wTip,
  });

  return { strengths, weakness, tip };
}
