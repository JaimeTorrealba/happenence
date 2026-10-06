import * as THREE from "three";
import { CherryDustVertexShader, CherryDustFragmentShader } from "./cherryTreeDustShader.js";

// Soft dust motes floating around the home page cherry tree: one Points cloud whose motion is
// all in the shader (cherryTreeDustShader.js). The rest of the scene only draws on demand, so the
// dust owns a frame loop that runs only while the tree is on screen.

// A long gap between frames (e.g. a hidden tab) is cut to this, so the dust doesn't jump.
const MaxDustFrameSeconds = 1 / 30;
// The smallest mote at a size variation of 1, as a fraction of the size (the largest is 2×).
const MinDustScale = 0.1;

// Random start points (0..1 in the dust box), plus a seed, colour mix and size factor per mote.
const createCherryDustGeometry = (Count) => {
  const StartPoints = new Float32Array(Count * 3);
  const Seeds = new Float32Array(Count);
  const ColorMixes = new Float32Array(Count);
  const Scales = new Float32Array(Count);
  for (let Index = 0; Index < Count; Index++) {
    StartPoints[Index * 3] = Math.random();
    StartPoints[Index * 3 + 1] = Math.random();
    StartPoints[Index * 3 + 2] = Math.random();
    Seeds[Index] = Math.random();
    ColorMixes[Index] = Math.random();
    Scales[Index] = MinDustScale + Math.random() * (2 - MinDustScale);
  }
  const CherryDustGeometry = new THREE.BufferGeometry();
  CherryDustGeometry.setAttribute("position", new THREE.BufferAttribute(StartPoints, 3));
  CherryDustGeometry.setAttribute("aSeed", new THREE.BufferAttribute(Seeds, 1));
  CherryDustGeometry.setAttribute("aColorMix", new THREE.BufferAttribute(ColorMixes, 1));
  CherryDustGeometry.setAttribute("aScale", new THREE.BufferAttribute(Scales, 1));
  return CherryDustGeometry;
};

// DustSettings is copied into the uniforms by applyCherryDustSettings, so the debug pane can
// change it live (count needs rebuildCherryDustGeometry). drawCherryTreeFrame draws the scene.
// Without IsDustAnimated (reduced motion) there is no loop: the motes stay still.
export const createCherryTreeDust = (DustSettings, Container, drawCherryTreeFrame, IsDustAnimated) => {
  const CherryDustUniforms = {
    uTime: { value: 0 },
    uFade: { value: 0 },
    uPixelRatio: { value: 1 },
    uSizeDistance: { value: 1 },
    uSize: { value: 0 },
    uSizeVariation: { value: 0 },
    uOpacity: { value: 0 },
    uSoftness: { value: 0 },
    uSpeed: { value: 0 },
    uWobble: { value: 0 },
    uTwinkle: { value: 0 },
    uArea: { value: new THREE.Vector3() },
    uYellow: { value: new THREE.Color() },
    uPink: { value: new THREE.Color() },
  };
  // Normal blending: additive would vanish on the light page. No depth write, so the motes
  // don't hide each other, but the depth test still hides them behind the trunk.
  const CherryDustMaterial = new THREE.ShaderMaterial({
    uniforms: CherryDustUniforms,
    vertexShader: CherryDustVertexShader,
    fragmentShader: CherryDustFragmentShader,
    transparent: true,
    depthWrite: false,
  });
  const CherryDustPoints = new THREE.Points(
    createCherryDustGeometry(DustSettings.count),
    CherryDustMaterial,
  );
  // The shader moves the motes away from their position attribute, so its bounds are wrong.
  CherryDustPoints.frustumCulled = false;
  CherryDustPoints.visible = false;

  // Keeps the size in px at the tree's distance, whatever the camera framing and pixel ratio.
  const CherryDustWorldPosition = new THREE.Vector3();
  CherryDustPoints.onBeforeRender = (Renderer, Scene, Camera) => {
    CherryDustPoints.getWorldPosition(CherryDustWorldPosition);
    CherryDustUniforms.uSizeDistance.value = CherryDustWorldPosition.distanceTo(Camera.position);
    CherryDustUniforms.uPixelRatio.value = Renderer.getPixelRatio();
  };

  const applyCherryDustSettings = () => {
    const { width, height, depth } = DustSettings.area;
    CherryDustUniforms.uSize.value = DustSettings.size;
    CherryDustUniforms.uSizeVariation.value = DustSettings.sizeVariation;
    CherryDustUniforms.uOpacity.value = DustSettings.opacity;
    CherryDustUniforms.uSoftness.value = DustSettings.softness;
    CherryDustUniforms.uSpeed.value = DustSettings.speed;
    CherryDustUniforms.uWobble.value = DustSettings.wobble;
    CherryDustUniforms.uTwinkle.value = DustSettings.twinkle;
    CherryDustUniforms.uArea.value.set(width, height, depth);
    CherryDustUniforms.uYellow.value.set(DustSettings.yellow);
    CherryDustUniforms.uPink.value.set(DustSettings.pink);
  };
  applyCherryDustSettings();

  const rebuildCherryDustGeometry = () => {
    CherryDustPoints.geometry.dispose();
    CherryDustPoints.geometry = createCherryDustGeometry(DustSettings.count);
  };

  // 0 = hidden, 1 = fully shown; follows the leaves.
  const setCherryDustFade = (Fade) => {
    CherryDustUniforms.uFade.value = Fade;
    CherryDustPoints.visible = Fade > 0;
  };

  let DustFrameId = 0;
  let LastDustFrameTime = 0;

  const stepCherryDust = (FrameTime) => {
    const ElapsedSeconds = LastDustFrameTime ? (FrameTime - LastDustFrameTime) / 1000 : 0;
    LastDustFrameTime = FrameTime;
    CherryDustUniforms.uTime.value += Math.min(ElapsedSeconds, MaxDustFrameSeconds);
    drawCherryTreeFrame();
    DustFrameId = requestAnimationFrame(stepCherryDust);
  };

  const startCherryDustLoop = () => {
    if (DustFrameId) return;
    LastDustFrameTime = 0;
    DustFrameId = requestAnimationFrame(stepCherryDust);
  };

  const stopCherryDustLoop = () => {
    cancelAnimationFrame(DustFrameId);
    DustFrameId = 0;
  };

  // While this runs it draws every frame, so other changes don't need to draw their own.
  const isCherryDustRunning = () => DustFrameId !== 0;

  // Runs the loop only while the tree is on screen.
  let CherryDustObserver = null;
  if (IsDustAnimated) {
    CherryDustObserver = new IntersectionObserver((Entries) => {
      if (Entries.at(-1).isIntersecting) startCherryDustLoop();
      else stopCherryDustLoop();
    });
    CherryDustObserver.observe(Container);
  }

  // The scene's disposal only covers meshes, so the dust frees its own geometry and material.
  const disposeCherryTreeDust = () => {
    stopCherryDustLoop();
    CherryDustObserver?.disconnect();
    CherryDustPoints.geometry.dispose();
    CherryDustMaterial.dispose();
  };

  return {
    CherryDustPoints,
    applyCherryDustSettings,
    rebuildCherryDustGeometry,
    setCherryDustFade,
    isCherryDustRunning,
    disposeCherryTreeDust,
  };
};
