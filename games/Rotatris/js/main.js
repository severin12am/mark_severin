import {
  createGame, startRun, tick, takeEvents, tryMove, tryRotate, tryHold,
  tryStruct, hardDrop, setSoft, contractProgress,
} from "./logic.js";
import { createView } from "./render.js";
import { createAudio } from "./audio.js";

const $ = (id) => document.getElementById(id);
const SUPPORTED_LOCALES = { en: true };
const LEVELS = ["Spark", "Kindling", "Lantern", "Hearth", "Beacon", "Flare", "Furnace", "Starwell", "Nova", "Crown", "Inferno"];
const BLURB = {
  manual: "You turn the whole board with A and S, lining the pieces up yourself.",
  gravity: "After each piece, the board tips toward whichever side is heavier.",
  auto: "The board turns a quarter-turn on its own after every piece.",
};
const HINT = {
  manual: "Arrows move · Z / X rotate · A / S turn the board · C hold · Up drops · P pauses",
  gravity: "Arrows move · Z / X rotate · The board tips by itself · C hold · Up drops · P pauses",
  auto: "Arrows move · Z / X rotate · The board turns after each piece · C hold · Up drops · P pauses",
};
const SAVE_KEYS = ["best_manual", "best_gravity", "best_auto", "best_combo", "contracts", "tutorial_seen", "muted", "volume", "core_charge", "runs"];
const TILE = {
  ".": "",
  "*": "core",
  "0": "t0", "1": "t1", "2": "t2", "3": "t3", "4": "t4", "5": "t5", "6": "t6",
};

const save = {
  best_manual: 0,
  best_gravity: 0,
  best_auto: 0,
  best_combo: 0,
  contracts: 0,
  tutorial_seen: false,
  muted: false,
  volume: 85,
  core_charge: false,
  runs: 0,
};

const game = createGame();
const view = createView($("view"));
const audio = createAudio();
const frame = $("frame");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let bridge = null;
let rewardSupported = false;
let screen = "loading";
let modal = null;
let userPaused = false;
let hostPaused = false;
let selectedMode = "gravity";
let adBusy = false;
let readySent = false;
let ending = false;
let coachUntil = 0;
let howtoPage = 0;
const particles = [];
const popups = [];
let shakeX = 0;
let shakeY = 0;
let levelFlash = 0;
const keys = new Set();
const das = { ArrowLeft: 0, ArrowRight: 0 };
const touchActs = new Set();
const touchTime = { left: 0, right: 0 };
let swipe = null;

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function flag(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}
function fmt(n) {
  return Math.max(0, Math.floor(n)).toLocaleString("en-US");
}
function levelName(level) {
  return LEVELS[Math.min(LEVELS.length - 1, Math.max(0, level - 1))];
}
function resolveLocale(code) {
  const short = String(code || "en").toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LOCALES[short] ? short : "en";
}
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function needsTouch() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return coarse || window.innerWidth < 760;
}
function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}
function show(el, on) {
  if (!el) return;
  el.classList.toggle("is-hidden", !on);
}

function send(message, data) {
  if (!bridge || !bridge.platform || typeof bridge.platform.sendMessage !== "function") return;
  try {
    const ret = data ? bridge.platform.sendMessage(message, data) : bridge.platform.sendMessage(message);
    if (ret && typeof ret.catch === "function") ret.catch(() => {});
  } catch (e) { /* the platform may not relay this message */ }
}
function markReady() {
  if (readySent) return;
  readySent = true;
  progress(100);
  send("game_ready");
}
function progress(n) {
  if (bridge && typeof bridge.setGameLoadingProgress === "function") {
    try { bridge.setGameLoadingProgress(n); } catch (e) {}
  }
  const bar = $("load-bar");
  if (bar) bar.style.width = n + "%";
}

async function initBridge() {
  const api = window.bridge;
  if (!api || typeof api.initialize !== "function") return;
  try {
    await Promise.race([api.initialize(), wait(7000).then(() => { throw new Error("bridge timeout"); })]);
  } catch (e) {
    return;
  }
  bridge = api;
  try {
    document.documentElement.lang = resolveLocale(api.platform && api.platform.language);
  } catch (e) {
    document.documentElement.lang = "en";
  }
  try {
    if (api.platform && api.platform.isAudioEnabled === false) audio.setPlatformAudio(false);
    if (api.platform && api.platform.isPaused) hostPaused = true;
  } catch (e) {}
  const events = api.EVENT_NAME || {};
  if (api.platform && typeof api.platform.on === "function") {
    if (events.PAUSE_STATE_CHANGED) {
      api.platform.on(events.PAUSE_STATE_CHANGED, (paused) => {
        hostPaused = !!paused;
        audio.setSuspended(hostPaused || document.hidden);
      });
    }
    if (events.AUDIO_STATE_CHANGED) {
      api.platform.on(events.AUDIO_STATE_CHANGED, (enabled) => {
        audio.setPlatformAudio(!!enabled);
      });
    }
  }
  rewardSupported = !!(api.advertisement && api.advertisement.isRewardedSupported);
}

async function loadSave() {
  if (!bridge || !bridge.storage || typeof bridge.storage.get !== "function") return;
  try {
    const data = await bridge.storage.get(SAVE_KEYS);
    if (!data) return;
    save.best_manual = num(data[0]);
    save.best_gravity = num(data[1]);
    save.best_auto = num(data[2]);
    save.best_combo = num(data[3]);
    save.contracts = num(data[4]);
    save.tutorial_seen = flag(data[5]);
    save.muted = flag(data[6]);
    save.volume = data[7] == null ? 85 : Math.max(0, Math.min(100, num(data[7])));
    save.core_charge = flag(data[8]);
    save.runs = num(data[9]);
  } catch (e) {}
}

let saveTimer = 0;
function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 180);
}
function flushSave() {
  if (!bridge || !bridge.storage || typeof bridge.storage.set !== "function") return;
  const values = SAVE_KEYS.map((key) => save[key]);
  try {
    const ret = bridge.storage.set(SAVE_KEYS, values);
    if (ret && typeof ret.catch === "function") ret.catch(() => {});
  } catch (e) {}
}

function bankScore() {
  const key = "best_" + (game.mode || selectedMode);
  if (game.score > (save[key] || 0)) save[key] = game.score;
  if (game.maxCombo > save.best_combo) save.best_combo = game.maxCombo;
}

function applyAudioSettings() {
  audio.setMuted(save.muted);
  audio.setVolume(save.volume / 100);
  document.querySelectorAll("#btn-mute, #mute-menu").forEach((btn) => {
    btn.classList.toggle("is-muted", save.muted);
    btn.setAttribute("aria-pressed", save.muted ? "true" : "false");
    btn.setAttribute("aria-label", save.muted ? "Unmute sound" : "Mute sound");
  });
  $("volume").value = String(save.volume);
  $("volume-pause").value = String(save.volume);
}

function updateRewardUi() {
  const ready = !!save.core_charge;
  const offer = rewardSupported && !ready;
  document.querySelectorAll("[data-reward]").forEach((el) => { el.hidden = !offer; });
  document.querySelectorAll("[data-charge]").forEach((el) => { el.hidden = !ready; });
  const busy = adBusy;
  const menuBtn = $("reward-menu");
  const overBtn = $("reward-over");
  if (menuBtn) menuBtn.disabled = busy;
  if (overBtn) overBtn.disabled = busy;
}

function updateMenu() {
  setText($("best-manual"), fmt(save.best_manual));
  setText($("best-gravity"), fmt(save.best_gravity));
  setText($("best-auto"), fmt(save.best_auto));
  setText($("contracts-total"), fmt(save.contracts));
  setText($("best-combo"), fmt(save.best_combo));
  setText($("runs-total"), fmt(save.runs));
  setText($("mode-blurb"), BLURB[selectedMode]);
  setText($("key-hint"), HINT[selectedMode]);
  document.body.classList.toggle("mode-manual", selectedMode === "manual");
  document.querySelectorAll(".mode").forEach((btn) => {
    const on = btn.dataset.mode === selectedMode;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-checked", on ? "true" : "false");
  });
  updateRewardUi();
}

function showScreens() {
  show($("screen-loading"), screen === "loading");
  show($("screen-menu"), screen === "menu");
  show($("screen-pause"), screen === "play" && userPaused && modal == null);
  show($("screen-over"), screen === "over" && modal == null);
  show($("screen-howto"), modal === "howto");
  show($("screen-credits"), modal === "credits");
  show($("hud"), screen === "play");
  $("hud").classList.toggle("is-hidden", screen !== "play");
  frame.classList.toggle("is-playing", screen === "play" && !userPaused);
}

function selectMode(mode) {
  if (mode !== "manual" && mode !== "gravity" && mode !== "auto") return;
  selectedMode = mode;
  updateMenu();
  audio.play("select");
}

function begin(practice) {
  if (screen === "play") return;
  audio.unlock();
  audio.startMusic();
  modal = null;
  userPaused = false;
  ending = false;
  particles.length = 0;
  popups.length = 0;
  const charge = !practice && !!save.core_charge;
  if (!practice) {
    save.runs += 1;
    if (charge) save.core_charge = false;
    queueSave();
  }
  startRun(game, selectedMode, { practice: !!practice, coreCharge: charge });
  coachUntil = practice ? 0 : performance.now() + 14000;
  screen = "play";
  showScreens();
  updateHud();
  send("level_started", { world: selectedMode, level: "1" });
  audio.play("confirm");
}

function goMenu() {
  if (screen === "play" && game.coreCharge) save.core_charge = true;
  if (screen === "play") bankScore();
  queueSave();
  screen = "menu";
  userPaused = false;
  modal = null;
  ending = false;
  showScreens();
  updateMenu();
}

function togglePause(force) {
  if (screen !== "play") return;
  userPaused = typeof force === "boolean" ? force : !userPaused;
  if (userPaused) {
    setSoft(game, false);
    keys.clear();
    touchActs.clear();
    send("level_paused", { world: game.mode, level: String(game.level) });
    audio.play("open");
  } else {
    send("level_resumed", { world: game.mode, level: String(game.level) });
    audio.play("back");
  }
  showScreens();
}

function fillOver(isBest) {
  setText($("over-score"), fmt(game.score));
  const best = save["best_" + game.mode] || 0;
  setText($("over-best"), "Best " + fmt(best) + " · " + (game.mode === "auto" ? "Clockwork" : game.mode[0].toUpperCase() + game.mode.slice(1)));
  setText($("over-detail"), `Rings ${game.rings} · Level ${game.level} ${levelName(game.level)} · Best combo ${game.maxCombo}`);
  $("new-best").hidden = !isBest;
  updateRewardUi();
}

function onDead() {
  if (ending || screen !== "play") return;
  ending = true;
  setSoft(game, false);
  audio.play("over");
  const before = save["best_" + game.mode] || 0;
  bankScore();
  const isBest = game.score > before && game.score > 0;
  if (game.coreCharge) save.core_charge = true;
  flushSave();
  send("level_failed", { world: game.mode, level: String(game.level) });
  if (isBest) send("player_got_achievement");
  showBreakAd("game_over", () => {
    screen = "over";
    ending = false;
    fillOver(isBest);
    showScreens();
    if (isBest) audio.play("best");
  });
}

function showBreakAd(placement, done) {
  const ads = bridge && bridge.advertisement;
  if (!ads || !ads.isInterstitialSupported || typeof ads.showInterstitial !== "function" || adBusy) {
    done();
    return;
  }
  adBusy = true;
  let opened = false;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    adBusy = false;
    done();
  };
  const eventName = bridge.EVENT_NAME && bridge.EVENT_NAME.INTERSTITIAL_STATE_CHANGED;
  const handler = (state) => {
    if (state === "loading" || state === "opened") opened = true;
    if (state === "closed" || state === "failed") {
      if (typeof ads.off === "function" && eventName) ads.off(eventName, handler);
      finish();
    }
  };
  try {
    if (eventName && typeof ads.on === "function") ads.on(eventName, handler);
    const ret = ads.showInterstitial(placement);
    if (ret && typeof ret.then === "function") ret.then(() => {}, () => finish());
  } catch (e) {
    finish();
    return;
  }
  setTimeout(() => { if (!opened) finish(); }, 500);
  setTimeout(finish, 15000);
}

function watchForCharge() {
  audio.unlock();
  if (!rewardSupported || save.core_charge || adBusy) return;
  const ads = bridge.advertisement;
  if (!ads || typeof ads.showRewarded !== "function") return;
  adBusy = true;
  updateRewardUi();
  let granted = false;
  let opened = false;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    adBusy = false;
    updateRewardUi();
    updateMenu();
  };
  const eventName = bridge.EVENT_NAME && bridge.EVENT_NAME.REWARDED_STATE_CHANGED;
  const handler = (state) => {
    if (state === "loading" || state === "opened" || state === "rewarded") opened = true;
    if (state === "rewarded" && !granted) {
      granted = true;
      save.core_charge = true;
      flushSave();
      audio.play("confirm");
      updateRewardUi();
    }
    if (state === "closed" || state === "failed") {
      if (typeof ads.off === "function" && eventName) ads.off(eventName, handler);
      finish();
    }
  };
  try {
    if (eventName && typeof ads.on === "function") ads.on(eventName, handler);
    const ret = ads.showRewarded("core_charge");
    if (ret && typeof ret.then === "function") ret.then(() => {}, () => {});
  } catch (e) {
    finish();
    return;
  }
  setTimeout(() => { if (!opened) finish(); }, 800);
  setTimeout(finish, 20000);
}

function shake(mag) {
  if (reduceMotion) return;
  shakeX += (Math.random() - 0.5) * mag * 2;
  shakeY += (Math.random() - 0.5) * mag * 2;
}
function popup(text, color, big) {
  popups.push({ text, color, big, life: big ? 1.15 : 0.85, max: big ? 1.15 : 0.85 });
  if (popups.length > 5) popups.shift();
}
function burst(cells, count, big) {
  if (!view.layout) return;
  const colors = ["#2eb8a8", "#e8b03a", "#a868cc", "#3eb070", "#d65c4e", "#e8843a", "#487ad2", "#f0d48a"];
  (cells || []).forEach((cell) => {
    const p = view.cellCenter(cell.r, cell.c);
    const color = colors[(cell.id >= 0 ? cell.id : 7) % colors.length];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = (big ? 2.6 : 1.5) * (0.45 + Math.random());
      particles.push({
        x: p.x, y: p.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - (big ? 1.1 : 0.3),
        life: 1,
        size: (big ? 8 : 4.5) * (0.55 + Math.random()),
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.25,
        color,
        shape: big && i % 2 === 0 ? "shard" : "spark",
      });
    }
  });
  if (particles.length > 240) particles.splice(0, particles.length - 240);
}

function handleEvents(list) {
  list.forEach((e) => {
    if (e.type === "move") audio.play("move");
    else if (e.type === "rotate") audio.play("rotate");
    else if (e.type === "hold") audio.play("hold");
    else if (e.type === "struct") { audio.play("struct"); shake(3); }
    else if (e.type === "lock") {
      audio.play(e.dropDist > 1 ? "hard" : "lock");
      shake(e.dead ? 8 : 2.4);
      burst(e.cells, e.dead ? 8 : 4, false);
    } else if (e.type === "dead") onDead();
    else if (e.type === "ring") {
      audio.play(e.combo > 1 ? "combo" : "clear");
      audio.duck();
      shake(4 + Math.min(6, e.combo));
      burst(e.cells, 7, true);
      popup(e.combo > 1 ? "Combo ×" + e.combo : "Ring clear", e.combo > 1 ? "#f0d48a" : "#f6e7c8", true);
      popup("+" + fmt(e.pts), "#fff6df", false);
      if (e.charged) popup("Triple ring", "#ffe08a", true);
    } else if (e.type === "level") {
      audio.play("level");
      levelFlash = 0.85;
      popup("Level " + e.level + " · " + levelName(e.level), "#f0d48a", true);
    } else if (e.type === "contract") {
      audio.play("contract");
      popup("Contract kept", "#f6e7c8", true);
      save.contracts += 1;
      queueSave();
    } else if (e.type === "practice-cleared") {
      audio.play("confirm");
      popup("Ring cleared", "#f6e7c8", true);
      save.tutorial_seen = true;
      queueSave();
    }
  });
}

function updateHud() {
  if (screen !== "play") return;
  setText($("hud-score"), fmt(game.score));
  const best = Math.max(save["best_" + game.mode] || 0, game.score);
  setText($("hud-best"), fmt(best));
  setText($("hud-level-name"), levelName(game.level));
  setText($("hud-level"), String(game.level));
  setText($("hud-rings"), game.combo > 1 ? game.rings + "  ×" + game.combo : String(game.rings));
  const progressNow = contractProgress(game);
  if (game.practice) setText($("hud-contract"), "Practice — move left into the top gap, then drop");
  else if (performance.now() < coachUntil && game.rings === 0) setText($("hud-contract"), "Red ghost = unsafe drop. Build on the core.");
  else setText($("hud-contract"), progressNow.label + "  ·  " + progressNow.cur + "/" + progressNow.need);
  $("hud-fill").style.width = (game.practice ? 0.15 : progressNow.ratio) * 100 + "%";
}

function updateJuice(dt) {
  shakeX *= 0.86;
  shakeY *= 0.86;
  if (levelFlash > 0) levelFlash = Math.max(0, levelFlash - dt * 1.3);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.rot += p.vr;
    p.life -= dt * (p.shape === "shard" ? 1.25 : 1.7);
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = popups.length - 1; i >= 0; i--) {
    popups[i].life -= dt;
    if (popups[i].life <= 0) popups.splice(i, 1);
  }
}

function repeatHeld(dt, store, names, fire) {
  names.forEach((name) => {
    if (!store.has(name)) {
      if (store === keys) das[name] = 0;
      else touchTime[name === "ArrowLeft" ? "left" : name === "ArrowRight" ? "right" : name] = 0;
      return;
    }
    const bucket = store === keys ? das : touchTime;
    const key = store === keys ? name : name;
    bucket[key] = (bucket[key] || 0) + dt * 1000;
    if (bucket[key] > 160) {
      const previous = bucket[key] - dt * 1000;
      const steps = Math.floor((bucket[key] - 160) / 42) - Math.max(0, Math.floor((previous - 160) / 42));
      for (let i = 0; i < steps; i++) fire(name);
    }
  });
}

function playingNow() {
  return screen === "play" && !userPaused && !hostPaused && !document.hidden && (game.phase === "fall" || game.phase === "clear");
}

function pressAct(act) {
  if (screen !== "play" || userPaused || hostPaused || document.hidden) return;
  if (act === "left") tryMove(game, -1);
  else if (act === "right") tryMove(game, 1);
  else if (act === "down") { setSoft(game, true); tryMove(game, 0, 1); }
  else if (act === "drop") hardDrop(game);
  else if (act === "rotL") tryRotate(game, -1);
  else if (act === "rotR") tryRotate(game, 1);
  else if (act === "structL") tryStruct(game, -1);
  else if (act === "structR") tryStruct(game, 1);
  else if (act === "hold") tryHold(game);
}

function syncFrame() {
  const lay = view.layout;
  if (!lay) return;
  frame.style.left = lay.frame.x + "px";
  frame.style.top = lay.frame.y + "px";
  frame.style.width = lay.frame.w + "px";
  frame.style.height = lay.frame.h + "px";
  frame.style.setProperty("--hud", lay.hudH + "px");
  frame.style.setProperty("--dock", lay.dockH + "px");
  frame.style.setProperty("--side", lay.side + "px");
  frame.classList.toggle("touch-portrait", lay.showTouch && !lay.landscapeTouch);
  frame.classList.toggle("touch-landscape", !!lay.landscapeTouch);
}

function scene() {
  return {
    game,
    time: performance.now() / 1000,
    showTouch: needsTouch(),
    showcase: screen !== "play",
    calm: reduceMotion,
    shakeX, shakeY, levelFlash,
    particles, popups,
  };
}

function fillMini(id, pattern) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = "";
  pattern.replace(/\s/g, "").split("").forEach((ch) => {
    const cell = document.createElement("i");
    if (ch === "x") {
      cell.className = "bad";
      cell.textContent = "×";
    } else if (TILE[ch]) cell.className = TILE[ch];
    el.appendChild(cell);
  });
}

function renderHowto() {
  document.querySelectorAll("#screen-howto .page").forEach((page) => {
    page.classList.toggle("is-hidden", Number(page.dataset.page) !== howtoPage);
  });
  document.querySelectorAll("#howto-dots i").forEach((dot, i) => dot.classList.toggle("on", i === howtoPage));
  $("howto-back").disabled = howtoPage === 0;
  $("howto-next").textContent = howtoPage === 2 ? "Done" : "Next";
}
function openHowto() {
  howtoPage = 0;
  renderHowto();
  modal = "howto";
  showScreens();
  audio.play("open");
}
function closeModal() {
  modal = null;
  if (!save.tutorial_seen) {
    save.tutorial_seen = true;
    queueSave();
  }
  showScreens();
  audio.play("back");
}

function toggleMuted() {
  save.muted = !save.muted;
  applyAudioSettings();
  queueSave();
  audio.unlock();
  audio.play("toggle");
}
function setVolume(value) {
  save.volume = Math.max(0, Math.min(100, num(value)));
  if (save.volume === 0) save.muted = true;
  else if (save.muted && save.volume > 0) save.muted = false;
  applyAudioSettings();
  queueSave();
}

function onKeyDown(e) {
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "ArrowLeft" || e.code === "ArrowRight") e.preventDefault();
  if (e.target.closest("input")) return;
  audio.unlock();
  if (e.code === "Escape") {
    if (modal) { closeModal(); return; }
    if (screen === "play") { togglePause(); return; }
    return;
  }
  if (modal) return;
  if (screen === "menu" && (e.code === "Enter" || e.code === "Space") && !e.target.closest("button")) {
    begin(false);
    return;
  }
  if (screen === "over" && (e.code === "Enter" || e.code === "Space") && !e.target.closest("button")) {
    begin(false);
    return;
  }
  if (e.code === "KeyP" && screen === "play") {
    if (!e.repeat) togglePause();
    return;
  }
  if (screen !== "play" || userPaused || hostPaused) return;
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === "ArrowLeft") tryMove(game, -1);
  else if (e.code === "ArrowRight") tryMove(game, 1);
  else if (e.code === "ArrowDown") { setSoft(game, true); tryMove(game, 0, 1); }
  else if (e.code === "ArrowUp" || e.code === "Space") hardDrop(game);
  else if (e.code === "KeyZ") tryRotate(game, -1);
  else if (e.code === "KeyX") tryRotate(game, 1);
  else if (e.code === "KeyA") tryStruct(game, -1);
  else if (e.code === "KeyS") tryStruct(game, 1);
  else if (e.code === "KeyC") tryHold(game);
}
function onKeyUp(e) {
  keys.delete(e.code);
  if (e.code === "ArrowDown") setSoft(game, false);
}

frame.addEventListener("pointerdown", (e) => {
  const act = e.target.closest("[data-act]");
  if (!act) return;
  e.preventDefault();
  audio.unlock();
  pressAct(act.dataset.act);
  if (act.dataset.act === "left" || act.dataset.act === "right" || act.dataset.act === "down") touchActs.add(act.dataset.act);
  act.blur();
});
window.addEventListener("pointerup", () => {
  if (touchActs.has("down")) setSoft(game, false);
  touchActs.clear();
});
window.addEventListener("pointercancel", () => {
  if (touchActs.has("down")) setSoft(game, false);
  touchActs.clear();
});

const canvas = $("view");
canvas.addEventListener("touchstart", (e) => {
  if (screen !== "play" || userPaused) return;
  const t = e.changedTouches[0];
  swipe = { x: t.clientX, y: t.clientY, lx: t.clientX, ly: t.clientY, t: performance.now() };
}, { passive: false });
canvas.addEventListener("touchmove", (e) => {
  if (!swipe || screen !== "play" || userPaused) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - swipe.lx;
  const dy = t.clientY - swipe.ly;
  const step = Math.max(18, (view.layout && view.layout.cs) || 24);
  if (Math.abs(dx) > step && Math.abs(dx) > Math.abs(dy)) {
    tryMove(game, dx > 0 ? 1 : -1);
    swipe.lx = t.clientX;
    swipe.ly = t.clientY;
  } else if (dy > step && dy > Math.abs(dx)) {
    setSoft(game, true);
    tryMove(game, 0, 1);
    swipe.lx = t.clientX;
    swipe.ly = t.clientY;
  }
}, { passive: false });
canvas.addEventListener("touchend", (e) => {
  if (!swipe) return;
  const t = e.changedTouches[0];
  const dy = t.clientY - swipe.y;
  const dx = t.clientX - swipe.x;
  const dt = performance.now() - swipe.t;
  if (dy < -36 && Math.abs(dy) > Math.abs(dx) && dt < 420) hardDrop(game);
  setSoft(game, false);
  swipe = null;
}, { passive: false });

document.addEventListener("touchmove", (e) => {
  if (e.target.closest("input, .can-scroll")) return;
  e.preventDefault();
}, { passive: false });
document.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);

$("play-btn").addEventListener("pointerdown", (e) => { e.preventDefault(); begin(false); });
$("again-btn").addEventListener("pointerdown", (e) => { e.preventDefault(); begin(false); });
$("howto-open").addEventListener("pointerdown", (e) => { e.preventDefault(); openHowto(); });
$("pause-howto").addEventListener("pointerdown", (e) => { e.preventDefault(); openHowto(); });
$("howto-close").addEventListener("pointerdown", (e) => { e.preventDefault(); closeModal(); });
$("howto-back").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  howtoPage = Math.max(0, howtoPage - 1);
  renderHowto();
  audio.play("click");
});
$("howto-next").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (howtoPage >= 2) closeModal();
  else { howtoPage += 1; renderHowto(); audio.play("click"); }
});
$("howto-practice").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  save.tutorial_seen = true;
  queueSave();
  begin(true);
});
$("credits-open").addEventListener("pointerdown", (e) => { e.preventDefault(); modal = "credits"; showScreens(); audio.play("open"); });
$("credits-close").addEventListener("pointerdown", (e) => { e.preventDefault(); closeModal(); });
$("btn-pause").addEventListener("pointerdown", (e) => { e.preventDefault(); togglePause(true); });
$("resume-btn").addEventListener("pointerdown", (e) => { e.preventDefault(); togglePause(false); });
$("pause-menu").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  showBreakAd("menu_return", goMenu);
});
$("over-menu").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  showBreakAd("menu_return", goMenu);
});
$("btn-mute").addEventListener("pointerdown", (e) => { e.preventDefault(); toggleMuted(); });
$("mute-menu").addEventListener("pointerdown", (e) => { e.preventDefault(); toggleMuted(); });
$("reward-menu").addEventListener("pointerdown", (e) => { e.preventDefault(); watchForCharge(); });
$("reward-over").addEventListener("pointerdown", (e) => { e.preventDefault(); watchForCharge(); });
$("volume").addEventListener("input", (e) => setVolume(e.target.value));
$("volume-pause").addEventListener("input", (e) => setVolume(e.target.value));
document.querySelectorAll(".mode").forEach((btn) => {
  btn.addEventListener("pointerdown", (e) => { e.preventDefault(); selectMode(btn.dataset.mode); });
});
$("reload-btn").addEventListener("pointerdown", (e) => { e.preventDefault(); location.reload(); });

document.addEventListener("visibilitychange", () => {
  if (document.hidden && screen === "play") {
    bankScore();
    flushSave();
  }
  audio.setSuspended(document.hidden || hostPaused);
  if (!document.hidden) audio.unlock();
});

fillMini("mini-ring", `
.......
.00000.
.1...1.
.2.*.2.
.3...3.
.44444.
.......`);
fillMini("mini-turn", `
..55...
.......
.00000.
.1...1.
.2.*.2.
.3...3.
.44444.`);
fillMini("mini-frame", `
x.....x
.00000.
.1...1.
.2.*.2.
.3...3.
.44444.
x.....x`);

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const sim = playingNow();
  if (sim) {
    tick(game, dt);
    if (game.phase === "fall") {
      repeatHeld(dt, keys, ["ArrowLeft", "ArrowRight"], (code) => tryMove(game, code === "ArrowLeft" ? -1 : 1));
      repeatHeld(dt, touchActs, ["left", "right"], (act) => tryMove(game, act === "left" ? -1 : 1));
    }
  } else if (screen === "play") {
    setSoft(game, false);
  }
  if (screen === "play") handleEvents(takeEvents(game));
  else if (game.events.length) game.events.length = 0;
  const frozen = screen === "play" && (userPaused || hostPaused || document.hidden);
  if (!frozen) updateJuice(dt);
  updateHud();
  view.draw(scene());
  syncFrame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

async function boot() {
  progress(12);
  const audioJob = audio.load().catch(() => {});
  const bridgeJob = initBridge();
  await Promise.race([Promise.all([audioJob, bridgeJob]), wait(8000)]);
  progress(70);
  await loadSave();
  applyAudioSettings();
  updateMenu();
  audio.startMusic();
  screen = "menu";
  showScreens();
  if (!save.tutorial_seen) {
    howtoPage = 0;
    renderHowto();
    modal = "howto";
    showScreens();
  }
  progress(100);
  requestAnimationFrame(() => {
    view.draw(scene());
    syncFrame();
    markReady();
  });
}

boot().catch(() => {
  const sub = $("load-sub");
  if (sub) sub.textContent = "Something went wrong. Reload the page.";
  $("reload-btn").hidden = false;
});
