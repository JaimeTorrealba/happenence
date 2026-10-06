import * as THREE from "three";

// Motion of one falling cherry petal (the pool lives in cherryTreePetals.js). Everything is in
// the tree pivot's space: the trunk base is at y = 0, which is the floor the petals land on.

// Petals fade in over their first moments in the air, so they don't pop into view.
const PetalFadeInSeconds = 0.15;
// A safety net (e.g. a fall speed of 0 in the debug pane): no petal stays up longer than this.
const MaxPetalSeconds = 30;
// Tries at finding a blossom point above the minimum height before a spawn is skipped.
const MaxSpawnTries = 8;
// How much faster a petal tumbles per tree unit per second of air speed.
const PetalSpinWindBoost = 2;

const PetalAirVelocity = new THREE.Vector3();
const PetalSpinStep = new THREE.Quaternion();
const PetalCornerA = new THREE.Vector3();
const PetalCornerB = new THREE.Vector3();

// One slot of the petal pool; reviveCherryPetal fills it in when a petal leaves the tree.
export const createCherryPetalState = () => ({
  isAlive: false,
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  spinAxis: new THREE.Vector3(0, 1, 0),
  // Per-petal factors, so they don't all spin, flutter or size up alike.
  spinScale: 1,
  seed: 0,
  // -1..1, scaled by the size variation when the petal is drawn.
  sizeRandom: 0,
  colorMix: 0,
  age: 0,
  alpha: 0,
});

// The current (bent) position of a blossom vertex, in the pivot's space. getVertexPosition
// applies the skinning, so petals leave from where the leaves are drawn mid-sway.
const getCherryBlossomVertexInPivot = (Mesh, VertexIndex, ModelPivot, Target) => {
  Mesh.getVertexPosition(VertexIndex, Target).applyMatrix4(Mesh.matrixWorld);
  return ModelPivot.worldToLocal(Target);
};

// Writes a random point on a random blossom card (above MinY) into Target. Returns false if
// none was found, so the spawn can be skipped.
export const getCherryPetalSpawnPoint = (BlossomMeshes, ModelPivot, MinY, Target) => {
  for (let SpawnTry = 0; SpawnTry < MaxSpawnTries; SpawnTry++) {
    const Mesh = BlossomMeshes[Math.floor(Math.random() * BlossomMeshes.length)];
    const { index: BlossomIndex, attributes } = Mesh.geometry;
    const TriangleCount = Math.floor((BlossomIndex ?? attributes.position).count / 3);
    if (!TriangleCount) continue;
    // A random point inside a random triangle, so petals don't all start at card corners.
    const Triangle = Math.floor(Math.random() * TriangleCount);
    const [VertexA, VertexB, VertexC] = [0, 1, 2].map((Corner) =>
      BlossomIndex ? BlossomIndex.getX(Triangle * 3 + Corner) : Triangle * 3 + Corner,
    );
    let ShareB = Math.random();
    let ShareC = Math.random();
    if (ShareB + ShareC > 1) {
      ShareB = 1 - ShareB;
      ShareC = 1 - ShareC;
    }
    getCherryBlossomVertexInPivot(Mesh, VertexA, ModelPivot, Target);
    getCherryBlossomVertexInPivot(Mesh, VertexB, ModelPivot, PetalCornerA).sub(Target);
    getCherryBlossomVertexInPivot(Mesh, VertexC, ModelPivot, PetalCornerB).sub(Target);
    Target.addScaledVector(PetalCornerA, ShareB).addScaledVector(PetalCornerB, ShareC);
    if (Target.y >= MinY) return true;
  }
  return false;
};

// Starts a petal at Position, moving sideways at LaunchVelocityX, with a random tumble.
export const reviveCherryPetal = (Petal, Position, LaunchVelocityX) => {
  Petal.isAlive = true;
  Petal.position.copy(Position);
  Petal.velocity.set(LaunchVelocityX, 0, 0);
  Petal.quaternion.random();
  Petal.spinAxis.randomDirection();
  Petal.spinScale = 0.5 + Math.random();
  Petal.seed = Math.random();
  Petal.sizeRandom = Math.random() * 2 - 1;
  Petal.colorMix = Math.random();
  Petal.age = 0;
  Petal.alpha = 0;
};

// Moves a live petal on by Seconds. The air blows at AirVelocityX (the tree's sway as wind)
// plus a gentle flutter of its own, and sinks at the fall speed; drag pulls the petal's
// velocity toward it. Time is the running clock that drives the flutter.
export const stepCherryPetal = (Petal, AirVelocityX, PetalSettings, Seconds, Time) => {
  const { fallSpeed, drag, flutter, spin, fadeHeight } = PetalSettings;
  const FlutterPhase = Time * (2 + 2 * Petal.seed) + Petal.seed * Math.PI * 2;
  PetalAirVelocity.set(
    AirVelocityX + Math.sin(FlutterPhase) * flutter,
    -fallSpeed,
    Math.cos(FlutterPhase * 0.8) * flutter,
  );
  Petal.velocity.lerp(PetalAirVelocity, Math.min(drag * Seconds, 1));
  Petal.position.addScaledVector(Petal.velocity, Seconds);

  // Tumbles around its own axis, faster in a stronger wind.
  const SpinAngle = spin * Petal.spinScale * (1 + Math.abs(AirVelocityX) * PetalSpinWindBoost) * Seconds;
  Petal.quaternion.premultiply(PetalSpinStep.setFromAxisAngle(Petal.spinAxis, SpinAngle));

  Petal.age += Seconds;
  if (Petal.position.y <= 0 || Petal.age > MaxPetalSeconds) {
    Petal.isAlive = false;
    Petal.alpha = 0;
    return;
  }
  const FadeIn = Math.min(Petal.age / PetalFadeInSeconds, 1);
  const FadeOut = THREE.MathUtils.clamp(Petal.position.y / Math.max(fadeHeight, 1e-4), 0, 1);
  Petal.alpha = FadeIn * FadeOut;
};
