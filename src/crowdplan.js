// Crowd appearance and seating plan generator.
// Pure ES module: NO three.js and NO DOM imports (runs in Node.js test environment and browser).

export const COUNTRIES = [
  'TR', 'ES', 'AR', 'SE', 'IT', 'QA', 'MX', 'NL', 'FR', 'PT', 'BR', 'GB', 'DE', 'US'
];

export const CROWD_LOOKS_COUNT = 16;

// 16 curated spectator appearances: 11 women (68.75%), 5 men (31.25%).
// All properties strictly conform to server/server.js ONE_OF, OUTFIT_STYLES, OUTFIT_PATTERNS, BODY_TYPES.
const BASE_LOOKS = [
  // --- Female Spectators (11 / 16 = 68.75% women: chic, stylish, diverse, well-dressed) ---
  {
    id: 'crowd_f01', gender: 'f', skinTone: '#F3D2B3',
    hair: 'Hair_Long', hairColor: '#2B1D14', hairCut: 1.4, makeup: true,
    glasses: '#1b1b1b',
    outfit: { shirt: '#E76F51', shorts: '#F4F4F4', shoes: '#FFFFFF', style: 'polo', pattern: 'none', accent: '#FFFFFF' },
    body: { type: 'slim', height: 1.01, width: 0.94 }
  },
  {
    id: 'crowd_f02', gender: 'f', skinTone: '#FFDBAC',
    hair: 'Hair_Buns', hairColor: '#C9A15E', makeup: true,
    headwear: { type: 'visor', color: '#FFFFFF' },
    outfit: { shirt: '#2A9D8F', shorts: '#1D3557', shoes: '#E9C46A', style: 'tank', pattern: 'side', accent: '#E9C46A' },
    body: { type: 'athletic', height: 0.98, width: 0.96 }
  },
  {
    id: 'crowd_f03', gender: 'f', skinTone: '#E0AC69',
    hair: 'Hair_Long', hairColor: '#111111', hairCut: 1.5, ponytail: 0.32, makeup: true,
    outfit: { shirt: '#6C5CE7', shorts: '#FFFFFF', shoes: '#A29BFE', style: 'vneck', pattern: 'sash', accent: '#FFFFFF' },
    body: { type: 'petite', height: 0.96, width: 0.92 }
  },
  {
    id: 'crowd_f04', gender: 'f', skinTone: '#F6D7BC',
    hair: 'Hair_BuzzedFemale', hairColor: '#8E3B1F', makeup: true,
    headwear: { type: 'headband', color: '#0077B6' },
    outfit: { shirt: '#00B4D8', shorts: '#03045E', shoes: '#CAF0F8', style: 'crew', pattern: 'chest', accent: '#90E0EF' },
    body: { type: 'athletic', height: 1.02, width: 0.98 }
  },
  {
    id: 'crowd_f05', gender: 'f', skinTone: '#F1C27D',
    hair: 'Hair_Long', hairColor: '#4A2F1D', hairCut: 1.35, makeup: true,
    glasses: '#4A2F1D',
    outfit: { shirt: '#F4A261', shorts: '#264653', shoes: '#E76F51', style: 'polo', pattern: 'side', accent: '#E9C46A' },
    body: { type: 'slim', height: 0.99, width: 0.93 }
  },
  {
    id: 'crowd_f06', gender: 'f', skinTone: '#C68642',
    hair: 'Hair_Buns', hairColor: '#111111', makeup: true,
    outfit: { shirt: '#F8F9FA', shorts: '#212529', shoes: '#D4AF37', style: 'tank', pattern: 'none', accent: '#D4AF37' },
    body: { type: 'tall', height: 1.05, width: 0.95 }
  },
  {
    id: 'crowd_f07', gender: 'f', skinTone: '#8D5524',
    hair: 'Hair_Long', hairColor: '#1B1B1E', hairCut: 1.45, ponytail: 0.35, makeup: true,
    outfit: { shirt: '#D62828', shorts: '#003049', shoes: '#FDF0D5', style: 'vneck', pattern: 'sash', accent: '#FDF0D5' },
    body: { type: 'athletic', height: 1.00, width: 0.97 }
  },
  {
    id: 'crowd_f08', gender: 'f', skinTone: '#F3D2B3',
    hair: 'Hair_Long', hairColor: '#2B1D14', hairCut: 1.3, topknot: true, makeup: true,
    glasses: '#1b1b1b',
    outfit: { shirt: '#1D3557', shorts: '#F1FAEE', shoes: '#E63946', style: 'crew', pattern: 'stripes', accent: '#E63946' },
    body: { type: 'slim', height: 0.97, width: 0.92 }
  },
  {
    id: 'crowd_f09', gender: 'f', skinTone: '#FFDBAC',
    hair: 'Hair_Long', hairColor: '#C9A15E', hairCut: 1.6, makeup: true,
    headwear: { type: 'visor', color: '#1B1B1E' },
    outfit: { shirt: '#F3C644', shorts: '#1B1B1E', shoes: '#FFFFFF', style: 'polo', pattern: 'split', accent: '#1B1B1E' },
    body: { type: 'athletic', height: 1.01, width: 0.95 }
  },
  {
    id: 'crowd_f10', gender: 'f', skinTone: '#8D5524',
    hair: 'Hair_Buns', hairColor: '#111111', makeup: true,
    outfit: { shirt: '#7209B7', shorts: '#3F37C9', shoes: '#4CC9F0', style: 'tank', pattern: 'split', accent: '#4CC9F0' },
    body: { type: 'tall', height: 1.04, width: 0.94 }
  },
  {
    id: 'crowd_f11', gender: 'f', skinTone: '#F6D7BC',
    hair: 'Hair_Long', hairColor: '#8E3B1F', hairCut: 1.4, makeup: true,
    outfit: { shirt: '#2EC4B6', shorts: '#011627', shoes: '#FF9F1C', style: 'crew', pattern: 'chest', accent: '#E71D36' },
    body: { type: 'slim', height: 0.98, width: 0.93 }
  },

  // --- Male Spectators (5 / 16 = 31.25%: varied beards, glasses, neat sporty clothes) ---
  {
    id: 'crowd_m01', gender: 'm', skinTone: '#F3D2B3',
    hair: 'Hair_SimpleParted', hairColor: '#2B1D14', beard: 'full', beardColor: '#2B1D14',
    outfit: { shirt: '#0F2027', shorts: '#203A43', shoes: '#2C5364', style: 'polo', pattern: 'none', accent: '#FFFFFF' },
    body: { type: 'athletic', height: 1.02, width: 1.02 }
  },
  {
    id: 'crowd_m02', gender: 'm', skinTone: '#FFDBAC',
    hair: 'Hair_SimpleParted', hairColor: '#7A5230', beard: 'stubble', beardColor: '#7A5230',
    glasses: '#1b1b1b',
    outfit: { shirt: '#2C3E50', shorts: '#BDC3C7', shoes: '#E74C3C', style: 'crew', pattern: 'stripes', accent: '#E74C3C' },
    body: { type: 'muscular', height: 1.04, width: 1.05 }
  },
  {
    id: 'crowd_m03', gender: 'm', skinTone: '#E0AC69',
    hair: 'Hair_Buzzed', hairColor: '#111111',
    glasses: '#2C3E50',
    outfit: { shirt: '#4A90E2', shorts: '#1B2A47', shoes: '#FFFFFF', style: 'polo', pattern: 'side', accent: '#50E3C2' },
    body: { type: 'tall', height: 1.06, width: 0.98 }
  },
  {
    id: 'crowd_m04', gender: 'm', skinTone: '#F6D7BC',
    hair: 'Hair_SimpleParted', hairColor: '#4A2F1D', beard: 'goatee', beardColor: '#4A2F1D',
    outfit: { shirt: '#800020', shorts: '#1B1B1E', shoes: '#D4AF37', style: 'vneck', pattern: 'none', accent: '#D4AF37' },
    body: { type: 'athletic', height: 1.01, width: 1.01 }
  },
  {
    id: 'crowd_m05', gender: 'm', skinTone: '#C68642',
    hair: 'Hair_Buzzed', hairColor: '#1B1B1E', beard: 'stubble', beardColor: '#1B1B1E',
    headwear: { type: 'headband', color: '#2D6A4F' },
    outfit: { shirt: '#1B4332', shorts: '#081C15', shoes: '#52B788', style: 'crew', pattern: 'chest', accent: '#74C69D' },
    body: { type: 'stocky', height: 0.98, width: 1.04 }
  }
];

/**
 * Returns a list of spectator looks.
 * Guaranteed: ~65-70% women (11/16 = 68.75%), valid values for createAvatar.
 */
export function crowdLooks(_rand = Math.random) {
  // Clone looks so callers cannot mutate the template
  return BASE_LOOKS.map(l => JSON.parse(JSON.stringify(l)));
}

/**
 * Computes occupancy and audience plan for seatCount seats.
 * @param {number} seatCount Total number of seats in the stands.
 * @param {object} opts { fill, crowd, venueCC, playerCCs }
 * @param {function} rand Deterministic or Math.random PRNG returning [0, 1).
 * @returns {Array<null|{ lookIndex: number, flag: string|null }>} Array of size seatCount
 */
export function crowdPlan(seatCount, { fill, crowd, venueCC, playerCCs } = {}, rand = Math.random) {
  const venueCrowd = typeof crowd === 'number' ? crowd : 0.5;
  const fillRatio = typeof fill === 'number'
    ? Math.max(0, Math.min(1, fill))
    : Math.max(0, Math.min(1, 0.4 + 0.6 * venueCrowd));

  const occupiedCount = Math.round(seatCount * fillRatio);

  // Validate country codes
  const validVenue = COUNTRIES.includes(venueCC) ? venueCC : null;
  const validPlayers = Array.isArray(playerCCs) ? playerCCs.filter(c => COUNTRIES.includes(c)) : [];

  // Pick occupied seat indices randomly
  const seatIndices = Array.from({ length: seatCount }, (_, i) => i);
  // Fisher-Yates shuffle
  for (let i = seatIndices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = seatIndices[i];
    seatIndices[i] = seatIndices[j];
    seatIndices[j] = tmp;
  }
  const occupiedSet = new Set(seatIndices.slice(0, occupiedCount));

  const plan = new Array(seatCount);
  for (let i = 0; i < seatCount; i++) {
    if (!occupiedSet.has(i)) {
      plan[i] = null;
      continue;
    }

    // Pick look index
    const lookIndex = Math.floor(rand() * CROWD_LOOKS_COUNT);

    // ~15-20% hold a waving flag (test expects ~15-20%)
    let flag = null;
    const wantsFlag = rand() < 0.18;
    if (wantsFlag) {
      flag = pickCrowdFlag(validVenue, validPlayers, rand);
    }

    plan[i] = { lookIndex, flag };
  }

  return plan;
}

/**
 * Flag selection distribution:
 * ~50% venue country (if valid)
 * ~33.3% players' countries (if any valid)
 * ~16.7% mixed from COUNTRIES
 * If venue or players are missing/unknown, gracefully redistribute among valid candidates.
 */
function pickCrowdFlag(venueCC, playerCCs, rand) {
  const hasVenue = Boolean(venueCC);
  const hasPlayers = Boolean(playerCCs && playerCCs.length > 0);

  if (hasVenue && hasPlayers) {
    const roll = rand();
    if (roll < 0.50) {
      return venueCC;
    } else if (roll < 0.833) {
      return playerCCs[Math.floor(rand() * playerCCs.length)];
    } else {
      return COUNTRIES[Math.floor(rand() * COUNTRIES.length)];
    }
  }

  if (hasVenue && !hasPlayers) {
    const roll = rand();
    if (roll < 0.65) return venueCC;
    return COUNTRIES[Math.floor(rand() * COUNTRIES.length)];
  }

  if (!hasVenue && hasPlayers) {
    const roll = rand();
    if (roll < 0.65) return playerCCs[Math.floor(rand() * playerCCs.length)];
    return COUNTRIES[Math.floor(rand() * COUNTRIES.length)];
  }

  return null;
}

/**
 * Returns country codes for 4-6 railing banners.
 */
export function railingFlags({ venueCC, playerCCs, count = 6 } = {}) {
  const validVenue = COUNTRIES.includes(venueCC) ? venueCC : null;
  const validPlayers = Array.isArray(playerCCs) ? playerCCs.filter(c => COUNTRIES.includes(c)) : [];

  const candidates = [];
  if (validVenue) candidates.push(validVenue);
  for (const p of validPlayers) {
    if (!candidates.includes(p)) candidates.push(p);
  }

  // If no valid venue or player country, pick from known host countries
  if (candidates.length === 0) {
    return ['ES', 'TR', 'AR', 'SE', 'IT', 'QA'].slice(0, count);
  }

  const out = [];
  for (let i = 0; i < count; i++) {
    // Alternate venue and players
    if (validVenue && i % 2 === 0) {
      out.push(validVenue);
    } else if (validPlayers.length > 0) {
      out.push(validPlayers[(i >> 1) % validPlayers.length]);
    } else {
      out.push(validVenue);
    }
  }
  return out;
}

// Y rotation of a spectator card (plane normal +Z) on stand `side` (+1 = x > 0):
// faces the court, turned a little towards the net (z = 0).
export function crowdYaw(px, pz, side) {
  return -side * (Math.PI / 2 + Math.atan2(pz, Math.abs(px)) * 0.18);
}
