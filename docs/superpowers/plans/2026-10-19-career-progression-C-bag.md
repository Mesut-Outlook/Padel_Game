# Career Progression C — Bag + Hydration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Every player carries a bag (water, isotonic, banana, gel). Hydration drains in play. The bag drinks automatically at changeovers and offers food when energy is low. Career bags are bought in the Shop with limits.

**Architecture:** Effects live in `game.js` (`HYDRATION`, `BAG`), so the server clamps automatically: clients only send counts. The world reports `consume` / `offer` / `nowater` events. The client counts its own seat's use from those events, offline and online alike, and the career profile keeps `bag` counts.

**Spec:** `docs/superpowers/specs/2026-10-19-career-progression-design.md` §8, §10, §12.5–12.7

## Global Constraints
- `game.js` stays DOM-free and shared with the server.
- `fuel` is replaced by the bag everywhere: `pl.fuel` → `pl.tireK`, `profile.supplies` / `equipped.fuel` → `profile.bag`.
- Bag limits: food 8, drinks 8; with `bag_pro` 16 / 16. A migrated count above the limit is kept (§12.7).
- Friendly, tutorial and AI players have an unlimited default bag (water + banana).
- Eat key: keyboard **E**, pad **LT** (button 6). Ruling: the spec says pad Y, but Y = smash.

## Review Focus
- An old v2 profile with `supplies` / `equipped.fuel` loads and gets the starter bag plus its converted products.
- Two local humans: each one's offer and eat are their own.
- Online: the server accepts `eat` only while an offer is open, and the bag counts are clamped.
- Quitting mid-match still subtracts what was used.
- Hydration calibration: with no water, below 0.30 around game 5 of a set.

---

### Task 1 (C1, Opus): game rules
- `HYDRATION = { play, run, outdoor: 1.25, dry: 0.3, drySlow: 0.1, dryRest: 0.5 }`; `pl.hyd`.
- Drain while `w.state === 'play'`. When dry: speed × 0.9, rest × 0.5.
- `BAG` effects:
  - `bag_water`: hyd +0.5
  - `bag_isotonic`: hyd +0.35, energy +0.12
  - `bag_banana`: energy +0.12, tireK × 0.95
  - `bag_gel`: energy +0.22
- `DRINKS = [water, isotonic]`, `FOODS = [banana, gel]`. `pl.bag = opts.bag[id]` or the unlimited default.
- At a changeover:
  - Drink the first drink in the bag (`consume` event), or emit `nowater`.
  - If energy < 0.5 and there is food: `pl.offer = { item, until: t + 6 }` and an `offer` event.
- `inp.eat` while an offer is open eats it (`consume` event).
- `ai.js` eats when an offer is open.
- Snapshot index 8 = hyd.
- `opts.outdoor`.
- Server:
  - `m.bag` is sanitized (known keys, integers 0–16).
  - `eat` input is kept until the server steps, like `swing`.
  - `cfg.outdoor` is a boolean.
- Calibrate `HYDRATION` with `tools/sim.js`-style AI play.

### Task 2 (C2, Opus): career bag
- `shop.json`: drop the `fuel_*` items. Add:
  - `type: 'bag'` items: `bag_water` (6 / 30, amateur), `bag_banana` (5 / 60, amateur), `bag_isotonic` (5 / 100, club), `bag_gel` (5 / 150, regional).
  - `bag_pro` (gear, 1200, national).
- `career.js`:
  - `newProfile` gets `bag: { bag_water: 4, bag_banana: 3 }`.
  - `normalizeProfile` (on load and import) gives a profile without `bag` the starter bag plus converted `supplies`, and drops `supplies` / `equipped.fuel`.
  - `bagLimits(profile)`, `bagRoom(profile, item)`.
  - `buyItem` for bag items adds up to the limit and charges in proportion (`'bagfull'` when there is no room).
  - `settleMatch` takes `result.bag` (remaining counts).
  - `applyRating` on a tier up adds `eco.tierUpBag` (`{ bag_banana: 2, bag_water: 4 }`), clamped to the room left.
  - Remove `useFuel` and the `'fuel'` equip slot.

### Task 3 (C3, Sonnet, Opus reviews): screens
- HUD: a 💧 bar next to each energy bar, blinking when below 0.30.
- Offer box: "⚡ 38% — eat a banana? E / LT / tap", for 6 s, for local humans only.
- Hype messages: "Out of water — buy more in the Shop after the match" and "Your bag is empty — buy food in the Shop".
- `main.js`:
  - Count `consume` events for local seats.
  - `result.bag` (forfeit too).
  - Pass `bag` / `outdoor` to `newWorld` and the online join.
- Career screens:
  - Shop bag items show "6/8 drinks" and the Pro bag.
  - Locker drops the fuel slot.
  - "Restock" on the reward screen and hub when drinks ≤ 2 or food = 0.
- Friendly: the default bag, no Shop.
