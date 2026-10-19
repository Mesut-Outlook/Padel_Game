// Friendly character card generator (pure: no DOM or three.js imports).
// Evaluates character stats to highlight top strengths, main weakness, and actionable play tips.

export const STAT_ORDER = ['speed', 'power', 'control', 'volley', 'smash', 'stamina'];

export const STAT_NAMES = {
  speed: 'Speed',
  power: 'Power',
  control: 'Control',
  volley: 'Volley',
  smash: 'Smash',
  stamina: 'Stamina',
};

export const STRENGTH_TIPS = {
  speed: 'chase every ball down',
  power: 'go for winners with hard drives',
  control: 'place the ball into the corners',
  volley: 'take the net early',
  smash: 'finish at the net',
  stamina: 'wear them down in long rallies',
};

export const WEAKNESS_TIPS = {
  speed: 'stay central and let your partner cover',
  power: 'play for placement, not pace',
  control: 'keep rallies short',
  volley: 'let the ball bounce off the glass',
  smash: 'play a bandeja instead of a full smash',
  stamina: 'keep points short and eat at changeovers',
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

  const s1Name = STAT_NAMES[s1[0]] || s1[0];
  const wName = STAT_NAMES[weakness[0]] || weakness[0];
  const s1Tip = STRENGTH_TIPS[s1[0]] || 'play to your strengths';
  const wTip = WEAKNESS_TIPS[weakness[0]] || 'manage your weakness';

  const tip = `${s1Name} ${s1[1]} · ${wName} ${weakness[1]} — ${s1Tip}, ${wTip}`;

  return { strengths, weakness, tip };
}
