// Shaders for the grass disc under the home page cherry tree (see cherryTreeGrass.js), ported from
// Tres's rapier-car GrassField without the splat texture and trample trails. Each instance is one
// blade: the 5-vertex template is scaled, turned and bent here, so the CPU does no per-blade work.

export const CherryGrassVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uGrow;
  uniform float uBladeWidth;
  uniform float uBladeHeight;
  uniform float uBladeHeightRandomness;
  uniform float uWindStrength;
  uniform float uWindFrequency;
  uniform float uWindSpeed;
  uniform vec2 uWindDirection;
  attribute float tipness;
  attribute vec2 anchor;
  attribute float random;
  attribute float yaw;
  attribute float heightNoise;
  attribute float colorNoise;
  varying float vTipness;
  varying float vColorNoise;

  vec2 rotateCherryGrass(vec2 Point, float Angle) {
    float Sine = sin(Angle);
    float Cosine = cos(Angle);
    return vec2(Point.x * Cosine - Point.y * Sine, Point.x * Sine + Point.y * Cosine);
  }

  void main() {
    // Per-blade randomness times the baked patch noise; uGrow raises the blades with the leaves.
    float Height = uBladeHeight * mix(1.0, random, uBladeHeightRandomness) * heightNoise * uGrow;
    vec3 Local = vec3(position.x * uBladeWidth, position.y * Height, 0.0);
    // A random turn around the blade base.
    Local.xz = rotateCherryGrass(Local.xz, yaw);

    // A wave travelling across the disc. The bend scales with tipness, so the base stays planted
    // and the tip moves furthest.
    float Phase = dot(anchor, uWindDirection) * uWindFrequency + uTime * uWindSpeed;
    float Wave = sin(Phase) + 0.5 * sin(Phase * 2.3 + 1.7);
    vec2 Bend = uWindDirection * Wave * uWindStrength * tipness * uGrow;

    vec3 GrassPosition = vec3(Local.x + anchor.x + Bend.x, Local.y, Local.z + anchor.y + Bend.y);
    vTipness = tipness;
    vColorNoise = colorNoise;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(GrassPosition, 1.0);
  }
`;

export const CherryGrassFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uTint;
  uniform float uShadowIntensity;
  varying float vTipness;
  varying float vColorNoise;

  void main() {
    // Small per-blade variation so neighbours differ.
    vec3 Base = uColor * mix(0.85, 1.15, vColorNoise);
    // A darker base fakes the shade inside dense grass.
    float Shade = (1.0 - vTipness) * uShadowIntensity;
    // Unlit: the tint stands in for the scene lighting.
    gl_FragColor = vec4(mix(Base, Base * 0.35, Shade) * uTint, 1.0);
    #include <tonemapping_fragment>
    // THREE.Color keeps the colours linear; this converts back so they match the page's hex.
    #include <colorspace_fragment>
  }
`;
