import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { SSAARenderPass } from 'three/addons/postprocessing/SSAARenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { CellId, Vec2 } from '../core/types';
import type { GridGraph } from '../grid/GridGraph';
import type { ColorField } from '../color/ColorField';
import { LAND_COLOR, LAND_HORIZON, SKY_TOP, SKY_BOTTOM } from '../color/Palette';
import { buildCityGroup } from './CityMeshBuilder';
import { makePaperLambert, waterTime } from './paperLook';
import { BattleLayer } from './BattleLayer';
import type { CombatSim } from '../game/CombatSim';

export class SceneRenderer {
  readonly visualGen = {
    invalidate(_ids?: CellId[]): void {},
    invalidateAll(): void {},
    rebuild(_ids: CellId[], _graph: GridGraph, _colors: ColorField): void {},
  };

  private container: HTMLElement | null = null;
  private graph: GridGraph;
  private colors: ColorField;
  private renderer: THREE.WebGLRenderer | null = null;
  private composer: EffectComposer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-16, 16, 12, -12, 0.05, 4000);
  private controls: OrbitControls | null = null;
  private cityGroup = new THREE.Group();
  private needsRebuild = true;
  private rafId = 0;
  private hover: THREE.Mesh | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private table: THREE.Mesh | null = null;
  private sky: THREE.Mesh | null = null;
  private sun: THREE.DirectionalLight | null = null;
  private battle: BattleLayer;
  private lastT = 0;
  onTick: ((dt: number) => void) | null = null;
  sim: CombatSim | null = null;

  constructor(graph: GridGraph, colors: ColorField) {
    this.graph = graph;
    this.colors = colors;
    this.battle = new BattleLayer(graph);
    this.scene.background = new THREE.Color(LAND_HORIZON);
    this.scene.fog = new THREE.FogExp2(LAND_HORIZON, 0.0032);
  }

  async init(container: HTMLElement): Promise<void> {
    this.container = container;
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true });
    renderer.setClearColor(LAND_HORIZON, 1);
    renderer.setPixelRatio(2);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.cursor = 'default';
    renderer.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 1) e.preventDefault();
    });
    renderer.domElement.addEventListener('auxclick', (e) => e.preventDefault());
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const composer = new EffectComposer(renderer);
    const ssaa = new SSAARenderPass(this.scene, this.camera, LAND_HORIZON, 1);
    ssaa.sampleLevel = 2;
    composer.addPass(ssaa);

    const gtao = new GTAOPass(this.scene, this.camera, 1, 1);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.blendIntensity = 1;
    gtao.updateGtaoMaterial({
      radius: 0.35,
      distanceExponent: 1.6,
      thickness: 0.35,
      distanceFallOff: 1,
      scale: 1,
      samples: 16,
      screenSpaceRadius: false,
    });
    // The sky dome would otherwise fill the AO depth buffer (override material
    // writes depth even though the real sky material does not).
    const hideFromAo = () => {
      const sky = this.sky;
      if (sky?.visible) {
        sky.visible = false;
        (gtao as unknown as { _visibilityCache: THREE.Object3D[] })._visibilityCache.push(sky);
      }
    };
    const origHide = (gtao as unknown as { _overrideVisibility: () => void })._overrideVisibility.bind(gtao);
    (gtao as unknown as { _overrideVisibility: () => void })._overrideVisibility = () => {
      origHide();
      hideFromAo();
    };
    composer.addPass(gtao);

    composer.addPass(new SMAAPass());
    composer.addPass(new OutputPass());
    this.composer = composer;

    // Sky-dominated fill keeps shadows soft and coloured rather than black.
    const hemi = new THREE.HemisphereLight('#d6e8f2', '#b5a98c', 1.8);
    this.scene.add(hemi);

    const bounce = new THREE.DirectionalLight('#bcd4e4', 0.22);
    bounce.position.set(-12, 7, -8);
    this.scene.add(bounce);

    const sun = new THREE.DirectionalLight('#fff6e6', 1.15);
    sun.position.set(16, 22, 11);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 180;
    sun.shadow.camera.left = -70;
    sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70;
    sun.shadow.camera.bottom = -70;
    sun.shadow.bias = -0.0009;
    sun.shadow.normalBias = 0.024;
    sun.shadow.radius = 4.5;
    sun.shadow.intensity = 0.82;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1900, 32, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(SKY_TOP) },
          uBottom: { value: new THREE.Color(SKY_BOTTOM) },
          uGround: { value: new THREE.Color(LAND_HORIZON) },
        },
        vertexShader: `
          varying vec3 vSkyPos;
          void main() {
            vSkyPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uTop;
          uniform vec3 uBottom;
          uniform vec3 uGround;
          varying vec3 vSkyPos;
          void main() {
            float h = clamp(normalize(vSkyPos).y, -1.0, 1.0);
            vec3 col = mix(uBottom, uTop, smoothstep(0.0, 0.55, h));
            // Below the horizon, match the haze so the distant field dissolves
            // into it rather than meeting a visible edge.
            col = mix(uGround, col, smoothstep(-0.05, 0.0, h));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    );
    sky.frustumCulled = false;
    sky.renderOrder = -1000;
    this.scene.add(sky);
    this.sky = sky;

    const tableMat = makePaperLambert(LAND_COLOR, 'ground');
    tableMat.side = THREE.FrontSide;
    const table = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), tableMat);
    table.rotation.x = -Math.PI / 2;
    table.position.y = -1.28;
    table.receiveShadow = true;
    this.scene.add(table);
    this.table = table;

    const hoverGeo = new THREE.RingGeometry(0.42, 0.58, 28);
    const hoverMat = new THREE.MeshBasicMaterial({
      color: '#e2b84a',
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    });
    this.hover = new THREE.Mesh(hoverGeo, hoverMat);
    this.hover.rotation.x = -Math.PI / 2;
    this.hover.visible = false;
    this.hover.renderOrder = 2;
    this.scene.add(this.hover);
    this.scene.add(this.battle.group);

    const controls = new OrbitControls(this.camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 8;
    controls.maxDistance = 56;
    controls.minPolarAngle = 0.7;
    // An orthographic camera collapses the ground plane to a line near the
    // horizon, which would let the player see under the world.
    controls.maxPolarAngle = 1.26;
    controls.minZoom = 0.42;
    controls.maxZoom = 2.8;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.85;
    controls.rotateSpeed = 0.85;
    controls.mouseButtons = {
      LEFT: -1 as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.ROTATE,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    this.controls = controls;

    this.handleResize();
    this.rebuildCity();
    this.frameCamera();

    window.addEventListener('resize', () => this.handleResize());

    const loop = () => {
      this.rafId = requestAnimationFrame(loop);
      this.render();
    };
    this.rafId = requestAnimationFrame(loop);
  }

  get canvas(): HTMLCanvasElement {
    if (!this.renderer) throw new Error('Renderer not initialized');
    return this.renderer.domElement;
  }

  private handleResize(): void {
    if (!this.container || !this.renderer) return;
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    const aspect = w / Math.max(1, h);
    const frustum = 12.2;
    this.camera.left = -frustum * aspect;
    this.camera.right = frustum * aspect;
    this.camera.top = frustum;
    this.camera.bottom = -frustum;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
  }

  private cityCenter(): THREE.Vector3 {
    let sx = 0, sz = 0, n = 0;
    for (const cell of this.graph.grid.cells) {
      if (cell.state.occupancy !== 'building') continue;
      sx += cell.centroid.x;
      sz += cell.centroid.y;
      n++;
    }
    if (!n) {
      for (const cell of this.graph.grid.cells) {
        if (cell.state.occupancy === 'water') continue;
        sx += cell.centroid.x;
        sz += cell.centroid.y;
        n++;
      }
    }
    return new THREE.Vector3(n ? sx / n : 0, 0.4, n ? sz / n : 0);
  }

  frameCamera(): void {
    const c = this.cityCenter();
    if (this.table) this.table.position.set(c.x, -1.28, c.z);
    if (this.sky) this.sky.position.set(c.x, 0, c.z);
    if (this.sun) {
      this.sun.target.position.copy(c);
      this.sun.position.set(c.x + 16, 24, c.z + 11);
      this.sun.target.updateMatrixWorld();
    }
    if (this.controls) this.controls.target.copy(c);
    this.camera.position.set(c.x + 16.2, 9.2, c.z + 15.2);
    this.camera.zoom = 1.08;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(c);
    this.controls?.update();
  }

  private rebuildCity(): void {
    this.scene.remove(this.cityGroup);
    this.cityGroup.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry && mesh !== this.table) mesh.geometry.dispose();
    });
    const built = buildCityGroup(this.graph, this.colors);
    this.cityGroup = built.group;
    this.scene.add(this.cityGroup);
    this.needsRebuild = false;
  }

  setHoverOk(ok: boolean): void {
    if (!this.hover) return;
    (this.hover.material as THREE.MeshBasicMaterial).color.set(ok ? '#7ecf6a' : '#d45c4a');
  }

  setSelected(id: CellId | null): void {
    if (!this.hover) return;
    const cell = id ? this.graph.getCell(id) : undefined;
    if (!cell || cell.state.occupancy === 'water') {
      this.hover.visible = false;
      return;
    }
    this.hover.visible = true;
    this.hover.position.set(
      cell.centroid.x,
      0.1 + this.graph.hillAt(cell.centroid.x, cell.centroid.y),
      cell.centroid.y,
    );
  }

  markDirty(): void {
    this.needsRebuild = true;
  }

  invalidateCells(_cellIds: CellId[]): void {
    this.needsRebuild = true;
  }

  rebuildCells(_cellIds: CellId[]): void {
    this.needsRebuild = true;
  }

  render(): void {
    if (!this.renderer) return;
    const now = performance.now();
    const dt = this.lastT ? Math.min(0.05, (now - this.lastT) / 1000) : 1 / 60;
    this.lastT = now;
    this.onTick?.(dt);
    if (this.sim) this.battle.sync(this.sim, now * 0.001);
    if (this.needsRebuild) this.rebuildCity();
    waterTime.value = now * 0.001;
    this.controls?.update();
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  screenToWorld(screenX: number, screenY: number): Vec2 {
    const el = this.renderer?.domElement;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    this.pointer.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((screenY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.cityGroup, true);
    if (hits.length) {
      return { x: hits[0].point.x, y: hits[0].point.z };
    }
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(plane, hit)) return { x: hit.x, y: hit.z };
    return { x: 0, y: 0 };
  }

  panBy(_dx: number, _dy: number): void {}

  zoomAt(_factor: number, _screenX: number, _screenY: number): void {}

  resetGraph(graph: GridGraph): void {
    this.graph = graph;
    this.battle.setGraph(graph);
    this.needsRebuild = true;
    this.frameCamera();
  }

  getGraph(): GridGraph {
    return this.graph;
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.controls?.dispose();
    this.renderer?.dispose();
  }
}
