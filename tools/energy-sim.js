// Headless energy simulator for Padel AI matches.
// Evaluates energy drain and recovery across AI levels (rookie, club, pro, legend)
// in singles (players: 2) and doubles (players: 4).
// Usage: node tools/energy-sim.js [--matches 20] [--level all|club|...] [--preset baseline|candA|candB|candC] [--compare]

function createLCG(seed = 12345) {
  let s = (seed >>> 0) || 1;
  return function() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Initial seed setup before dynamic module loading
let globalLcg = createLCG(20261108);
Math.random = () => globalLcg();

const { newWorld, stepWorld, ENERGY } = await import('../src/game.js');
const { aiInput } = await import('../src/ai.js');

export const PRESETS = {
  baseline: {
    name: 'Taban Değerler (Mevcut ENERGY)',
    desc: 'src/game.js içindeki mevcut oyun değerleri',
    config: {
      run: 0.012, stroke: 0.006, smash: 0.012, rallyFrom: 6, rallyStep: 0.08, rallyMax: 1.5,
      rest: 0.025, drink: 0.3, slow: 0.4, miss: 1.0, soft: 0.15, reach: 0.2,
    },
  },
  candA: {
    name: 'Aday 1 (candA) — Dengeli Hibrit',
    desc: 'Hafif ralli çarpanı, dengeli koşu/vuruş eforu, 0.20 mola içeceği',
    config: {
      run: 0.014, stroke: 0.008, smash: 0.009, rallyFrom: 8, rallyStep: 0.015, rallyMax: 1.15,
      rest: 0.025, drink: 0.20, slow: 0.4, miss: 1.0, soft: 0.15, reach: 0.2,
    },
  },
  candB: {
    name: 'Aday 2 (candB) — Efsane Dayanıklılığı & Düşük Çarpan',
    desc: 'Uzun rallilerde aşırı çarpanı engelleyen, efsaneyi 0.55-0.65 bandında tutan koruma',
    config: {
      run: 0.012, stroke: 0.008, smash: 0.008, rallyFrom: 10, rallyStep: 0.003, rallyMax: 1.05,
      rest: 0.028, drink: 0.18, slow: 0.4, miss: 1.0, soft: 0.15, reach: 0.2,
    },
  },
  candC: {
    name: 'Aday 3 (candC) — Kulüp Yorgunluğu Odaklı',
    desc: 'Vuruş ve koşu eforunu yükseltip dinlenmeyi hafif kısan aktif model',
    config: {
      run: 0.015, stroke: 0.010, smash: 0.010, rallyFrom: 8, rallyStep: 0.010, rallyMax: 1.12,
      rest: 0.022, drink: 0.16, slow: 0.4, miss: 1.0, soft: 0.15, reach: 0.2,
    },
  },
  candD: {
    name: 'Aday 4 (candD) — Optimize Edilmiş Denge (Öneri Adayı)',
    desc: 'Koşu eforu hafif düşük (efsane koruması), vuruş eforu yüksek, ralli çarpanı tavanı 1.08',
    config: {
      run: 0.009, stroke: 0.012, smash: 0.010, rallyFrom: 9, rallyStep: 0.004, rallyMax: 1.08,
      rest: 0.028, drink: 0.15, slow: 0.4, miss: 1.0, soft: 0.15, reach: 0.2,
    },
  },
};

export function simulateMatches({
  level = 'club',
  matches = 20, // total matches: half singles, half doubles
  seed = 42,
  energyConfig = null,
} = {}) {
  const origEnergy = { ...ENERGY };
  if (energyConfig) {
    Object.assign(ENERGY, energyConfig);
  }

  globalLcg = createLCG(seed);

  try {
    const singlesMatches = Math.floor(matches / 2);
    const doublesMatches = matches - singlesMatches;
    const matchQueue = [
      ...Array(singlesMatches).fill(2),
      ...Array(doublesMatches).fill(4),
    ];

    const dt = 1 / 60;
    const setEndEnergies = [];
    let totalRalliesSum = 0;
    let totalPoints = 0;
    let totalPlayerTimeSec = 0;
    let totalTimeUnder05Sec = 0;
    let totalPlayersCount = 0;
    let droppedUnder03Count = 0;

    for (let mIdx = 0; mIdx < matchQueue.length; mIdx++) {
      const numPlayers = matchQueue[mIdx];
      let w = newWorld({ players: numPlayers, match: { sets: 1, goldenPoint: true } });
      const activePids = w.players.filter(p => p.active).map(p => p.id);
      totalPlayersCount += activePids.length;

      const playerEverUnder03 = new Set();
      let matchPointStartTime = w.t;
      let pointsInMatch = 0;

      while (w.state !== 'over' && pointsInMatch < 150) {
        const inputs = {};
        for (const pid of activePids) {
          inputs[pid] = aiInput(w, pid, level);
        }

        stepWorld(w, inputs, dt);

        // Track energy per step for all active players
        for (const pid of activePids) {
          const e = w.players[pid].energy;
          totalPlayerTimeSec += dt;
          if (e < 0.5) totalTimeUnder05Sec += dt;
          if (e < 0.3) playerEverUnder03.add(pid);
        }

        // Process points
        for (const e of w.events) {
          if (e.type === 'point') {
            pointsInMatch++;
            totalPoints++;
            totalRalliesSum += e.rally || 0;
            matchPointStartTime = w.t;
          }
        }
        w.events.length = 0;

        // Anti-stuck safeguard (timeout > 60 sim seconds in a single point)
        if (w.t - matchPointStartTime > 60) {
          totalPoints++;
          totalRalliesSum += w.rally || 0;
          pointsInMatch++;
          break;
        }
      }

      // Record set end energies
      for (const pid of activePids) {
        setEndEnergies.push(w.players[pid].energy);
      }
      droppedUnder03Count += playerEverUnder03.size;
    }

    const avgSetEndEnergy = setEndEnergies.reduce((a, b) => a + b, 0) / (setEndEnergies.length || 1);
    const minSetEndEnergy = Math.min(...setEndEnergies);
    const pctTimeUnder05 = (totalTimeUnder05Sec / (totalPlayerTimeSec || 1)) * 100;
    const pctPlayersUnder03 = (droppedUnder03Count / (totalPlayersCount || 1)) * 100;
    const avgRally = totalRalliesSum / (totalPoints || 1);

    return {
      level,
      matches,
      singlesMatches,
      doublesMatches,
      avgSetEndEnergy: +avgSetEndEnergy.toFixed(3),
      minSetEndEnergy: +minSetEndEnergy.toFixed(3),
      pctTimeUnder05: +pctTimeUnder05.toFixed(1),
      pctPlayersUnder03: +pctPlayersUnder03.toFixed(1),
      avgRally: +avgRally.toFixed(2),
      totalPoints,
    };
  } finally {
    Object.assign(ENERGY, origEnergy);
  }
}

function printTable(presetKey, presetData, results, elapsed) {
  console.log(`\n### ${presetData.name}`);
  console.log(`> ${presetData.desc}\n`);
  console.log(`| AI Seviyesi | Maç (Ç/T) | Set Sonu Ort. Enerji | Set Sonu Min. Enerji | Süre (< 0.5) % | Oyuncu (< 0.3) % | Ort. Ralli |`);
  console.log(`|---|:---:|:---:|:---:|:---:|:---:|:---:|`);
  for (const r of results) {
    const lvlName = r.level.toUpperCase();
    const matchStr = `${r.matches} (${r.doublesMatches}Ç + ${r.singlesMatches}T)`;
    console.log(
      `| **${lvlName}** | ${matchStr} | ${r.avgSetEndEnergy.toFixed(3)} | ${r.minSetEndEnergy.toFixed(3)} | ` +
      `${r.pctTimeUnder05.toFixed(1)}% | ${r.pctPlayersUnder03.toFixed(1)}% | ${r.avgRally.toFixed(2)} |`
    );
  }
  console.log(`\nParametreler:\n\`\`\`js\nENERGY = ${JSON.stringify(presetData.config)}\n\`\`\``);
  console.log(`Süre: ${elapsed} s\n`);
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  let matches = 20;
  let levelArg = 'all';
  let presetArg = 'baseline';
  let seedArg = 20261108;
  let compareMode = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '--matches' || a === '-m') && args[i + 1]) matches = parseInt(args[++i], 10);
    else if (a.startsWith('--matches=')) matches = parseInt(a.split('=')[1], 10);
    else if ((a === '--level' || a === '-l') && args[i + 1]) levelArg = args[++i];
    else if (a.startsWith('--level=')) levelArg = a.split('=')[1];
    else if ((a === '--preset' || a === '-p') && args[i + 1]) presetArg = args[++i];
    else if (a.startsWith('--preset=')) presetArg = a.split('=')[1];
    else if ((a === '--seed' || a === '-s') && args[i + 1]) seedArg = parseInt(args[++i], 10);
    else if (a.startsWith('--seed=')) seedArg = parseInt(a.split('=')[1], 10);
    else if (a === '--compare') compareMode = true;
  }

  const levels = levelArg === 'all' ? ['rookie', 'club', 'pro', 'legend'] : [levelArg];

  if (compareMode) {
    console.log(`============================================================`);
    console.log(`PADEL ENERJİ SİMÜLATÖRÜ: TÜM ADAYLARIN KARŞILAŞTIRMASI`);
    console.log(`Seviyeler: ${levels.join(', ')} | Her seviye için ${matches} Maç (yarı tekler, yarı çiftler)`);
    console.log(`Seed: ${seedArg}`);
    console.log(`============================================================`);

    for (const [key, preset] of Object.entries(PRESETS)) {
      const startT = Date.now();
      const results = [];
      for (const lvl of levels) {
        const res = simulateMatches({ level: lvl, matches, energyConfig: preset.config, seed: seedArg });
        results.push(res);
      }
      const elapsed = ((Date.now() - startT) / 1000).toFixed(1);
      printTable(key, preset, results, elapsed);
    }
  } else {
    const preset = PRESETS[presetArg] || PRESETS.baseline;
    console.log(`============================================================`);
    console.log(`PADEL ENERJİ SİMÜLATÖRÜ: ${preset.name}`);
    console.log(`Seviyeler: ${levels.join(', ')} | Her seviye için ${matches} Maç (yarı tekler, yarı çiftler)`);
    console.log(`Seed: ${seedArg}`);
    console.log(`============================================================`);

    const startT = Date.now();
    const results = [];
    for (const lvl of levels) {
      const res = simulateMatches({ level: lvl, matches, energyConfig: preset.config, seed: seedArg });
      results.push(res);
    }
    const elapsed = ((Date.now() - startT) / 1000).toFixed(1);
    printTable(presetArg, preset, results, elapsed);
  }
}
