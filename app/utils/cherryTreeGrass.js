import * as THREE from "three";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";
import { CherryGrassVertexShader, CherryGrassFragmentShader } from "./cherryTreeGrassShader.js";

// A grass disc at the base of the home page cherry tree, in the style of Tres's rapier-car
// GrassField: instanced tapered blades on a jittered grid, swayed by a wind wave in the shader
// (cherryTreeGrassShader.js), on top of a flat ground disc.

// A long gap between draws (e.g. the tree off screen) is cut to this, so the wind doesn't jump.
const MaxGrassFrameSeconds = 1 / 30;
// How often the baked noise repeats across the disc, per tree unit: patches of taller grass,
// and the light/dark colour patches.
const GrassHeightNoiseScale = 18;
const GrassColorNoiseScale = 10;

// Blade template: 5 vertices and 3 triangles tapering to a tip. Tipness is 0 at the base and 1 at
// the tip; it darkens the base and sets how far the wind bends each vertex.
const CherryBladePositions = new Float32Array([-1, 0, 0, 1, 0, 0, -0.5, 0.7, 0, 0.5, 0.7, 0, 0, 1, 0]);
const CherryBladeTipness = new Float32Array([0, 0, 0.7, 0.7, 1]);
const CherryBladeIndices = [0, 1, 2, 1, 3, 2, 2, 3, 4];

const CherryGrassNoise = new ImprovedNoise();

// One blade per cell of a jittered grid over the disc's bounding square, skipping the cells whose
// blade lands outside the radius. Subdivisions is the number of cells across the diameter.
const createCherryGrassGeometry = (Radius, Subdivisions) => {
  const CellSize = (Radius * 2) / Subdivisions;
  const Anchors = [];
  const Randoms = [];
  const Yaws = [];
  const HeightNoises = [];
  const ColorNoises = [];
  for (let CellX = 0; CellX < Subdivisions; CellX++) {
    for (let CellZ = 0; CellZ < Subdivisions; CellZ++) {
      const X = -Radius + (CellX + Math.random()) * CellSize;
      const Z = -Radius + (CellZ + Math.random()) * CellSize;
      if (Math.hypot(X, Z) > Radius) continue;
      Anchors.push(X, Z);
      Randoms.push(Math.random());
      Yaws.push(Math.random() * Math.PI * 2);
      const HeightNoise = CherryGrassNoise.noise(X * GrassHeightNoiseScale, Z * GrassHeightNoiseScale, 0);
      HeightNoises.push(1 + HeightNoise * 0.5);
      const ColorNoise = CherryGrassNoise.noise(
        X * GrassColorNoiseScale + 100,
        Z * GrassColorNoiseScale + 100,
        50,
      );
      ColorNoises.push(THREE.MathUtils.clamp(ColorNoise * 0.5 + 0.5, 0, 1));
    }
  }

  const CherryGrassGeometry = new THREE.InstancedBufferGeometry();
  CherryGrassGeometry.instanceCount = Randoms.length;
  CherryGrassGeometry.setAttribute("position", new THREE.Float32BufferAttribute(CherryBladePositions, 3));
  CherryGrassGeometry.setAttribute("tipness", new THREE.Float32BufferAttribute(CherryBladeTipness, 1));
  CherryGrassGeometry.setIndex(CherryBladeIndices);
  // [values, item size] for each per-blade attribute.
  const InstancedAttributes = {
    anchor: [Anchors, 2],
    random: [Randoms, 1],
    yaw: [Yaws, 1],
    heightNoise: [HeightNoises, 1],
    colorNoise: [ColorNoises, 1],
  };
  Object.entries(InstancedAttributes).forEach(([AttributeName, [Values, ItemSize]]) =>
    CherryGrassGeometry.setAttribute(
      AttributeName,
      new THREE.InstancedBufferAttribute(new Float32Array(Values), ItemSize),
    ),
  );
  // The template's own bounds don't cover the instances; keep it generous (the mesh isn't culled).
  CherryGrassGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Radius * 1.5);
  return CherryGrassGeometry;
};

// GrassSettings is copied into the uniforms by applyCherryGrassSettings, so the debug pane can
// change it live (radius and subdivisions need rebuildCherryGrassGeometry). Without
// IsGrassAnimated (reduced motion) the wind clock stands still.
export const createCherryTreeGrass = (GrassSettings, IsGrassAnimated) => {
  const CherryGrassUniforms = {
    uTime: { value: 0 },
    uGrow: { value: 0 },
    uBladeWidth: { value: 0 },
    uBladeHeight: { value: 0 },
    uBladeHeightRandomness: { value: 0 },
    uShadowIntensity: { value: 0 },
    uColor: { value: new THREE.Color() },
    uTint: { value: new THREE.Color() },
    uWindStrength: { value: 0 },
    uWindFrequency: { value: 0 },
    uWindSpeed: { value: 0 },
    uWindDirection: { value: new THREE.Vector2() },
  };
  const CherryGrassMaterial = new THREE.ShaderMaterial({
    uniforms: CherryGrassUniforms,
    vertexShader: CherryGrassVertexShader,
    fragmentShader: CherryGrassFragmentShader,
    side: THREE.DoubleSide,
  });
  const CherryGrassMesh = new THREE.Mesh(
    createCherryGrassGeometry(GrassSettings.radius, GrassSettings.subdivisions),
    CherryGrassMaterial,
  );
  // The shader moves every blade away from the template, so its bounds are wrong.
  CherryGrassMesh.frustumCulled = false;
  CherryGrassMesh.visible = false;

  // A unit circle laid flat and scaled to the radius, so a new radius never rebuilds it.
  const CherryGroundMaterial = new THREE.MeshStandardMaterial({ roughness: 1 });
  const CherryGroundMesh = new THREE.Mesh(new THREE.CircleGeometry(1, 64), CherryGroundMaterial);
  CherryGroundMesh.rotation.x = -Math.PI / 2;

  const CherryGrassGroup = new THREE.Group();
  CherryGrassGroup.add(CherryGroundMesh, CherryGrassMesh);

  // The scene only draws on demand, but the dust loop draws every frame while the tree is on
  // screen, so advancing the wind on each draw animates it whenever it can be seen.
  let LastGrassDrawTime = 0;
  CherryGrassMesh.onBeforeRender = () => {
    if (!IsGrassAnimated) return;
    const DrawTime = performance.now();
    const ElapsedSeconds = LastGrassDrawTime ? (DrawTime - LastGrassDrawTime) / 1000 : 0;
    LastGrassDrawTime = DrawTime;
    CherryGrassUniforms.uTime.value += Math.min(ElapsedSeconds, MaxGrassFrameSeconds);
  };

  const applyCherryGrassSettings = () => {
    const { x, y } = GrassSettings.windDirection;
    CherryGrassUniforms.uBladeWidth.value = GrassSettings.bladeWidth;
    CherryGrassUniforms.uBladeHeight.value = GrassSettings.bladeHeight;
    CherryGrassUniforms.uBladeHeightRandomness.value = GrassSettings.bladeHeightRandomness;
    CherryGrassUniforms.uShadowIntensity.value = GrassSettings.shadowIntensity;
    CherryGrassUniforms.uColor.value.set(GrassSettings.color);
    CherryGrassUniforms.uTint.value.set(GrassSettings.tint);
    CherryGrassUniforms.uWindStrength.value = GrassSettings.windStrength;
    CherryGrassUniforms.uWindFrequency.value = GrassSettings.windFrequency;
    CherryGrassUniforms.uWindSpeed.value = GrassSettings.windSpeed;
    CherryGrassUniforms.uWindDirection.value.set(x, y).normalize();
    CherryGroundMaterial.color.set(GrassSettings.groundColor);
  };
  applyCherryGrassSettings();

  const rebuildCherryGrassGeometry = () => {
    CherryGrassMesh.geometry.dispose();
    CherryGrassMesh.geometry = createCherryGrassGeometry(GrassSettings.radius, GrassSettings.subdivisions);
    CherryGroundMesh.scale.setScalar(GrassSettings.radius);
  };
  CherryGroundMesh.scale.setScalar(GrassSettings.radius);

  // 0 = nothing shown, 1 = full-height blades on a solid disc; follows the leaves. The ground fades
  // in with the blades and is only transparent while fading, so it never sorts against the petals.
  const setCherryGrassGrowth = (Growth) => {
    const IsGroundFading = Growth < 1;
    CherryGrassUniforms.uGrow.value = Growth;
    CherryGrassMesh.visible = Growth > 0;
    CherryGroundMesh.visible = Growth > 0;
    CherryGroundMaterial.opacity = Growth;
    if (CherryGroundMaterial.transparent !== IsGroundFading) {
      CherryGroundMaterial.transparent = IsGroundFading;
      CherryGroundMaterial.needsUpdate = true;
    }
  };
  setCherryGrassGrowth(0);

  // No dispose of its own: the scene's disposal reaches both meshes.
  return { CherryGrassGroup, applyCherryGrassSettings, rebuildCherryGrassGeometry, setCherryGrassGrowth };
};
