// Headless balance simulator for Padel AI matches.
// Usage: node tools/sim.js [points=500] [level=club] [seed=12345]
//        node tools/sim.js --all [points=300]
import { newWorld, stepWorld } from '../src/game.js';
import { aiInput } from '../src/ai.js';

function createLCG(seed = 12345) {
  let s = (seed >>> 0) || 1;
  return function() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function runSimulation(targetPoints = 500, level = 'club', seed = 12345) {
  const origRandom = Math.random;
  const lcg = createLCG(seed);
  Math.random = lcg;

  try {
    const w = newWorld({ players: 4 });
    const dt = 1 / 60;
    const stats = {
      level,
      targetPoints,
      pointsPlayed: 0,
      t0Wins: 0,
      t1Wins: 0,
      stuckPoints: 0,
      rallies: [],
      whyDistribution: {},
      shots: {},
      totalMistakes: 0,
      totalHits: 0,
      faultCount: 0,
      doubleFaultCount: 0,
      letCount: 0,
      servesCount: 0,
    };

    let prevPointScore = 0;
    let pointStartTime = 0;

    while (stats.pointsPlayed < targetPoints) {
      const inputs = {};
      for (let i = 0; i < 4; i++) {
        inputs[i] = aiInput(w, i, level);
      }

      stepWorld(w, inputs, dt);

      // Process game events
      for (const e of w.events) {
        if (e.type === 'hit') {
          stats.totalHits++;
          stats.shots[e.shot] = (stats.shots[e.shot] || 0) + 1;
          if (e.shot === 'serve') stats.servesCount++;
          if (e.mistake) stats.totalMistakes++;
        } else if (e.type === 'fault') {
          stats.faultCount++;
          if (e.why === 'double fault') stats.doubleFaultCount++;
        } else if (e.type === 'let') {
          stats.letCount++;
        } else if (e.type === 'point') {
          stats.pointsPlayed++;
          stats.rallies.push(e.rally);
          const why = e.why || 'unknown';
          stats.whyDistribution[why] = (stats.whyDistribution[why] || 0) + 1;
          if (e.team === 0) stats.t0Wins++;
          else stats.t1Wins++;
          pointStartTime = w.t;
        }
      }
      w.events.length = 0;

      // Stuck detection: > 60 sim seconds in single point
      if (w.t - pointStartTime > 60) {
        stats.stuckPoints++;
        stats.pointsPlayed++;
        stats.rallies.push(w.rally);
        stats.whyDistribution['stuck (timeout > 60s)'] = (stats.whyDistribution['stuck (timeout > 60s)'] || 0) + 1;
        // Force reset
        w.state = 'serve';
        w.match.rally.phase = 'serve';
        pointStartTime = w.t;
      }
    }

    // Calculate aggregated metrics
    const sortedRallies = [...stats.rallies].sort((a, b) => a - b);
    const avgRally = sortedRallies.reduce((a, b) => a + b, 0) / (sortedRallies.length || 1);
    const medianRally = sortedRallies[Math.floor(sortedRallies.length / 2)] || 0;
    const maxRally = sortedRallies[sortedRallies.length - 1] || 0;

    return {
      level,
      pointsPlayed: stats.pointsPlayed,
      score: [stats.t0Wins, stats.t1Wins],
      t0WinRatio: (stats.t0Wins / stats.pointsPlayed).toFixed(3),
      stuckPoints: stats.stuckPoints,
      rally: {
        avg: avgRally.toFixed(2),
        median: medianRally,
        max: maxRally,
      },
      why: stats.whyDistribution,
      shots: stats.shots,
      mistakeRate: stats.totalHits ? (stats.totalMistakes / stats.totalHits).toFixed(4) : 0,
      serves: {
        total: stats.servesCount,
        faultRate: stats.servesCount ? (stats.faultCount / stats.servesCount).toFixed(4) : 0,
        doubleFaultRate: stats.servesCount ? (stats.doubleFaultCount / stats.servesCount).toFixed(4) : 0,
        letRate: stats.servesCount ? (stats.letCount / stats.servesCount).toFixed(4) : 0,
      },
    };
  } finally {
    Math.random = origRandom;
  }
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('sim.js')) {
  const args = process.argv.slice(2);
  const runAll = args.includes('--all');

  if (runAll) {
    const pts = parseInt(args.find(a => a.startsWith('--points='))?.split('=')[1] || '300', 10);
    const levels = ['rookie', 'club', 'pro', 'legend'];
    console.log(`=== PADEL SIMULATOR: ALL LEVELS (${pts} points each) ===\n`);
    for (const lvl of levels) {
      const res = runSimulation(pts, lvl);
      console.log(`--- Level: ${lvl.toUpperCase()} ---`);
      console.log(`T0/T1 Score: ${res.score[0]} - ${res.score[1]} (T0 Ratio: ${res.t0WinRatio})`);
      console.log(`Rally (Avg/Med/Max): ${res.rally.avg} / ${res.rally.median} / ${res.rally.max}`);
      console.log(`Serves: Fault: ${res.serves.faultRate}, Double Fault: ${res.serves.doubleFaultRate}, Let: ${res.serves.letRate}`);
      console.log(`Mistake Rate: ${res.mistakeRate}`);
      console.log(`Why:`, res.why);
      console.log(`Shots:`, res.shots);
      console.log();
    }
  } else {
    const targetPoints = parseInt(args[0] || '500', 10);
    const level = args[1] || 'club';
    const seed = parseInt(args[2] || '12345', 10);
    console.log(`Running Padel simulation: ${targetPoints} points, level=${level}, seed=${seed}...`);
    const res = runSimulation(targetPoints, level, seed);
    console.log(JSON.stringify(res, null, 2));
  }
}
