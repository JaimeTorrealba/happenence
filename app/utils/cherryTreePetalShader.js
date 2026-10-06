// Shaders for the falling cherry petals (see cherryTreePetals.js). Each petal is one instance of
// a unit quad; the CPU moves and turns it through the instance matrix, and the fragment shader
// cuts the petal shape out of the quad.

export const CherryPetalVertexShader = /* glsl */ `
  attribute float aPetalAlpha;
  attribute float aColorMix;
  varying vec2 vUv;
  varying float vPetalAlpha;
  varying float vColorMix;

  void main() {
    vUv = uv;
    vPetalAlpha = aPetalAlpha;
    vColorMix = aColorMix;
    // three declares instanceMatrix for a ShaderMaterial drawn by an InstancedMesh.
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

export const CherryPetalFragmentShader = /* glsl */ `
  uniform vec3 uPink;
  uniform vec3 uWhite;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vPetalAlpha;
  varying float vColorMix;

  void main() {
    // Across goes -1..1 over the petal's width, Along from its base (0) to its tip (1).
    float Across = (vUv.x - 0.5) * 2.0;
    // Clamped: with antialiasing, edge pixels can be shaded just outside the quad, and pow() of
    // a negative Along gives NaN, which skipped the discard and drew a dark line along the base.
    float Along = clamp(vUv.y, 0.0, 1.0);
    // A teardrop: narrow at the base, widest about two thirds up, rounded at the tip.
    float HalfWidth = 1.4 * pow(Along, 0.6) * sqrt(max(1.0 - pow(Along, 3.0), 0.0));
    float SideEdge = HalfWidth - abs(Across);
    // The small notch cherry petals have at the tip.
    float NotchEdge = (length(vec2(Across * 0.5, Along - 1.0)) - 0.14) * 2.0;
    float Edge = min(SideEdge, NotchEdge);
    // Antialiased over about a pixel, whatever the petal's size on screen. Measured on the
    // coordinates (Along doubled to match Across's units), not on Edge: pow() makes Edge so steep
    // at the base that fwidth(Edge) half-filled the whole bottom row of the quad, a grey line.
    float EdgeWidth = max(max(fwidth(Across), fwidth(Along) * 2.0), 1e-4);
    float Shape = smoothstep(-EdgeWidth, EdgeWidth, Edge);
    // Written so a NaN is discarded too.
    if (!(Shape > 0.001)) discard;

    // Darker toward the base, where the petal joins the flower.
    vec3 PetalColor = mix(uPink, uWhite, vColorMix) * mix(0.82, 1.0, smoothstep(0.0, 0.45, Along));
    gl_FragColor = vec4(PetalColor, uOpacity * vPetalAlpha * Shape);
    // THREE.Color keeps the colours linear; this converts back so they match the page's hex.
    #include <colorspace_fragment>
  }
`;
