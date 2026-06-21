import { GridGraph } from './grid/GridGraph';
import { ColorField } from './color/ColorField';
import { SceneRenderer } from './render/SceneRenderer';
import { PlacementController } from './input/PlacementController';
import { PALETTE } from './color/Palette';
import { buildDemoCity } from './demo/buildDemoCity';

let gridSeed = 42;

async function main(): Promise<void> {
  const container = document.getElementById('app')!;
  let graph = new GridGraph(gridSeed);
  const colors = new ColorField();
  const renderer = new SceneRenderer(graph, colors);

  await renderer.init(container);

  buildDemoCity(graph, colors);
  renderer.visualGen.invalidateAll();
  renderer.markDirty();
  renderer.render();

  let activeColor = PALETTE[0];
  const placement = new PlacementController(
    colors,
    renderer,
    renderer.canvas,
    activeColor,
  );

  const swatchesEl = document.getElementById('swatches')!;
  for (const hex of PALETTE) {
    const sw = document.createElement('div');
    sw.className = 'swatch' + (hex === activeColor ? ' active' : '');
    sw.style.background = hex;
    sw.title = hex;
    sw.addEventListener('click', () => {
      activeColor = hex;
      placement.setColor(hex);
      document.querySelectorAll('.swatch').forEach(el => el.classList.remove('active'));
      sw.classList.add('active');
    });
    swatchesEl.appendChild(sw);
  }

  document.getElementById('btn-clear')!.addEventListener('click', () => {
    placement.clearAll();
  });

  document.getElementById('btn-regen')!.addEventListener('click', () => {
    gridSeed = Math.floor(Math.random() * 100000);
    graph = new GridGraph(gridSeed);
    colors.clear();
    placement.setGraph(graph);
    renderer.resetGraph(graph);
    buildDemoCity(graph, colors);
    renderer.markDirty();
    renderer.render();
  });

  window.addEventListener('resize', () => renderer.markDirty());
}

main().catch(console.error);
