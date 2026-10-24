// Music is an original loop. Sound effects are Kenney's CC0 packs.
// See CREDITS.txt. Playback goes through one context so ads and the
// mute button can silence everything at once.

const SFX = ["click", "select", "toggle", "confirm", "open", "back", "rotate", "move", "lock", "hard", "struct", "clear", "combo", "level", "contract", "over", "best", "hold"];

function url(file) {
  return new URL(file, import.meta.url).href;
}

export function createAudio() {
  const buffers = {};
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let music = null;
  let musicBuffer = null;
  let volume = 0.85;
  let muted = false;
  let platformOn = true;
  let suspended = false;
  let started = false;
  const lastPlayed = {};

  function audible() {
    return !muted && platformOn && !suspended && !document.hidden;
  }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain.connect(master);
    sfxGain.connect(master);
    master.connect(ctx.destination);
    musicGain.gain.value = 0.42;
    sfxGain.gain.value = 0.9;
    apply();
    return ctx;
  }

  function apply() {
    if (!ctx || !master) return;
    const on = audible();
    master.gain.setTargetAtTime(on ? volume : 0, ctx.currentTime, 0.03);
    if (!on && ctx.state === "running") ctx.suspend().catch(() => {});
    if (on && ctx.state === "suspended") ctx.resume().catch(() => {});
  }

  async function load() {
    ensure();
    const jobs = [];
    jobs.push(fetch(url("../assets/music/orrery.ogg")).then((r) => r.arrayBuffer()).then((b) => {
      musicBuffer = b;
    }).catch(() => {}));
    for (const name of SFX) {
      jobs.push(fetch(url(`../assets/sfx/${name}.ogg`)).then((r) => r.arrayBuffer()).then((b) => {
        buffers[name] = b;
      }).catch(() => {}));
    }
    await Promise.all(jobs);
    if (!ctx) return;
    const decoded = {};
    await Promise.all(Object.keys(buffers).map(async (name) => {
      try { decoded[name] = await ctx.decodeAudioData(buffers[name].slice(0)); } catch (e) { /* skip a bad file */ }
    }));
    for (const name of Object.keys(decoded)) buffers[name] = decoded[name];
    if (musicBuffer) {
      try { musicBuffer = await ctx.decodeAudioData(musicBuffer.slice(0)); } catch (e) { musicBuffer = null; }
    }
  }

  function startMusic() {
    if (!ctx || !musicBuffer || !musicBuffer.duration || music) return;
    const src = ctx.createBufferSource();
    src.buffer = musicBuffer;
    src.loop = true;
    src.connect(musicGain);
    try { src.start(); music = src; started = true; } catch (e) { /* autoplay lock */ }
  }

  function unlock() {
    ensure();
    if (ctx && ctx.state === "suspended" && audible()) ctx.resume().catch(() => {});
    startMusic();
  }

  function play(name) {
    if (!ctx || !buffers[name] || !buffers[name].duration) return;
    const now = performance.now();
    if (name === "move" && now - (lastPlayed.move || 0) < 45) return;
    lastPlayed[name] = now;
    if (!audible()) return;
    const src = ctx.createBufferSource();
    src.buffer = buffers[name];
    const gain = ctx.createGain();
    const loud = { clear: 0.85, combo: 0.8, lock: 0.7, hard: 0.75, over: 0.8, level: 0.7, struct: 0.62, move: 0.28, rotate: 0.55 };
    gain.gain.value = loud[name] || 0.6;
    src.connect(gain);
    gain.connect(sfxGain);
    try { src.start(); } catch (e) { /* ignore */ }
  }

  function duck() {
    if (!ctx || !musicGain) return;
    const t = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setValueAtTime(0.16, t);
    musicGain.gain.linearRampToValueAtTime(0.42, t + 0.55);
  }

  return {
    load, unlock, play, startMusic, duck, apply,
    setVolume(v) { volume = Math.max(0, Math.min(1, v)); apply(); },
    setMuted(m) { muted = !!m; apply(); },
    setPlatformAudio(on) { platformOn = !!on; apply(); },
    setSuspended(on) { suspended = !!on; apply(); },
    get muted() { return muted; },
    get volume() { return volume; },
    get started() { return started; },
  };
}
