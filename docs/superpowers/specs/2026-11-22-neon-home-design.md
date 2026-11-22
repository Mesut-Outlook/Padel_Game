# Neon HOME, "Pick your legend" (design)

Status: **approved by the user on 2026-11-22**. Plan: `docs/superpowers/plans/2026-11-22-neon-home.md`.
Mock-up (open in a browser, works offline; local only, not committed): `2026-11-22-neon-home-mockup.html`.

## Intent
The user wants a modern, beautiful entrance with vivid, eye-catching colours and neon, designed together.

## Decided by the user
- Direction C: nine full-height coloured lanes, one per active player; the picked lane opens.
- Every player holds a differently coloured racket.
- That colour is also on court in Play now (option 1).
- Phones use swipe cards.

## Approaches
| | Trade-off | Result |
|---|---|---|
| A Night match (neon court, duel) | clearest "this is padel", cramped in portrait | not picked |
| B Neon sign (club wall, tube logo) | calm brand look, static | not picked |
| C Pick your legend | most colour, picking is the first action; less neon | **picked** |

Racket colour: 1 player's colour in Play now (**picked**); 2 HOME only (would not match the court);
3 map players to the 12 models (would change balance).

## Racket colours (`racketColor` in `data/characters.json`; the order of the list is untouched)
Lucía #00E5FF, Daan #7426FF, Matteo #FF6A00, Lena #FFFFFF, Mesut #FFE600, Elin #FF1F8F, Diogo #FF2020,
Camille #35F22C, Tomás #1638FF.

## Behaviour
- Landscape and desktop: lanes. Closed = side-on pose with the racket in front, open = front pose.
- Portrait: one card with both neighbours peeking, native scroll-snap; the centred card is the pick; a tap also picks.
- The pick is the Friendly pick (`#char`, `padel.friendly.v1`). The wizard must follow a pick made on HOME
  (today `selectedCharIdx` in `menu.js` is read once and would write the old player back).
- Play now: singles/doubles from HOME, club AI, 1 set, as today. All players on court use their own colour.
  Copy the racket object, never mutate the shared one; model, shape and stats stay.
- Career, shop and Customize matches keep the model's colour.
- Keyboard and pad: lanes are buttons; left/right moves, A picks, focus opens on Play now.

## Builder's calls (the user may correct)
- Removed while there is no server: calendar, nickname, Team up / Face off, "Warm up until someone joins".
  With a server they render as today below the new hero; restyling them is not part of this job.
- "Play vs AI" goes: Customize > START MATCH plays the saved settings.
- The six how-to pictures and the pad status leave HOME; the Controls page has them.
- Career moves up next to Training and Customize. Profile opens the same screen, so it goes.
- Fix: without a server Play now starts the AI match directly. Today it calls the online path and counts
  `online-click` + `online-noserver` for every press, which spoils the "wants online" statistic.
- Images: 18 pre-rendered local WebP files (about 270 KB in total), closed poses not loaded in portrait.
  No live 3D, no blur, no new dependency, no new request to another host.
- Dark name text on the orange, sky, green and turquoise lanes (contrast).
- Country names from `Intl.DisplayNames`; new UI strings go into all 7 locale tables.

## Not in this job
Splash, wizard, career screens and HUD stay light. Online play stays closed.

## Done when
- `npm test` passes, with tests for: pick persists and reaches the wizard, Play now colour without changing stats,
  no online events without a server.
- Browser check at 1440x810, 1280x640, 768x1024, 390x844, 360x640, 844x390, in the longest languages (de, pt).
- Keyboard, pad and touch can reach every control; reduced motion respected; smooth on Intel HD 620.
- Built on branch `neon-home`; security-auditor and the user's look at it before merge; Pages run checked after push.
