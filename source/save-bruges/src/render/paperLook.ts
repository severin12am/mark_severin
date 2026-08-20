import * as THREE from 'three';

export type PaperKind = 'wall' | 'roof' | 'ground' | 'water' | 'trim' | 'cobble';

export const waterTime = { value: 0 };

const BRICK_NOISE = `
float brickHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`;

function injectWorldVaryings(shader: THREE.WebGLProgramParametersWithUniforms): void {
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
       varying vec3 vBrickPos;`,
    )
    .replace(
      '#include <fog_vertex>',
      `#include <fog_vertex>
       vBrickPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
       varying vec3 vBrickPos;
       ${BRICK_NOISE}`,
    );
}

function surfaceModulate(kind: PaperKind): string {
  if (kind === 'roof') {
    return `
      vec3 rN = abs(normalize(cross(dFdx(vBrickPos), dFdy(vBrickPos))));
      vec2 tileUv = rN.y > rN.x && rN.y > rN.z
        ? vBrickPos.xz * 5.8
        : rN.x > rN.z
          ? vec2(vBrickPos.z, vBrickPos.y) * vec2(5.8, 8.4)
          : vec2(vBrickPos.x, vBrickPos.y) * vec2(5.8, 8.4);
      float row = floor(tileUv.y);
      tileUv.x += mod(row, 2.0) * 0.5;
      vec2 tileId = floor(tileUv);
      vec2 tileF = fract(tileUv);
      float mortar = 1.0 - step(0.07, tileF.x) * step(0.09, tileF.y) * step(tileF.x, 0.93) * step(tileF.y, 0.9);
      float shade = mix(0.72, 1.14, brickHash(tileId));
      outgoingLight *= mix(vec3(shade), vec3(0.42, 0.3, 0.24), mortar);`;
  }
  if (kind === 'cobble') {
    return `
      vec2 uv = vBrickPos.xz * 3.4;
      float row = floor(uv.y);
      uv.x += mod(row, 2.0) * 0.5;
      vec2 id = floor(uv);
      vec2 f = fract(uv);
      vec2 d = abs(f - 0.5);
      float stone = 1.0 - smoothstep(0.28, 0.44, max(d.x, d.y * 0.82));
      float shade = mix(0.78, 1.16, brickHash(id));
      outgoingLight *= mix(vec3(0.58, 0.54, 0.46), vec3(shade * 1.02, shade, shade * 0.92), stone);`;
  }
  if (kind === 'ground') {
    return `
      float blotch = brickHash(floor(vBrickPos.xz * 0.55));
      outgoingLight *= mix(0.94, 1.05, blotch);`;
  }
  if (kind === 'trim') {
    return `
      outgoingLight *= mix(0.96, 1.03, brickHash(floor(vBrickPos.xy * 3.0)));`;
  }
  return `
      vec3 wN = abs(normalize(cross(dFdx(vBrickPos), dFdy(vBrickPos))));
      vec2 wallUv;
      if (wN.y > wN.x && wN.y > wN.z) {
        wallUv = vBrickPos.xz * 5.4;
      } else if (wN.x > wN.z) {
        wallUv = vec2(vBrickPos.z, vBrickPos.y) * vec2(5.6, 9.4);
      } else {
        wallUv = vec2(vBrickPos.x, vBrickPos.y) * vec2(5.6, 9.4);
      }
      float row = floor(wallUv.y);
      wallUv.x += mod(row, 2.0) * 0.5;
      vec2 brickId = floor(wallUv);
      vec2 brickF = fract(wallUv);
      float mortar = 1.0 - step(0.06, brickF.x) * step(0.08, brickF.y) * step(brickF.x, 0.94) * step(brickF.y, 0.88);
      float shade = mix(0.74, 1.16, brickHash(brickId));
      vec3 brickTint = mix(vec3(0.86, 0.8, 0.72), vec3(1.12, 1.04, 0.92), brickHash(brickId + 3.1));
      brickTint = mix(brickTint, vec3(0.7, 0.82, 0.58), step(0.94, brickHash(brickId + 8.2)));
      float opening = 0.0;
      #ifdef USE_COLOR
      opening = 1.0 - step(2.2, vColor.r + vColor.g + vColor.b);
      #endif
      vec3 mason = mix(brickTint * shade, vec3(0.46, 0.4, 0.34), mortar);
      outgoingLight *= mix(mason, vec3(1.0), opening);
      outgoingLight *= mix(0.84, 1.0, smoothstep(0.02, 0.42, vBrickPos.y));`;
}

export function makePaperLambert(
  color: string,
  kind: PaperKind = 'wall',
  vertexColors = false,
): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({
    color,
    side: kind === 'roof' ? THREE.DoubleSide : THREE.FrontSide,
    flatShading: true,
    vertexColors,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  if (kind === 'ground') {
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = 1;
    mat.polygonOffsetUnits = 1;
  }
  if (kind === 'roof') {
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -1;
    mat.polygonOffsetUnits = -1;
  }
  if (kind === 'wall') mat.shadowSide = THREE.FrontSide;
  if (kind === 'water') return mat;
  mat.onBeforeCompile = (shader) => {
    injectWorldVaryings(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
      `vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
       ${surfaceModulate(kind)}`,
    );
  };
  mat.customProgramCacheKey = () => `town-surface-${kind}-v5`;
  return mat;
}

export function makeWaterMaterial(color: string): THREE.MeshPhongMaterial {
  const mat = new THREE.MeshPhongMaterial({
    color,
    shininess: 48,
    specular: new THREE.Color('#9ec8d0'),
    flatShading: true,
    side: THREE.FrontSide,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 waterWorld0 = modelMatrix * vec4(transformed, 1.0);
         transformed.y += sin(waterWorld0.x * 2.1 + uTime * 0.75) * 0.002
                        + sin(waterWorld0.z * 2.7 - uTime * 0.6) * 0.0014;`,
      );
  };
  mat.customProgramCacheKey = () => 'water-townscaper-v4';
  return mat;
}
