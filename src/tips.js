// Short gameplay tips shown at changeovers. Pad texts use Xbox names; main.js runs them through padText().
import { t, N_ } from './i18n.js';

export const TIPS = [
  { kb: N_('Opponents at the net? Lob over them with K'), pad: N_('Opponents at the net? Lob over them with B') },
  { kb: N_('Hold A / D while hitting to aim left or right'), pad: N_('Hold the left stick while hitting to aim left or right') },
  { kb: N_('Press C to switch camera angles'), pad: N_('Press View to switch camera angles') },
  { kb: N_('Plug in a controller: keyboard + controller = 2 players'), pad: N_('A second pad (or the keyboard) = 2 players: team up or face off') },
  { kb: N_('High ball near the net? Smash it with L'), pad: N_('High ball near the net? Smash it with Y') },
  { kb: N_('Víbora (I): a sliced overhead that curls into the side glass'), pad: N_('Víbora (RB): a sliced overhead that curls into the side glass') },
  { kb: N_('Chiquita (U): a soft ball at the net players’ feet'), pad: N_('Chiquita (X): a soft ball at the net players’ feet') },
  { kb: N_('Ball got past you? Play it off your own glass with O'), pad: N_('Ball got past you? Play it off your own glass with RT') },
  { kb: N_('Press R to watch the last shots again'), pad: N_('Press R3 to watch the last shots again') },
  { kb: N_('Running and smashing tire you out; changeovers refill energy'), pad: N_('Running and smashing tire you out; changeovers refill energy') },
];

// Walks the list from a random start so a match never repeats a tip before all were shown.
export function tipCycle(rand = Math.random) {
  let i = Math.floor(rand() * TIPS.length);
  return (device) => t(TIPS[i++ % TIPS.length][device === 'pad' ? 'pad' : 'kb']);
}
