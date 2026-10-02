<script setup>
// Aurora background, ported from Vue Bits (https://vue-bits.dev/backgrounds/aurora) to plain WebGL2
// so it doesn't need the `ogl` library. Auto-imported as <AboutAuroraBackground />.
const Props = defineProps({
  // Barely-tinted warm tones, only a few shades off the #f7f7f7 page.
  colorStops: { type: Array, default: () => ["#F0E5DD", "#E9D9CE", "#F0E0E4"] },
  amplitude: { type: Number, default: 1.0 },
  blend: { type: Number, default: 1.0 },
  opacity: { type: Number, default: 1.0 },
  speed: { type: Number, default: 0.3 },
});

const AuroraVertexShader = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const AuroraFragmentShader = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
uniform float uOpacity;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Three evenly spaced stops (0, 0.5, 1) across the width.
vec3 getRampColor(float factor) {
  if (factor < 0.5) return mix(uColorStops[0], uColorStops[1], factor / 0.5);
  return mix(uColorStops[1], uColorStops[2], (factor - 0.5) / 0.5);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec3 rampColor = getRampColor(uv.x);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity) * uOpacity;
  // Unlike the original (made for dark pages), the colour isn't scaled by intensity:
  // that darkened the fading edges into grey smudges on a light background.
  fragColor = vec4(rampColor * auroraAlpha, auroraAlpha);
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
    console.error("Aurora shader error:", Gl.getShaderInfoLog(Shader));
  }
  return Shader;
};

const ContainerRef = ref(null);
let AnimationFrameId = 0;
let ContainerResizeObserver = null;
let AuroraGl = null;

onMounted(() => {
  const Container = ContainerRef.value;
  const Canvas = document.createElement("canvas");
  const Gl = Canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: true });
  if (!Gl) return; // No WebGL2: the page just has no aurora.
  AuroraGl = Gl;
  Container.appendChild(Canvas);

  const Program = Gl.createProgram();
  Gl.attachShader(Program, getCompiledShader(Gl, Gl.VERTEX_SHADER, AuroraVertexShader));
  Gl.attachShader(Program, getCompiledShader(Gl, Gl.FRAGMENT_SHADER, AuroraFragmentShader));
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
    Amplitude: Gl.getUniformLocation(Program, "uAmplitude"),
    ColorStops: Gl.getUniformLocation(Program, "uColorStops"),
    Resolution: Gl.getUniformLocation(Program, "uResolution"),
    Blend: Gl.getUniformLocation(Program, "uBlend"),
    Opacity: Gl.getUniformLocation(Program, "uOpacity"),
  };

  Gl.clearColor(0, 0, 0, 0);
  Gl.enable(Gl.BLEND);
  Gl.blendFunc(Gl.ONE, Gl.ONE_MINUS_SRC_ALPHA);

  const resizeCanvasToContainer = () => {
    const PixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    Canvas.width = Math.max(1, Math.floor(Container.offsetWidth * PixelRatio));
    Canvas.height = Math.max(1, Math.floor(Container.offsetHeight * PixelRatio));
    Gl.viewport(0, 0, Canvas.width, Canvas.height);
  };

  const renderAuroraFrame = (Timestamp) => {
    Gl.uniform1f(Uniforms.Time, Timestamp * 0.01 * Props.speed * 0.1);
    Gl.uniform1f(Uniforms.Amplitude, Props.amplitude);
    Gl.uniform1f(Uniforms.Blend, Props.blend);
    Gl.uniform1f(Uniforms.Opacity, Props.opacity);
    Gl.uniform3fv(Uniforms.ColorStops, new Float32Array(Props.colorStops.flatMap(getRgbFromHex)));
    Gl.uniform2f(Uniforms.Resolution, Canvas.width, Canvas.height);
    Gl.clear(Gl.COLOR_BUFFER_BIT);
    Gl.drawArrays(Gl.TRIANGLES, 0, 3);
  };

  // Reduced motion: draw a single still frame instead of animating.
  const IsReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animateAurora = (Timestamp) => {
    renderAuroraFrame(Timestamp);
    if (!IsReducedMotion) AnimationFrameId = requestAnimationFrame(animateAurora);
  };

  ContainerResizeObserver = new ResizeObserver(() => {
    resizeCanvasToContainer();
    if (IsReducedMotion) renderAuroraFrame(0);
  });
  ContainerResizeObserver.observe(Container);
  resizeCanvasToContainer();
  AnimationFrameId = requestAnimationFrame(animateAurora);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(AnimationFrameId);
  ContainerResizeObserver?.disconnect();
  AuroraGl?.getExtension("WEBGL_lose_context")?.loseContext();
});
</script>

<template>
  <div ref="ContainerRef" class="aurora-background" aria-hidden="true" />
</template>

<style scoped>
.aurora-background {
  width: 100%;
  height: 100%;
}
.aurora-background :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
