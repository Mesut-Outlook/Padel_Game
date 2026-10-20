import test from 'node:test';
import assert from 'node:assert/strict';
import { crowdLooks, crowdPlan, railingFlags, COUNTRIES } from '../src/crowdplan.js';

// Simple deterministic PRNG for seeded tests
function makePrng(seed = 123456789) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('crowdLooks: women ratio is between 0.60 and 0.75 with fixed seed PRNG', () => {
  const prng = makePrng(42);
  const looks = crowdLooks(prng);
  assert.ok(Array.isArray(looks) && looks.length >= 16);

  const women = looks.filter(l => l.gender === 'f');
  const ratio = women.length / looks.length;
  assert.ok(ratio >= 0.60 && ratio <= 0.75, `women ratio was ${ratio}, expected 0.60..0.75`);
});

test('crowdLooks: every look uses only valid values recognized by createAvatar and server whitelist', () => {
  const ALLOWED_HAIR = ['Hair_SimpleParted', 'Hair_Buzzed', 'Hair_BuzzedFemale', 'Hair_Long', 'Hair_Buns', 'none'];
  const ALLOWED_STYLES = ['crew', 'polo', 'vneck', 'tank'];
  const ALLOWED_PATTERNS = ['none', 'chest', 'sash', 'side', 'stripes', 'split'];
  const ALLOWED_BODY_TYPES = ['slim', 'athletic', 'muscular', 'stocky', 'tall', 'petite'];
  const ALLOWED_BEARDS = ['stubble', 'full', 'goatee'];
  const COLOR_HEX = /^#[0-9a-f]{6}$/i;

  const looks = crowdLooks();
  for (const l of looks) {
    assert.ok(['m', 'f'].includes(l.gender), `invalid gender ${l.gender}`);
    assert.ok(COLOR_HEX.test(l.skinTone), `invalid skinTone ${l.skinTone}`);
    assert.ok(ALLOWED_HAIR.includes(l.hair), `invalid hair ${l.hair}`);
    assert.ok(COLOR_HEX.test(l.hairColor), `invalid hairColor ${l.hairColor}`);

    if (l.gender === 'f') {
      assert.strictEqual(l.beard, undefined, 'female look must not have beard');
      assert.ok(l.hair !== 'Hair_SimpleParted', 'female look should not have male parted hair');
    } else {
      if (l.beard) assert.ok(ALLOWED_BEARDS.includes(l.beard), `invalid beard ${l.beard}`);
      if (l.beardColor) assert.ok(COLOR_HEX.test(l.beardColor), `invalid beardColor ${l.beardColor}`);
    }

    assert.ok(l.outfit, 'outfit must exist');
    assert.ok(COLOR_HEX.test(l.outfit.shirt), `invalid shirt ${l.outfit.shirt}`);
    assert.ok(COLOR_HEX.test(l.outfit.shorts), `invalid shorts ${l.outfit.shorts}`);
    assert.ok(COLOR_HEX.test(l.outfit.shoes), `invalid shoes ${l.outfit.shoes}`);
    assert.ok(ALLOWED_STYLES.includes(l.outfit.style), `invalid style ${l.outfit.style}`);
    assert.ok(ALLOWED_PATTERNS.includes(l.outfit.pattern), `invalid pattern ${l.outfit.pattern}`);
    if (l.outfit.accent) assert.ok(COLOR_HEX.test(l.outfit.accent), `invalid accent ${l.outfit.accent}`);

    assert.ok(l.body, 'body must exist');
    assert.ok(ALLOWED_BODY_TYPES.includes(l.body.type), `invalid body type ${l.body.type}`);
    assert.ok(l.body.height >= 0.9 && l.body.height <= 1.1, `invalid height ${l.body.height}`);
    assert.ok(l.body.width >= 0.85 && l.body.width <= 1.2, `invalid width ${l.body.width}`);

    if (l.headwear) {
      assert.ok(['visor', 'headband'].includes(l.headwear.type), `invalid headwear type ${l.headwear.type}`);
      assert.ok(COLOR_HEX.test(l.headwear.color), `invalid headwear color ${l.headwear.color}`);
    }
  }
});

test('crowdPlan: seat occupancy follows the 0.4 + 0.6 * crowd formula', () => {
  const prng = makePrng(99);
  const seats = 1000;

  // Doha (crowd: 0.9) -> 0.4 + 0.6 * 0.9 = 0.94 -> 940 occupied
  const planDoha = crowdPlan(seats, { crowd: 0.9 }, prng);
  const occDoha = planDoha.filter(Boolean).length;
  assert.strictEqual(occDoha, Math.round(seats * 0.94));

  // Stockholm (crowd: 0.3) -> 0.4 + 0.6 * 0.3 = 0.58 -> 580 occupied
  const planStockholm = crowdPlan(seats, { crowd: 0.3 }, prng);
  const occStockholm = planStockholm.filter(Boolean).length;
  assert.strictEqual(occStockholm, Math.round(seats * 0.58));

  // Madrid (crowd: 0.5) -> 0.4 + 0.6 * 0.5 = 0.70 -> 700 occupied
  const planMadrid = crowdPlan(seats, { crowd: 0.5 }, prng);
  const occMadrid = planMadrid.filter(Boolean).length;
  assert.strictEqual(occMadrid, Math.round(seats * 0.70));
});

test('crowdPlan: flags distribution is ~50% venue country, ~33% player countries, rest mixed', () => {
  const prng = makePrng(777);
  const seatCount = 5000;
  const plan = crowdPlan(seatCount, {
    crowd: 1.0,
    venueCC: 'ES',
    playerCCs: ['TR', 'IT']
  }, prng);

  const flagEntries = plan.filter(s => s && s.flag).map(s => s.flag);
  assert.ok(flagEntries.length > 500, `expected sufficient flag count, got ${flagEntries.length}`);

  // Flag holders ratio among occupied seats (~15-20%)
  const flagRatio = flagEntries.length / seatCount;
  assert.ok(flagRatio >= 0.14 && flagRatio <= 0.22, `flag holder ratio was ${flagRatio}, expected ~0.15-0.20`);

  // Venue country (~50%)
  const venueFlags = flagEntries.filter(f => f === 'ES').length;
  const venueRatio = venueFlags / flagEntries.length;
  assert.ok(venueRatio >= 0.42 && venueRatio <= 0.58, `venue flag ratio was ${venueRatio}, expected ~0.50`);

  // Players countries (~33%)
  const playerFlags = flagEntries.filter(f => ['TR', 'IT'].includes(f)).length;
  const playerRatio = playerFlags / flagEntries.length;
  assert.ok(playerRatio >= 0.26 && playerRatio <= 0.40, `player flags ratio was ${playerRatio}, expected ~0.33`);

  // Rest mixed from other valid countries
  const mixedFlags = flagEntries.filter(f => f !== 'ES' && !['TR', 'IT'].includes(f)).length;
  assert.ok(mixedFlags > 0, 'mixed flags must exist');
});

test('crowdPlan: unknown country code never generates a flag for that unknown code', () => {
  const prng = makePrng(333);
  const plan = crowdPlan(1000, {
    crowd: 1.0,
    venueCC: 'XX',
    playerCCs: ['ZZ', 'QQ']
  }, prng);

  const flags = plan.filter(s => s && s.flag).map(s => s.flag);
  assert.strictEqual(flags.length, 0, 'unknown country codes with no valid candidates should result in no flags');
  assert.ok(!flags.includes('XX'));
  assert.ok(!flags.includes('ZZ'));
  assert.ok(!flags.includes('QQ'));
});

test('railingFlags: produces 4-6 valid railing banner flags alternating venue and players', () => {
  const flags = railingFlags({ venueCC: 'QA', playerCCs: ['ES', 'AR'], count: 6 });
  assert.strictEqual(flags.length, 6);
  assert.ok(flags.every(f => COUNTRIES.includes(f)));
  assert.ok(flags.includes('QA'));
  assert.ok(flags.includes('ES') || flags.includes('AR'));
});
