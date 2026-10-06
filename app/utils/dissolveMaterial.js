import * as THREE from "three";

// Bottom-up dissolve, adapted from the creative-lab dissolve-tsl demo. Each pixel gets a value
// from its height (0 at the base, 1 at the top) plus a bit of noise so the edge is ragged.
// Pixels whose value is above uDissolveProgress are cut away, and a band just below it is
// painted and lit in the border colour (fading out downward when soft), so the rising edge
// glows. Tweening the progress upward makes the mesh grow from the bottom.
// The noise is generated in the shader (3D, from world position), so it needs no texture.

const DissolveNoiseGlsl = /* glsl */ `
  uniform float uDissolveProgress;
  uniform vec2 uDissolveHeightRange;
  uniform float uDissolveNoiseStrength;
  uniform float uDissolveBorderSize;
  uniform float uDissolveBorderSoftness;
  uniform float uDissolveBorderGlow;
  uniform float uDissolveNoiseScale;
  uniform vec3 uDissolveNoiseOffset;
  uniform vec3 uDissolveBorderColor;
  varying vec3 vDissolvePosition;

  float getDissolveHash(vec3 Point) {
    Point = fract(Point * 0.3183099 + 0.1);
    Point *= 17.0;
    return fract(Point.x * Point.y * Point.z * (Point.x + Point.y + Point.z));
  }

  // Smooth 3D value noise in 0..1, like the red channel of a perlin texture.
  float getDissolveValueNoise(vec3 Point) {
    vec3 Cell = floor(Point);
    vec3 Blend = fract(Point);
    Blend = Blend * Blend * (3.0 - 2.0 * Blend);
    return mix(
      mix(
        mix(getDissolveHash(Cell), getDissolveHash(Cell + vec3(1, 0, 0)), Blend.x),
        mix(getDissolveHash(Cell + vec3(0, 1, 0)), getDissolveHash(Cell + vec3(1, 1, 0)), Blend.x),
        Blend.y),
      mix(
        mix(getDissolveHash(Cell + vec3(0, 0, 1)), getDissolveHash(Cell + vec3(1, 0, 1)), Blend.x),
        mix(getDissolveHash(Cell + vec3(0, 1, 1)), getDissolveHash(Cell + vec3(1, 1, 1)), Blend.x),
        Blend.y),
      Blend.z);
  }

  float getDissolveNoise(vec3 Point) {
    return 0.65 * getDissolveValueNoise(Point) + 0.35 * getDissolveValueNoise(Point * 2.0);
  }
`;

// Animate uDissolveProgress from getDissolveStartProgress (nothing shown) to
// getDissolveEndProgress (everything shown, no border left).
export const createDissolveUniforms = ({
  BorderSize = 0.03,
  BorderSoftness = 0,
  BorderGlow = 1,
  NoiseScale = 6,
  BorderColor = "#000000",
} = {}) => ({
  // Starts well below any pixel's value, so the mesh is hidden until the tween runs.
  uDissolveProgress: { value: -10 },
  // World-space bottom and top of the mesh (see setDissolveHeightRange).
  uDissolveHeightRange: { value: new THREE.Vector2(0, 1) },
  // How ragged the rising edge is, as a fraction of the mesh height.
  uDissolveNoiseStrength: { value: 0.3 },
  // Height of the border band, as a fraction of the mesh height.
  uDissolveBorderSize: { value: BorderSize },
  // 0 is a hard band; 1 fades it out smoothly from the edge down.
  uDissolveBorderSoftness: { value: BorderSoftness },
  // Multiplies the border's own light; above 1 it outshines the lit surface around it.
  uDissolveBorderGlow: { value: BorderGlow },
  uDissolveNoiseScale: { value: NoiseScale },
  // Slides the noise pattern through the mesh, changing the shape of the edge.
  uDissolveNoiseOffset: { value: new THREE.Vector3() },
  uDissolveBorderColor: { value: new THREE.Color(BorderColor) },
});

// Copies tunable settings (e.g. CherryTreeSettings.dissolve in HomeCherryTree.vue) onto the uniforms.
export const applyDissolveSettings = (DissolveUniforms, DissolveSettings) => {
  const { noiseStrength, noiseScale, noiseOffset, borderColor, borderSize, borderSoftness, borderGlow } =
    DissolveSettings;
  DissolveUniforms.uDissolveNoiseStrength.value = noiseStrength;
  DissolveUniforms.uDissolveNoiseScale.value = noiseScale;
  DissolveUniforms.uDissolveNoiseOffset.value.set(noiseOffset.x, noiseOffset.y, noiseOffset.z);
  DissolveUniforms.uDissolveBorderColor.value.set(borderColor);
  DissolveUniforms.uDissolveBorderSize.value = borderSize;
  DissolveUniforms.uDissolveBorderSoftness.value = borderSoftness;
  DissolveUniforms.uDissolveBorderGlow.value = borderGlow;
};

// The noise moves values by up to ±half the strength, so the reveal must start and end that far
// beyond 0 and 1 (plus the border at the end) to be fully hidden and fully shown.
export const getDissolveStartProgress = (DissolveUniforms) =>
  -DissolveUniforms.uDissolveNoiseStrength.value / 2;
export const getDissolveEndProgress = (DissolveUniforms) =>
  1 + DissolveUniforms.uDissolveNoiseStrength.value / 2 + DissolveUniforms.uDissolveBorderSize.value;

// Measures the meshes' world-space bottom and top so height 0..1 spans them exactly.
// Call again whenever their placement or scale changes.
export const setDissolveHeightRange = (DissolveUniforms, Meshes) => {
  if (!Meshes.length) return; // Model not loaded yet.
  const MeshesBox = new THREE.Box3();
  Meshes.forEach((Mesh) => {
    Mesh.updateWorldMatrix(true, false);
    MeshesBox.expandByObject(Mesh);
  });
  DissolveUniforms.uDissolveHeightRange.value.set(MeshesBox.min.y, MeshesBox.max.y);
};

// Patches a built-in material (e.g. the MeshStandardMaterial from GLTFLoader) in place.
export const addDissolveToMaterial = (Material, DissolveUniforms) => {
  Material.onBeforeCompile = (Shader) => {
    Object.assign(Shader.uniforms, DissolveUniforms);

    Shader.vertexShader = Shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vDissolvePosition;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvDissolvePosition = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );

    Shader.fragmentShader = Shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${DissolveNoiseGlsl}`)
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float DissolveHeight = (vDissolvePosition.y - uDissolveHeightRange.x)
          / max(uDissolveHeightRange.y - uDissolveHeightRange.x, 0.0001);
        float DissolveNoise = getDissolveNoise(vDissolvePosition * uDissolveNoiseScale + uDissolveNoiseOffset);
        float DissolveValue = DissolveHeight + (DissolveNoise - 0.5) * uDissolveNoiseStrength;
        if (DissolveValue > uDissolveProgress) discard;
        // 1 at the rising edge, 0 below the border band.
        float DissolveBorderStart = uDissolveProgress - uDissolveBorderSize;
        float DissolveBorder = mix(
          step(DissolveBorderStart, DissolveValue),
          smoothstep(DissolveBorderStart, uDissolveProgress, DissolveValue),
          uDissolveBorderSoftness);
        diffuseColor.rgb = mix(diffuseColor.rgb, uDissolveBorderColor, DissolveBorder);`,
      )
      // The border also glows with its own colour, so it stays bright in shadow.
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance = mix(
          totalEmissiveRadiance, uDissolveBorderColor * uDissolveBorderGlow, DissolveBorder);`,
      );
  };
  // Keeps three from reusing an unpatched program compiled for the same material type.
  Material.customProgramCacheKey = () => "dissolve";
  Material.needsUpdate = true;
};
