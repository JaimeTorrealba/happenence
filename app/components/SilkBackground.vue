<script setup>
// Silk background, ported from Vue Bits (https://vue-bits.dev/backgrounds/silk) to plain WebGL2
// so it doesn't need the `ogl` library. Auto-imported as <SilkBackground />; used on About and Contents.
const Props = defineProps({
  speed: { type: Number, default: 15 },
  scale: { type: Number, default: 1 },
  color: { type: String, default: "#ffffff" },
  // The color the folds fade into. The original always fades to black.
  shadowColor: { type: String, default: "#f5f3ee" },
  noiseIntensity: { type: Number, default: 1.5 },
  rotation: { type: Number, default: 0 },
});

const SilkVertexShader = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const SilkFragmentShader = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uShadowColor;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;
uniform vec2 uResolution;

out vec4 fragColor;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2 r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  return rot * uv;
}

void main() {
  // The original draws a plane sized to fill the camera view, so its UVs span the screen.
  vec2 vUv = gl_FragCoord.xy / uResolution;
  float rnd = noise(gl_FragCoord.xy);
  vec2 uv = rotateUvs(vUv * uScale, uRotation);
  vec2 tex = uv * uScale;
  float tOffset = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
                  0.4 * sin(5.0 * (tex.x + tex.y +
                                   cos(3.0 * tex.x + 5.0 * tex.y) +
                                   0.02 * tOffset) +
                           sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  // The original is uColor * pattern, i.e. a blend from black to uColor; here black is uShadowColor.
  vec4 col = vec4(mix(uShadowColor, uColor, pattern), 1.0) - rnd / 15.0 * uNoiseIntensity;
  col.a = 1.0;
  fragColor = col;
}
`;

const getRgbFromHex = (Hex) => {
  const Value = parseInt(Hex.replace("#", ""), 16);
  return [((Value >> 16) & 255) / 255, ((Value >> 8) & 255) / 255, (Value & 255) / 255];
};

const getCompiledShader = (Gl, Type, Source) => {
  const Shader = Gl.createShader(Type);
  Gl.shaderSource(Shader, Source);
  Gl.compileShader(Shader);
  if (!Gl.getShaderParameter(Shader, Gl.COMPILE_STATUS)) {
    console.error("Silk shader error:", Gl.getShaderInfoLog(Shader));
  }
  return Shader;
};

// Mutable copy of the props that the render loop reads, so the #debug pane can tweak it live.
const SilkSettings = { ...Props };

const ContainerRef = ref(null);
let AnimationFrameId = 0;
let ContainerResizeObserver = null;
let SilkGl = null;
let SilkDebugPane = null;
let IsUnmounted = false;

onMounted(() => {
  const Container = ContainerRef.value;
  const Canvas = document.createElement("canvas");
  const Gl = Canvas.getContext("webgl2", { alpha: true, antialias: true });
  if (!Gl) return; // No WebGL2: the page just has no silk.
  SilkGl = Gl;
  Container.appendChild(Canvas);

  const Program = Gl.createProgram();
  Gl.attachShader(Program, getCompiledShader(Gl, Gl.VERTEX_SHADER, SilkVertexShader));
  Gl.attachShader(Program, getCompiledShader(Gl, Gl.FRAGMENT_SHADER, SilkFragmentShader));
  Gl.linkProgram(Program);
  Gl.useProgram(Program);

  // One triangle that covers the whole viewport.
  Gl.bindBuffer(Gl.ARRAY_BUFFER, Gl.createBuffer());
  Gl.bufferData(Gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), Gl.STATIC_DRAW);
  const PositionLocation = Gl.getAttribLocation(Program, "position");
  Gl.enableVertexAttribArray(PositionLocation);
  Gl.vertexAttribPointer(PositionLocation, 2, Gl.FLOAT, false, 0, 0);

  const Uniforms = {
    Time: Gl.getUniformLocation(Program, "uTime"),
    Color: Gl.getUniformLocation(Program, "uColor"),
    ShadowColor: Gl.getUniformLocation(Program, "uShadowColor"),
    Speed: Gl.getUniformLocation(Program, "uSpeed"),
    Scale: Gl.getUniformLocation(Program, "uScale"),
    Rotation: Gl.getUniformLocation(Program, "uRotation"),
    NoiseIntensity: Gl.getUniformLocation(Program, "uNoiseIntensity"),
    Resolution: Gl.getUniformLocation(Program, "uResolution"),
  };

  const resizeCanvasToContainer = () => {
    // The pattern is soft, so 1x looks the same on retina screens at a quarter of the pixels to shade.
    const PixelRatio = Math.min(window.devicePixelRatio || 1, 1);
    Canvas.width = Math.max(1, Math.floor(Container.offsetWidth * PixelRatio));
    Canvas.height = Math.max(1, Math.floor(Container.offsetHeight * PixelRatio));
    Gl.viewport(0, 0, Canvas.width, Canvas.height);
  };

  const renderSilkFrame = (Timestamp) => {
    // Same clock as the original: uTime advances 0.1 per second.
    Gl.uniform1f(Uniforms.Time, Timestamp * 0.0001);
    Gl.uniform3fv(Uniforms.Color, getRgbFromHex(SilkSettings.color));
    Gl.uniform3fv(Uniforms.ShadowColor, getRgbFromHex(SilkSettings.shadowColor));
    Gl.uniform1f(Uniforms.Speed, SilkSettings.speed);
    Gl.uniform1f(Uniforms.Scale, SilkSettings.scale);
    Gl.uniform1f(Uniforms.Rotation, SilkSettings.rotation);
    Gl.uniform1f(Uniforms.NoiseIntensity, SilkSettings.noiseIntensity);
    Gl.uniform2f(Uniforms.Resolution, Canvas.width, Canvas.height);
    Gl.drawArrays(Gl.TRIANGLES, 0, 3);
  };

  // Reduced motion: draw a single still frame instead of animating.
  const IsReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animateSilk = (Timestamp) => {
    renderSilkFrame(Timestamp);
    if (!IsReducedMotion) AnimationFrameId = requestAnimationFrame(animateSilk);
  };

  ContainerResizeObserver = new ResizeObserver(() => {
    resizeCanvasToContainer();
    if (IsReducedMotion) renderSilkFrame(0);
  });
  ContainerResizeObserver.observe(Container);
  resizeCanvasToContainer();
  AnimationFrameId = requestAnimationFrame(animateSilk);

  // Dev-only tuning panel: the dynamic import keeps Tweakpane in its own chunk,
  // fetched only when the URL hash is #debug.
  if (window.location.hash === "#debug") {
    import("~/debug/SilkDebugPane.js").then(({ createSilkDebugPane }) => {
      if (IsUnmounted) return;
      // Reduced motion has no animation loop, so redraw the still frame on every change.
      SilkDebugPane = createSilkDebugPane(SilkSettings, () => IsReducedMotion && renderSilkFrame(0));
    });
  }
});

onBeforeUnmount(() => {
  IsUnmounted = true;
  SilkDebugPane?.dispose();
  cancelAnimationFrame(AnimationFrameId);
  ContainerResizeObserver?.disconnect();
});
// The silk stays frozen on its last frame until the transition overlay has covered it.
useDisposeAfterPageLeave(() => SilkGl?.getExtension("WEBGL_lose_context")?.loseContext());
</script>

<template>
  <div ref="ContainerRef" class="silk-background" aria-hidden="true" />
</template>

<style scoped>
/* Fixed behind the whole viewport (navbar included). z-index -1 keeps it under every
   element but above the body background; the footer's own background still covers it. */
.silk-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}
.silk-background :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
