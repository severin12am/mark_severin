// Core rules for Rotatris. Pieces fall toward a core; full square rings clear
// and the board can turn. No rendering and no browser APIs live in this file.

export const G = 31;
export const CT = 15;
export const BD = 7;
export const MR = 14;

export const SHAPES = [
  [[0, -1], [0, 0], [0, 1], [0, 2]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, -1], [0, 0], [0, 1], [1, 0]],
  [[0, 0], [0, 1], [1, -1], [1, 0]],
  [[0, -1], [0, 0], [1, 0], [1, 1]],
  [[0, -1], [0, 0], [0, 1], [1, -1]],
  [[0, -1], [0, 0], [0, 1], [1, 1]],
];

export const MODE_MULT = { manual: 1, gravity: 1.5, auto: 1.6 };

const KICKS = [[0, 0], [0, 1], [0, -1], [-1, 0], [1, 0], [0, 2], [0, -2], [-2, 0]];
const NUDGES = [[-1, 0], [-2, 0], [-3, 0], [0, 1], [0, -1], [1, 0], [0, 2], [0, -2]];
const COMBO_WINDOW = 3.4;

export function cheb(r, c) {
  return Math.max(Math.abs(r - CT), Math.abs(c - CT));
}

export function contractFor(index) {
  const table = [
    { kind: "rings", need: 1, reward: 250, label: "Clear 1 ring" },
    { kind: "rings", need: 3, reward: 400, label: "Clear 3 rings" },
    { kind: "score", need: 1500, reward: 350, label: "Score 1,500" },
    { kind: "combo", need: 2, reward: 500, label: "Make a combo of 2" },
    { kind: "level", need: 3, reward: 450, label: "Reach level 3" },
    { kind: "rings", need: 6, reward: 700, label: "Clear 6 rings" },
    { kind: "score", need: 5000, reward: 650, label: "Score 5,000" },
    { kind: "combo", need: 3, reward: 800, label: "Make a combo of 3" },
    { kind: "level", need: 6, reward: 900, label: "Reach level 6" },
  ];
  if (index < table.length) return { ...table[index], index };
  const lap = index - table.length;
  const kind = ["rings", "score", "combo", "level"][lap % 4];
  const step = Math.floor(lap / 4) + 1;
  if (kind === "rings") {
    const need = 8 + step * 2;
    return { kind, need, reward: 800 + step * 150, label: `Clear ${need} rings`, index };
  }
  if (kind === "score") {
    const need = 8000 + step * 2500;
    return { kind, need, reward: 700 + step * 100, label: `Score ${need.toLocaleString("en-US")}`, index };
  }
  if (kind === "combo") {
    const need = Math.min(6, 3 + step);
    return { kind, need, reward: 900 + step * 100, label: `Make a combo of ${need}`, index };
  }
  const need = 6 + step;
  return { kind, need, reward: 900 + step * 100, label: `Reach level ${need}`, index };
}

export function createGame() {
  return {
    mode: "gravity",
    grid: makeGrid(),
    piece: null,
    hold: null,
    holdUsed: false,
    queue: [],
    bag: [],
    score: 0,
    level: 1,
    rings: 0,
    combo: 0,
    maxCombo: 0,
    comboTimer: 0,
    dropInterval: 740,
    lockDelay: 460,
    dropAcc: 0,
    lockAcc: 0,
    soft: false,
    phase: "idle",
    spin: 0,
    clearTimer: 0,
    clearMarks: [],
    practice: false,
    coreCharge: false,
    contractIndex: 0,
    contract: contractFor(0),
    pieceAge: 0,
    events: [],
  };
}

function makeGrid() {
  const grid = [];
  for (let r = 0; r < G; r++) grid.push(new Array(G).fill(null));
  return grid;
}

function cloneShape(id) {
  return SHAPES[id].map(([r, c]) => [r, c]);
}

function refreshSpeeds(game) {
  if (game.practice) {
    game.dropInterval = 980;
    game.lockDelay = 520;
    return;
  }
  const t = Math.min(1, (game.level - 1) / 14);
  const eased = t * t;
  game.dropInterval = Math.round(740 - eased * 580);
  game.lockDelay = Math.max(150, Math.round(460 - (game.level - 1) * 20));
}

function refillBag(game) {
  const bag = [0, 1, 2, 3, 4, 5, 6];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = bag[i];
    bag[i] = bag[j];
    bag[j] = tmp;
  }
  game.bag.push(...bag);
}

function fillQueue(game) {
  while (game.queue.length < 3) {
    if (!game.bag.length) refillBag(game);
    game.queue.push(game.bag.pop());
  }
}

export function collides(game, row, col, cells, grid) {
  const g = grid || game.grid;
  for (let i = 0; i < cells.length; i++) {
    const r = row + cells[i][0];
    const c = col + cells[i][1];
    if (c < 0 || c >= G || r >= G) return true;
    if (r >= 0 && g[r][c]) return true;
  }
  return false;
}

function placePiece(game, id) {
  const cells = cloneShape(id);
  const row = CT - MR;
  const col = CT;
  game.piece = { id, row, col, cells, age: 0 };
  game.pieceAge = 0;
  game.lockAcc = 0;
  game.dropAcc = 0;
  if (collides(game, row, col, cells)) {
    game.piece = null;
    game.phase = "dead";
    game.events.push({ type: "dead" });
    return false;
  }
  return true;
}

function spawn(game) {
  fillQueue(game);
  const id = game.queue.shift();
  fillQueue(game);
  return placePiece(game, id);
}

function spawnHeld(game, id) {
  return placePiece(game, id);
}

export function startRun(game, mode, opts = {}) {
  game.mode = mode === "manual" || mode === "auto" ? mode : "gravity";
  game.grid = makeGrid();
  game.grid[CT][CT] = { id: -1, core: true };
  game.score = 0;
  game.level = 1;
  game.rings = 0;
  game.combo = 0;
  game.maxCombo = 0;
  game.comboTimer = 0;
  game.bag = [];
  game.queue = [];
  game.hold = null;
  game.holdUsed = false;
  game.phase = "fall";
  game.spin = 0;
  game.clearTimer = 0;
  game.clearMarks = [];
  game.soft = false;
  game.practice = !!opts.practice;
  game.coreCharge = !!opts.coreCharge;
  game.contractIndex = 0;
  game.contract = contractFor(0);
  game.piece = null;
  game.pieceAge = 0;
  game.dropAcc = 0;
  game.lockAcc = 0;
  game.events = [];
  refreshSpeeds(game);
  fillQueue(game);
  if (opts.practice) seedPractice(game);
  else spawn(game);
}

function seedPractice(game) {
  const gap = new Set(["13,13", "13,14", "13,15", "13,16"]);
  for (let r = CT - 2; r <= CT + 2; r++) {
    for (let c = CT - 2; c <= CT + 2; c++) {
      if (cheb(r, c) !== 2) continue;
      if (gap.has(`${r},${c}`)) continue;
      game.grid[r][c] = { id: (r * 3 + c) % 7 };
    }
  }
  game.piece = { id: 0, row: 6, col: 15, cells: cloneShape(0), age: 0 };
  game.pieceAge = 0;
  game.practice = true;
  refreshSpeeds(game);
}

function canControl(game) {
  return game.phase === "fall" && game.spin <= 0 && !!game.piece;
}

export function setSoft(game, on) {
  game.soft = !!on;
}

export function tryMove(game, dc, dr = 0) {
  if (!canControl(game)) return false;
  const row = game.piece.row + dr;
  const col = game.piece.col + dc;
  if (collides(game, row, col, game.piece.cells)) return false;
  game.piece.row = row;
  game.piece.col = col;
  game.lockAcc = 0;
  if (dc) game.events.push({ type: "move" });
  return true;
}

export function tryRotate(game, dir) {
  if (!canControl(game) || game.piece.id === 1) return false;
  const cells = game.piece.cells;
  const next = dir === 1
    ? cells.map(([r, c]) => [c, -r])
    : cells.map(([r, c]) => [-c, r]);
  for (let i = 0; i < KICKS.length; i++) {
    const row = game.piece.row + KICKS[i][0];
    const col = game.piece.col + KICKS[i][1];
    if (!collides(game, row, col, next)) {
      game.piece.row = row;
      game.piece.col = col;
      game.piece.cells = next;
      game.lockAcc = 0;
      game.events.push({ type: "rotate" });
      return true;
    }
  }
  return false;
}

export function tryHold(game) {
  if (!canControl(game) || game.holdUsed) return false;
  const current = game.piece.id;
  if (game.hold == null) {
    game.hold = current;
    game.holdUsed = true;
    const ok = spawn(game);
    game.holdUsed = true;
    if (ok) game.events.push({ type: "hold" });
    return ok;
  }
  const swapped = game.hold;
  game.hold = current;
  game.holdUsed = true;
  const ok = spawnHeld(game, swapped);
  if (ok) game.events.push({ type: "hold" });
  return ok;
}

export function ghostRow(game) {
  if (!game.piece) return 0;
  let row = game.piece.row;
  while (!collides(game, row + 1, game.piece.col, game.piece.cells)) row++;
  return row;
}

export function hardDrop(game) {
  if (!canControl(game)) return false;
  let n = 0;
  while (!collides(game, game.piece.row + 1, game.piece.col, game.piece.cells)) {
    game.piece.row++;
    n++;
  }
  game.score += n * 2;
  lockPiece(game, n);
  return true;
}

function lockPiece(game, dropDist) {
  const piece = game.piece;
  if (!piece) return;
  let dead = false;
  const cells = [];
  for (let i = 0; i < piece.cells.length; i++) {
    const r = piece.row + piece.cells[i][0];
    const c = piece.col + piece.cells[i][1];
    if (r < 0 || r >= G || c < 0 || c >= G) {
      dead = true;
      continue;
    }
    game.grid[r][c] = { id: piece.id };
    cells.push({ r, c, id: piece.id });
    if (cheb(r, c) > BD) dead = true;
  }
  game.piece = null;
  game.holdUsed = false;
  if (dead) {
    game.phase = "dead";
    game.events.push({ type: "lock", cells, dropDist: dropDist || 0, dead: true });
    game.events.push({ type: "dead" });
    return;
  }
  game.score += Math.round(10 * game.level * MODE_MULT[game.mode]);
  game.events.push({ type: "lock", cells, dropDist: dropDist || 0, dead: false });
  const found = fullRingDistances(game.grid);
  if (found.length) {
    game.phase = "clear";
    game.clearTimer = 0.28;
    game.clearMarks = found.flatMap((d) => ringCells(game.grid, d));
    game.events.push({ type: "clear-start", cells: game.clearMarks.slice() });
    return;
  }
  finishLock(game);
}

function fullRingDistances(grid) {
  const found = [];
  for (let d = 1; d <= BD; d++) if (isRingFull(grid, d)) found.push(d);
  return found;
}

export function isRingFull(grid, d) {
  for (let r = CT - d; r <= CT + d; r++) {
    for (let c = CT - d; c <= CT + d; c++) {
      if (cheb(r, c) !== d) continue;
      if (r < 0 || r >= G || c < 0 || c >= G || !grid[r][c]) return false;
    }
  }
  return true;
}

function ringCells(grid, d) {
  const cells = [];
  for (let r = CT - d; r <= CT + d; r++) {
    for (let c = CT - d; c <= CT + d; c++) {
      if (cheb(r, c) !== d) continue;
      if (grid[r][c]) cells.push({ r, c, id: grid[r][c].id });
    }
  }
  return cells;
}

function clearRing(grid, d) {
  for (let r = CT - d; r <= CT + d; r++) {
    for (let c = CT - d; c <= CT + d; c++) {
      if (cheb(r, c) !== d) continue;
      if (r >= 0 && r < G && c >= 0 && c < G && grid[r][c] && !(r === CT && c === CT)) grid[r][c] = null;
    }
  }
  for (let dist = d + 1; dist <= BD + 2; dist++) {
    for (let r = CT - dist; r <= CT + dist; r++) {
      for (let c = CT - dist; c <= CT + dist; c++) {
        if (cheb(r, c) !== dist) continue;
        if (r < 0 || r >= G || c < 0 || c >= G || !grid[r][c]) continue;
        const dr = r - CT;
        const dc = c - CT;
        const ad = Math.abs(dr);
        const ac = Math.abs(dc);
        let nr = r;
        let nc = c;
        if (ad > ac) nr -= dr > 0 ? 1 : -1;
        else if (ac > ad) nc -= dc > 0 ? 1 : -1;
        else {
          nr -= dr > 0 ? 1 : -1;
          nc -= dc > 0 ? 1 : -1;
        }
        if (nr >= 0 && nr < G && nc >= 0 && nc < G && !grid[nr][nc]) {
          grid[nr][nc] = grid[r][c];
          grid[r][c] = null;
        }
      }
    }
  }
}

function onRing(game, d, cells) {
  if (game.comboTimer > 0) game.combo += 1;
  else game.combo = 1;
  game.comboTimer = COMBO_WINDOW;
  if (game.combo > game.maxCombo) game.maxCombo = game.combo;
  const mult = (1 + (game.combo - 1) * 0.5) * MODE_MULT[game.mode];
  let pts = Math.round(100 * d * game.level * mult);
  let charged = false;
  if (game.coreCharge) {
    pts *= 3;
    game.coreCharge = false;
    charged = true;
  }
  game.score += pts;
  game.rings += 1;
  const newLevel = 1 + Math.floor(game.rings / 3);
  if (newLevel > game.level) {
    game.level = newLevel;
    refreshSpeeds(game);
    game.events.push({ type: "level", level: newLevel });
  }
  game.events.push({ type: "ring", d, pts, combo: game.combo, charged, cells: cells || [] });
  checkContracts(game);
}

function checkContracts(game) {
  for (let n = 0; n < 4; n++) {
    const c = game.contract;
    let cur = 0;
    if (c.kind === "rings") cur = game.rings;
    else if (c.kind === "score") cur = game.score;
    else if (c.kind === "combo") cur = game.maxCombo;
    else cur = game.level;
    if (cur < c.need) break;
    game.score += c.reward;
    game.events.push({ type: "contract", label: c.label, reward: c.reward });
    game.contractIndex += 1;
    game.contract = contractFor(game.contractIndex);
  }
}

export function contractProgress(game) {
  const c = game.contract;
  let cur = 0;
  if (!c) return { cur: 0, need: 1, label: "", ratio: 0 };
  if (c.kind === "rings") cur = game.rings;
  else if (c.kind === "score") cur = game.score;
  else if (c.kind === "combo") cur = game.maxCombo;
  else cur = game.level;
  return { cur, need: c.need, label: c.label, ratio: Math.max(0, Math.min(1, cur / c.need)) };
}

export function resolveRings(game) {
  const waves = [];
  let guard = 0;
  for (let d = 1; d <= BD; d++) {
    if (!isRingFull(game.grid, d)) continue;
    const cells = ringCells(game.grid, d);
    clearRing(game.grid, d);
    onRing(game, d, cells);
    waves.push({ d, cells });
    if (++guard > 40) break;
    d--;
  }
  return waves;
}

function finishClear(game) {
  const wasPractice = game.practice;
  game.clearMarks = [];
  game.phase = "fall";
  resolveRings(game);
  if (wasPractice && game.rings > 0) {
    game.practice = false;
    refreshSpeeds(game);
    game.events.push({ type: "practice-cleared" });
  }
  finishLock(game);
}

function finishLock(game) {
  spawn(game);
  if (game.phase === "dead") return;
  if (game.practice) return;
  if (game.mode === "gravity") {
    const dir = gravityDirection(game);
    if (dir) rotateStruct(game, dir);
  } else if (game.mode === "auto") {
    rotateStruct(game, 1);
  }
}

export function gravityDirection(game) {
  let sumR = 0;
  let sumC = 0;
  let count = 0;
  for (let r = 0; r < G; r++) {
    for (let c = 0; c < G; c++) {
      if (!game.grid[r][c] || (r === CT && c === CT)) continue;
      sumR += r - CT;
      sumC += c - CT;
      count++;
    }
  }
  if (!count) return 0;
  const dr = sumR / count;
  const dc = sumC / count;
  let best = dr;
  let dir = 0;
  if (dc > best + 0.15) {
    best = dc;
    dir = 1;
  }
  if (-dc > best + 0.15) dir = -1;
  return dir;
}

function rotateStruct(game, dir) {
  if (game.phase !== "fall" || !game.piece) return false;
  const next = makeGrid();
  for (let r = 0; r < G; r++) {
    for (let c = 0; c < G; c++) {
      if (!game.grid[r][c]) continue;
      const nr = dir === 1 ? c : G - 1 - c;
      const nc = dir === 1 ? G - 1 - r : r;
      next[nr][nc] = game.grid[r][c];
    }
  }
  if (collides(game, game.piece.row, game.piece.col, game.piece.cells, next)) {
    let nudged = false;
    for (let i = 0; i < NUDGES.length; i++) {
      const row = game.piece.row + NUDGES[i][0];
      const col = game.piece.col + NUDGES[i][1];
      if (!collides(game, row, col, game.piece.cells, next)) {
        game.piece.row = row;
        game.piece.col = col;
        nudged = true;
        break;
      }
    }
    if (!nudged) return false;
  }
  game.grid = next;
  game.spin = 0.22;
  game.spinDir = dir;
  game.events.push({ type: "struct", dir });
  return true;
}

export function tryStruct(game, dir) {
  if (game.mode !== "manual" || !canControl(game)) return false;
  return rotateStruct(game, dir);
}

export function tick(game, dt) {
  if (dt > 0.05) dt = 0.05;
  if (game.comboTimer > 0) game.comboTimer = Math.max(0, game.comboTimer - dt);
  if (game.phase === "clear") {
    game.clearTimer -= dt;
    if (game.clearTimer <= 0) finishClear(game);
    return;
  }
  if (game.phase !== "fall" || !game.piece) return;
  game.pieceAge += dt;
  game.piece.age = game.pieceAge;
  if (game.spin > 0) {
    game.spin = Math.max(0, game.spin - dt);
    return;
  }
  const iv = game.soft ? Math.max(30, game.dropInterval / 15) : game.dropInterval;
  game.dropAcc += dt * 1000;
  let guard = 0;
  while (game.dropAcc >= iv && game.phase === "fall" && game.piece && guard++ < 40) {
    game.dropAcc -= iv;
    if (!collides(game, game.piece.row + 1, game.piece.col, game.piece.cells)) {
      game.piece.row++;
      game.lockAcc = 0;
      if (game.soft) game.score += 1;
    } else {
      game.lockAcc += iv;
      if (game.lockAcc >= game.lockDelay) {
        lockPiece(game, 0);
        break;
      }
    }
  }
}

export function takeEvents(game) {
  const ev = game.events;
  game.events = [];
  return ev;
}
