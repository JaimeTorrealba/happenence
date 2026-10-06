import * as THREE from "three";
import { CherryPetalVertexShader, CherryPetalFragmentShader } from "./cherryTreePetalShader.js";
import {
  createCherryPetalState,
  getCherryPetalSpawnPoint,
  reviveCherryPetal,
  stepCherryPetal,
} from "./cherryTreePetalPhysics.js";

// Cherry petals that fall from the canopy while the tree sways (cherryTreeSway.js) and vanish
// at the trunk base: a fixed pool drawn as one InstancedMesh, each petal moved on the CPU
// (cherryTreePetalPhysics.js). The tree's bend speed is the wind, so a later swipe also blows
// petals already in the air. A frame loop only runs while petals are falling or the tree moves.

// A long gap between frames (e.g. a hidden tab) is cut to this, so the petals don't jump.
const MaxPetalFrameSeconds = 1 / 30;
// How fast the air catches up with the tree's bend (per second); lower lets a gust linger.
const PetalWindEase = 3;
// Bend speeds (rad/s) below this count as still.
const PetalBendEpsilon = 1e-4;
// New petals leave the branch at this share of the air speed.
const PetalLaunchShare = 0.5;
// A tap burst throws petals sideways at up to this speed (tree units per second), either way.
const PetalBurstSpread = 0.05;
// Dead slots are drawn with this matrix, which collapses them to nothing.
const DeadPetalMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

// A unit quad (the petal shape is cut out in the shader) plus per-petal alpha and colour mix.
const createCherryPetalGeometry = (Count) => {
  const CherryPetalGeometry = new THREE.PlaneGeometry(1, 1);
  const AlphaAttribute = new THREE.InstancedBufferAttribute(new Float32Array(Count), 1);
  CherryPetalGeometry.setAttribute("aPetalAlpha", AlphaAttribute.setUsage(THREE.DynamicDrawUsage));
  CherryPetalGeometry.setAttribute(
    "aColorMix",
    new THREE.InstancedBufferAttribute(new Float32Array(Count), 1),
  );
  return CherryPetalGeometry;
};

const createCherryPetalMatrices = (Count) =>
  new THREE.InstancedBufferAttribute(new Float32Array(Count * 16), 16).setUsage(THREE.DynamicDrawUsage);

// PetalSettings is read every frame, so the debug pane can change it live (count needs
// rebuildCherryPetalPool). getCherryTreeBendVelocity gives the tree's bend speed (rad/s);
// renderCherryTreeFrame draws a frame after the petals have moved.
export const createCherryTreePetals = (
  PetalSettings,
  ModelPivot,
  getCherryTreeBendVelocity,
  renderCherryTreeFrame,
) => {
  const CherryPetalUniforms = {
    uPink: { value: new THREE.Color() },
    uWhite: { value: new THREE.Color() },
    uOpacity: { value: 0 },
  };
  // No depth write, so petals don't cut holes in each other, but the depth test still hides
  // them behind the trunk. Double-sided, as they tumble.
  const CherryPetalMaterial = new THREE.ShaderMaterial({
    uniforms: CherryPetalUniforms,
    vertexShader: CherryPetalVertexShader,
    fragmentShader: CherryPetalFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const CherryPetalMesh = new THREE.InstancedMesh(
    createCherryPetalGeometry(PetalSettings.count),
    CherryPetalMaterial,
    PetalSettings.count,
  );
  CherryPetalMesh.instanceMatrix = createCherryPetalMatrices(PetalSettings.count);
  // The petals fly far from the quad's own bounds.
  CherryPetalMesh.frustumCulled = false;

  let CherryPetals = [];
  let CherryPetalBlossomMeshes = [];
  // Height of the tree in the pivot's space, for the minimum spawn height.
  let CherryTreeHeight = 1;
  // Only once the leaves have fully faded in.
  let IsPetalSpawningEnabled = false;
  // The air's sideways speed; follows the bend speed a little late, so a gust lingers.
  let AirVelocityX = 0;
  // Fractional petals owed by the spawn rate, carried over between frames.
  let PetalSpawnDebt = 0;
  let PetalTime = 0;
  let PetalFrameId = 0;
  let LastPetalFrameTime = 0;
  const PetalSpawnPoint = new THREE.Vector3();
  const PetalScale = new THREE.Vector3();
  const PetalMatrix = new THREE.Matrix4();

  const writeCherryPetalInstances = () => {
    const AlphaAttribute = CherryPetalMesh.geometry.attributes.aPetalAlpha;
    CherryPetals.forEach((Petal, PetalIndex) => {
      AlphaAttribute.setX(PetalIndex, Petal.alpha);
      if (!Petal.isAlive) return CherryPetalMesh.setMatrixAt(PetalIndex, DeadPetalMatrix);
      const PetalSize = PetalSettings.size * Math.max(1 + PetalSettings.sizeVariation * Petal.sizeRandom, 0);
      PetalMatrix.compose(Petal.position, Petal.quaternion, PetalScale.setScalar(PetalSize));
      CherryPetalMesh.setMatrixAt(PetalIndex, PetalMatrix);
    });
    CherryPetalMesh.instanceMatrix.needsUpdate = true;
    AlphaAttribute.needsUpdate = true;
  };

  const applyCherryPetalUniforms = () => {
    CherryPetalUniforms.uPink.value.set(PetalSettings.pink);
    CherryPetalUniforms.uWhite.value.set(PetalSettings.white);
    CherryPetalUniforms.uOpacity.value = PetalSettings.opacity;
  };
  applyCherryPetalUniforms();

  // Every slot empty, sized to the current count.
  const resetCherryPetalPool = () => {
    CherryPetals = Array.from({ length: PetalSettings.count }, createCherryPetalState);
    writeCherryPetalInstances();
  };
  resetCherryPetalPool();

  const canSpawnCherryPetals = () => IsPetalSpawningEnabled && CherryPetalBlossomMeshes.length > 0;

  // Drops one petal from the canopy into a free slot. With the pool full it is skipped, rather
  // than taking a petal that is still falling.
  const spawnCherryPetal = (LaunchVelocityX) => {
    const PetalIndex = CherryPetals.findIndex((Petal) => !Petal.isAlive);
    if (PetalIndex < 0) return;
    const MinY = PetalSettings.minSpawnHeight * CherryTreeHeight;
    if (!getCherryPetalSpawnPoint(CherryPetalBlossomMeshes, ModelPivot, MinY, PetalSpawnPoint)) return;
    const Petal = CherryPetals[PetalIndex];
    reviveCherryPetal(Petal, PetalSpawnPoint, LaunchVelocityX);
    const ColorMixAttribute = CherryPetalMesh.geometry.attributes.aColorMix;
    ColorMixAttribute.setX(PetalIndex, Petal.colorMix);
    ColorMixAttribute.needsUpdate = true;
  };

  const runCherryPetalFrame = (FrameTime) => {
    const Seconds = LastPetalFrameTime
      ? Math.min((FrameTime - LastPetalFrameTime) / 1000, MaxPetalFrameSeconds)
      : 1 / 60;
    LastPetalFrameTime = FrameTime;
    PetalTime += Seconds;
    const BendVelocity = getCherryTreeBendVelocity();
    const TargetAirVelocityX = BendVelocity * PetalSettings.wind;
    AirVelocityX += (TargetAirVelocityX - AirVelocityX) * (1 - Math.exp(-PetalWindEase * Seconds));

    // A faster bend shakes more petals loose.
    if (canSpawnCherryPetals()) {
      PetalSpawnDebt +=
        Math.min(PetalSettings.rate * Math.abs(BendVelocity), PetalSettings.maxRate) * Seconds;
      for (; PetalSpawnDebt >= 1; PetalSpawnDebt -= 1) {
        spawnCherryPetal(TargetAirVelocityX * PetalLaunchShare);
      }
    } else {
      PetalSpawnDebt = 0;
    }

    CherryPetals.forEach((Petal) => {
      if (Petal.isAlive) stepCherryPetal(Petal, AirVelocityX, PetalSettings, Seconds, PetalTime);
    });
    writeCherryPetalInstances();
    applyCherryPetalUniforms();
    renderCherryTreeFrame();

    // Stops once every petal has landed and the tree is still; that last frame drew them gone.
    if (!CherryPetals.some((Petal) => Petal.isAlive) && Math.abs(BendVelocity) < PetalBendEpsilon) {
      PetalFrameId = 0;
      LastPetalFrameTime = 0;
      AirVelocityX = 0;
      PetalSpawnDebt = 0;
      return;
    }
    PetalFrameId = requestAnimationFrame(runCherryPetalFrame);
  };

  // Starts the loop if it isn't running; the sway calls this on every frame it moves the tree.
  const wakeCherryPetals = () => {
    if (!PetalFrameId) PetalFrameId = requestAnimationFrame(runCherryPetalFrame);
  };

  // Call with the rigged blossom meshes once the model is loaded and placed.
  const attachCherryBlossomMeshes = (BlossomMeshes) => {
    CherryPetalBlossomMeshes = BlossomMeshes;
    ModelPivot.updateWorldMatrix(true, true);
    const WorldToPivot = ModelPivot.matrixWorld.clone().invert();
    const BlossomBox = new THREE.Box3();
    CherryTreeHeight = BlossomMeshes.reduce((TreeTop, BlossomMesh) => {
      if (!BlossomMesh.geometry.boundingBox) BlossomMesh.geometry.computeBoundingBox();
      BlossomBox.copy(BlossomMesh.geometry.boundingBox)
        .applyMatrix4(BlossomMesh.matrixWorld)
        .applyMatrix4(WorldToPivot);
      return Math.max(TreeTop, BlossomBox.max.y);
    }, 0);
  };

  // Follows the leaves: petals only start falling once they are fully faded in. Petals already
  // in the air keep falling either way.
  const setCherryPetalsEnabled = (IsEnabled) => {
    IsPetalSpawningEnabled = IsEnabled;
  };

  // A click or tap shakes a handful of petals loose at once.
  const burstCherryPetals = () => {
    if (!canSpawnCherryPetals()) return;
    for (let BurstIndex = 0; BurstIndex < PetalSettings.tapBurst; BurstIndex++) {
      spawnCherryPetal((Math.random() * 2 - 1) * PetalBurstSpread);
    }
    wakeCherryPetals();
  };

  // A new pool size: the petals in the air are dropped.
  const rebuildCherryPetalPool = () => {
    CherryPetalMesh.geometry.dispose();
    // Frees the old instance matrix buffer.
    CherryPetalMesh.dispose();
    CherryPetalMesh.geometry = createCherryPetalGeometry(PetalSettings.count);
    CherryPetalMesh.instanceMatrix = createCherryPetalMatrices(PetalSettings.count);
    CherryPetalMesh.count = PetalSettings.count;
    resetCherryPetalPool();
  };

  // Frees the pool. The scene's disposal also reaches this mesh afterwards; that is harmless.
  const disposeCherryTreePetals = () => {
    cancelAnimationFrame(PetalFrameId);
    PetalFrameId = 0;
    CherryPetalMesh.geometry.dispose();
    CherryPetalMaterial.dispose();
    CherryPetalMesh.dispose();
  };

  return {
    CherryPetalMesh,
    attachCherryBlossomMeshes,
    setCherryPetalsEnabled,
    wakeCherryPetals,
    burstCherryPetals,
    rebuildCherryPetalPool,
    disposeCherryTreePetals,
  };
};
