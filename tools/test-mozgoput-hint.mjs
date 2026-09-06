#!/usr/bin/env node
/**
 * Unit tests for Mozgoput Hint resolution.
 * Mirrors the in-game helpers in games/Mozgoput/index.html.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadGraph(file) {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  const ctx = {};
  vm.runInNewContext(code + '\nthis.GRAPH_DATA = GRAPH_DATA;', ctx);
  return ctx.GRAPH_DATA;
}

function makeHelpers(BI) {
  const G = {
    startWord: '',
    goalWord: '',
    bestPathCache: null,
    p: [{ chain: [] }],
    currentPlayer: 0,
  };
  function currentP() { return G.p[G.currentPlayer]; }
  function currentWord() {
    const p = currentP();
    return p.chain.length ? p.chain[p.chain.length - 1] : G.startWord;
  }
  function neighborKeys(word) {
    const nb = BI[word];
    if (!nb) return [];
    return Array.isArray(nb) ? nb.slice() : Object.keys(nb);
  }
  function findBestPath(a, b) {
    if (a === b) return [a];
    const parent = new Map();
    parent.set(a, null);
    const queue = [a];
    while (queue.length) {
      const cur = queue.shift();
      const nb = BI[cur] || {};
      for (const nx of Object.keys(nb)) {
        if (!parent.has(nx)) {
          parent.set(nx, cur);
          if (nx === b) {
            const path = [];
            let c = b;
            while (c) { path.unshift(c); c = parent.get(c); }
            return path;
          }
          queue.push(nx);
        }
      }
    }
    return null;
  }
  function stitchPathCache(fromPath) {
    const p = currentP();
    G.bestPathCache = [G.startWord].concat(p.chain).concat(fromPath.slice(1));
  }
  function resolveHintWord() {
    const cur = currentWord();
    const p = currentP();
    const used = new Set(p.chain);
    const path = findBestPath(cur, G.goalWord);
    if (path && path.length >= 2) {
      const next = path[1];
      if (next && !used.has(next)) {
        stitchPathCache(path);
        return next;
      }
    }
    const nbs = neighborKeys(cur).filter((w) => w !== cur && !used.has(w));
    for (const w of nbs) {
      const rest = findBestPath(w, G.goalWord);
      if (rest) {
        stitchPathCache([cur, w].concat(rest[0] === w ? rest.slice(1) : rest));
        return w;
      }
    }
    return null;
  }
  function replaceIndexForHint(batch, cur) {
    const nb = new Set(neighborKeys(cur));
    for (let i = batch.length - 1; i >= 0; i--) {
      if (!nb.has(batch[i]) && batch[i] !== G.goalWord) return i;
    }
    return batch.length ? batch.length - 1 : 0;
  }
  return { G, currentWord, findBestPath, resolveHintWord, neighborKeys, replaceIndexForHint };
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL:', msg);
  } else {
    console.log('ok  ', msg);
  }
}

const tiny = {
  start: { a: 1, detour: 1, dead: 1 },
  a: { goal: 1, start: 1 },
  detour: { goal: 1, start: 1 },
  dead: { start: 1 },
  island: { rock: 1 },
  rock: { island: 1 },
  goal: { a: 1, detour: 1 },
};

const h = makeHelpers(tiny);
h.G.startWord = 'start';
h.G.goalWord = 'goal';
h.G.p[0].chain = [];

const fromStart = h.findBestPath('start', 'goal');
assert(fromStart && fromStart[0] === 'start' && fromStart[fromStart.length - 1] === 'goal',
  'findBestPath(start, goal) is a full path');
assert(fromStart[1] === 'a', 'BFS next step from start is the first neighbor on a shortest path');

const hint0 = h.resolveHintWord();
assert(hint0 === fromStart[1], 'hint from start is findBestPath(current, goal)[1]');
assert(h.G.bestPathCache[0] === 'start' && h.G.bestPathCache[h.G.bestPathCache.length - 1] === 'goal',
  'bestPathCache is stitched start→goal');
assert(h.neighborKeys('start').includes(hint0), 'hinted word is a neighbor of current');

// Off-path pick: player chose "detour" instead of optimal "a"
h.G.p[0].chain = ['detour'];
h.G.bestPathCache = ['start', 'a', 'goal']; // stale cache like the old bug
const hint1 = h.resolveHintWord();
assert(hint1 === 'goal', 'after a detour, hint is recomputed from current (detour→goal)');
assert(h.neighborKeys('detour').includes(hint1), 'post-detour hint is a neighbor of current');
assert(hint1 !== 'a', 'stale cache word "a" is not hinted after leaving that path');
assert(h.G.bestPathCache.join(',') === 'start,detour,goal',
  'cache updates to the player path plus remaining optimal');

// Next-optimal already used: BFS from start would prefer "a", but it is in the chain
h.G.p[0].chain = ['a'];
h.G.startWord = 'start';
// current is "a"; path from a is [a, goal] — goal is unused, so hint is goal
const hintFromA = h.resolveHintWord();
assert(hintFromA === 'goal', 'from optimal next word, hint is the remaining step');

// Isolated island: no path and no neighbor that can reach the goal
h.G.startWord = 'island';
h.G.goalWord = 'goal';
h.G.p[0].chain = [];
const hintIsland = h.resolveHintWord();
assert(hintIsland === null, 'island with no route to goal returns null (UI must show a message)');

// Batch insert: replace a decoy, not a real neighbor
h.G.startWord = 'start';
h.G.goalWord = 'goal';
h.G.p[0].chain = [];
const batch = ['decoy1', 'a', 'decoy2'];
const existing = batch.indexOf('a');
assert(existing === 1, 'hint already in batch keeps its index');
const replaceAt = h.replaceIndexForHint(['decoy1', 'decoy2'], 'start');
assert(replaceAt === 1, 'missing hint replaces a trailing decoy');

// Real English graph smoke test
const BI = loadGraph('games/Mozgoput/graph.js');
const real = makeHelpers(BI);
const sampleStart = 'abbey';
const sampleGoal = 'church';
assert(!!BI[sampleStart] && !!BI[sampleGoal], 'sample English pair exists in GRAPH_DATA');
real.G.startWord = sampleStart;
real.G.goalWord = sampleGoal;
real.G.p[0].chain = [];
const realPath = real.findBestPath(sampleStart, sampleGoal);
assert(realPath && realPath.length >= 2, 'real graph finds abbey→church');
const realHint = real.resolveHintWord();
assert(realHint === realPath[1], 'real-graph hint matches path[1] from current');
assert(real.neighborKeys(sampleStart).includes(realHint), 'real-graph hint is a neighbor');

// Off-path on the real graph: pick a neighbor that is not path[1]
const startNbs = real.neighborKeys(sampleStart).filter((w) => w !== realHint);
const off = startNbs.find((w) => real.findBestPath(w, sampleGoal));
if (off) {
  real.G.p[0].chain = [off];
  real.G.bestPathCache = realPath;
  const offHint = real.resolveHintWord();
  assert(!!offHint, 'after an off-path English pick, hint still returns a word');
  assert(real.neighborKeys(off).includes(offHint), 'off-path English hint is a neighbor of the new current');
} else {
  console.log('ok   (no alternate neighbor that still reaches church — skipped)');
}

if (failed) {
  console.error('\n' + failed + ' test(s) failed');
  process.exit(1);
}
console.log('\nAll Mozgoput hint tests passed');
