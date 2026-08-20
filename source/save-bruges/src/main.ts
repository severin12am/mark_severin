import { GridGraph } from './grid/GridGraph';
import { ColorField } from './color/ColorField';
import { SceneRenderer } from './render/SceneRenderer';
import { DefensePlacer } from './input/DefensePlacer';
import { buildDemoCity } from './demo/buildDemoCity';
import { Match } from './game/Match';
import { DEFENSES } from './game/catalog';

let gridSeed = 42;
let audioCtx: AudioContext | null = null;

function beep(freq: number, dur = 0.06, type: OscillatorType = 'triangle', vol = 0.05): void {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + dur);
  } catch {
    /* ignore */
  }
}

function bindUi(match: Match): void {
  const gold = document.getElementById('stat-gold')!;
  const wave = document.getElementById('stat-wave')!;
  const houses = document.getElementById('stat-houses')!;
  const keep = document.getElementById('stat-keep')!;
  const banner = document.getElementById('banner')!;
  const start = document.getElementById('btn-start') as HTMLButtonElement;
  const next = document.getElementById('btn-wave') as HTMLButtonElement;
  const defs = document.getElementById('defenses')!;

  const paint = () => {
    gold.textContent = String(match.gold);
    wave.textContent = `${Math.max(0, match.waveIndex)} / ${match.waves.length}`;
    houses.textContent = String(match.standingHouses());
    const keepCell = match.graph.grid.cells.find(c => c.state.isTower);
    const w = keepCell?.state.wound;
    keep.textContent = w?.ruined ? 'fallen' : `${Math.max(0, Math.ceil(w?.hp ?? 0))}`;
    banner.textContent = match.banner;
    start.disabled = match.phase !== 'prepare';
    next.disabled = match.phase !== 'between';
    defs.querySelectorAll<HTMLButtonElement>('.def').forEach(btn => {
      const kind = btn.dataset.kind as typeof match.selected;
      btn.classList.toggle('active', match.selected === kind);
      const cost = DEFENSES.find(d => d.kind === kind)?.cost ?? 0;
      const locked = match.phase === 'wave' || match.phase === 'won' || match.phase === 'lost';
      btn.disabled = locked || (match.gold < cost && match.selected !== kind);
    });
  };

  match.onUi = paint;
  if (!defs.childElementCount) {
    for (const d of DEFENSES) {
      const btn = document.createElement('button');
      btn.className = 'def' + (d.kind === match.selected ? ' active' : '');
      btn.dataset.kind = d.kind;
      btn.innerHTML = `<span class="dot" style="background:${d.color}"></span><span>${d.name}<small>${d.hint}</small></span><strong>${d.cost}</strong>`;
      btn.addEventListener('click', () => {
        match.selected = d.kind;
        paint();
        beep(520, 0.04, 'sine', 0.03);
      });
      defs.appendChild(btn);
    }
  }
  paint();
}

async function boot(): Promise<void> {
  const container = document.getElementById('app')!;
  const graph = new GridGraph(gridSeed);
  const colors = new ColorField();
  const renderer = new SceneRenderer(graph, colors);
  await renderer.init(container);

  buildDemoCity(graph, colors);
  renderer.markDirty();
  renderer.frameCamera();

  const match = new Match(graph);
  renderer.sim = match.sim;
  match.onCityDirty = () => renderer.markDirty();
  renderer.onTick = dt => match.tick(dt);

  const placer = new DefensePlacer(match, renderer, renderer.canvas);
  placer.onPlace = () => beep(380, 0.05, 'triangle', 0.04);
  bindUi(match);
  (window as unknown as { __sb: { match: Match; renderer: SceneRenderer } }).__sb = { match, renderer };

  document.getElementById('btn-start')!.addEventListener('click', () => {
    if (match.beginSiege()) beep(220, 0.12, 'sawtooth', 0.04);
  });
  document.getElementById('btn-wave')!.addEventListener('click', () => {
    if (match.callNextWave()) beep(260, 0.1, 'sawtooth', 0.04);
  });
  document.getElementById('btn-undo')!.addEventListener('click', () => {
    if (match.undo()) beep(280, 0.07, 'sine', 0.04);
  });
  document.getElementById('btn-reset')!.addEventListener('click', () => {
    location.reload();
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'z' || e.key === 'Z') {
      if (match.undo()) beep(280, 0.07, 'sine', 0.04);
    }
    if (e.key === 'Enter' && match.phase === 'prepare') match.beginSiege();
    if (e.key === 'Enter' && match.phase === 'between') match.callNextWave();
  });
}

boot().catch(console.error);
