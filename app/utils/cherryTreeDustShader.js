// Shaders for the dust motes around the home page cherry tree (see cherryTreeDust.js). All the
// motion is worked out here from uTime, so the CPU does no per-mote work.
// The position attribute holds each mote's start point, 0..1 on each axis of the dust box.

export const CherryDustVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uWobble;
  uniform float uTwinkle;
  uniform float uSize;
  uniform float uSizeVariation;
  uniform float uPixelRatio;
  uniform float uSizeDistance;
  uniform vec3 uArea;
  attribute float aSeed;
  attribute float aColorMix;
  attribute float aScale;
  varying float vColorMix;
  varying float vAlpha;

  void main() {
    // Rises slowly and wraps from the top of the box back to the bottom.
    vec3 BoxPoint = position;
    BoxPoint.y = fract(BoxPoint.y + uTime * uSpeed / max(uArea.y, 0.001));

    // Centred on the trunk with its base on the ground, plus a sideways wobble.
    float Phase = aSeed * 6.2831853;
    float WobbleRate = 0.4 + 0.5 * fract(aSeed * 7.31);
    vec3 DustPosition = (BoxPoint - vec3(0.5, 0.0, 0.5)) * uArea;
    DustPosition.x += sin(uTime * WobbleRate + Phase) * uWobble;
    DustPosition.z += cos(uTime * WobbleRate * 0.8 + Phase) * uWobble;

    // Fades in at the bottom and out at the top so the wrap never pops, and out toward the
    // sides so the cloud is round instead of boxy.
    float EdgeFade = smoothstep(0.0, 0.15, BoxPoint.y) * (1.0 - smoothstep(0.85, 1.0, BoxPoint.y));
    EdgeFade *= 1.0 - smoothstep(0.6, 1.0, length((BoxPoint.xz - 0.5) * 2.0));

    // Each mote pulses at its own pace; uTwinkle sets how deep the pulse goes.
    float TwinkleRate = 0.8 + 1.2 * fract(aSeed * 3.17);
    float Twinkle = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * TwinkleRate + Phase * 2.0));

    vColorMix = aColorMix;
    vAlpha = EdgeFade * Twinkle;
    vec4 MvPosition = modelViewMatrix * vec4(DustPosition, 1.0);
    gl_Position = projectionMatrix * MvPosition;
    // uSize is in px at the tree's distance (uSizeDistance); nearer motes are bigger.
    gl_PointSize = uSize * mix(1.0, aScale, uSizeVariation) * uPixelRatio * uSizeDistance / -MvPosition.z;
  }
`;

export const CherryDustFragmentShader = /* glsl */ `
  uniform vec3 uYellow;
  uniform vec3 uPink;
  uniform float uOpacity;
  uniform float uSoftness;
  uniform float uFade;
  varying float vColorMix;
  varying float vAlpha;

  void main() {
    // A round disc whose edge feathers inward as the softness goes up.
    float Distance = length(gl_PointCoord - 0.5) * 2.0;
    if (Distance > 1.0) discard;
    float Disc = 1.0 - smoothstep(1.0 - max(uSoftness, 0.01), 1.0, Distance);
    gl_FragColor = vec4(mix(uYellow, uPink, vColorMix), uOpacity * uFade * vAlpha * Disc);
    // THREE.Color keeps the colours linear; this converts back so they match the page's hex.
    #include <colorspace_fragment>
  }
`;
