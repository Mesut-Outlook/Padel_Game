// Short gameplay tips shown at changeovers. Pad texts use Xbox names; main.js runs them through padText().
export const TIPS = [
  { kb: 'Opponents at the net? Lob over them with K', pad: 'Opponents at the net? Lob over them with B' },
  { kb: 'Hold A / D while hitting to aim left or right', pad: 'Hold the left stick while hitting to aim left or right' },
  { kb: 'Press C to switch camera angles', pad: 'Press View to switch camera angles' },
  { kb: 'Plug in a controller: keyboard + controller = 2 players', pad: 'A second pad (or the keyboard) = 2 players: team up or face off' },
  { kb: 'High ball near the net? Smash it with L', pad: 'High ball near the net? Smash it with Y' },
  { kb: 'Víbora (I): a sliced overhead that curls into the side glass', pad: 'Víbora (RB): a sliced overhead that curls into the side glass' },
  { kb: 'Chiquita (U): a soft ball at the net players’ feet', pad: 'Chiquita (X): a soft ball at the net players’ feet' },
  { kb: 'Ball got past you? Play it off your own glass with O', pad: 'Ball got past you? Play it off your own glass with RT' },
  { kb: 'Press R to watch the last shots again', pad: 'Press R3 to watch the last shots again' },
  { kb: 'Running and smashing tire you out; changeovers refill energy', pad: 'Running and smashing tire you out; changeovers refill energy' },
];

// Walks the list from a random start so a match never repeats a tip before all were shown.
export function tipCycle(rand = Math.random) {
  let i = Math.floor(rand() * TIPS.length);
  return (device) => TIPS[i++ % TIPS.length][device === 'pad' ? 'pad' : 'kb'];
}
