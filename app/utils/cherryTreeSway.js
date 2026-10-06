import * as THREE from "three";

// Spring physics that bends the rigged cherry tree (see cherryTreeRig.js) toward mouse swipes,
// plus a short zigzag when the tree is clicked or tapped. The tree is still most of the time,
// so a frame loop only runs while something is moving and stops by itself once it settles.

// A long gap between frames (e.g. a hidden tab) is cut to this, so the tree doesn't jump.
const MaxSwayFrameSeconds = 1 / 30;
// Fixed physics step; a frame is split into steps of this size so the springs stay stable.
const SwayStepSeconds = 1 / 120;
// Angles and speeds below this count as at rest.
const SwayRestEpsilon = 1e-4;
// The latest any branch starts the tap zigzag after the trunk, so the canopy ripples.
const MaxTapRippleSeconds = 0.08;

// Moves a damped spring one step toward its target angle.
const stepSwaySpring = (Spring, TargetAngle, Stiffness, Damping, StepSeconds) => {
  const Acceleration = (TargetAngle - Spring.angle) * Stiffness - Spring.velocity * Damping;
  Spring.velocity += Acceleration * StepSeconds;
  Spring.angle += Spring.velocity * StepSeconds;
};

const isSwaySpringAtRest = (Spring) =>
  Math.abs(Spring.angle) < SwayRestEpsilon && Math.abs(Spring.velocity) < SwayRestEpsilon;

// SwaySettings is read every frame, so the debug pane can change it live. onSwayFrame draws a
// frame after the bones have moved.
export const createCherryTreeSway = (SwaySettings, onSwayFrame) => {
  let CherryTrunkBones = [];
  let CherryBranchBones = [];
  const TrunkSpring = { angle: 0, velocity: 0 };
  let BranchSprings = [];
  let SwayFrameId = 0;
  let LastSwayFrameTime = 0;
  // Seconds since the last tap, or null when no zigzag is playing.
  let TapSeconds = null;
  // The trunk bend last shown and how fast it is changing (rad/s, positive = top moving
  // right), springs and tap zigzag together. The falling petals use it as wind.
  let AppliedTrunkAngle = 0;
  let TrunkBendVelocity = 0;

  const attachCherryTreeRig = (CherryTreeRig) => {
    CherryTrunkBones = CherryTreeRig.CherryTrunkBones;
    CherryBranchBones = CherryTreeRig.CherryBranchBones;
    // Each branch is a little stiffer or looser (±20%), so the canopy ripples instead of
    // moving as one block. The golden ratio spreads the values without a pattern.
    BranchSprings = CherryBranchBones.map((_, BranchIndex) => ({
      angle: 0,
      velocity: 0,
      stiffnessScale: 0.8 + 0.4 * ((BranchIndex * 0.618034) % 1),
      tapDelay: MaxTapRippleSeconds * ((BranchIndex * 0.618034 + 0.5) % 1),
    }));
  };

  const stepCherryTreeSway = (StepSeconds) => {
    const { maxAngle, stiffness, damping, branchFollow } = SwaySettings;
    stepSwaySpring(TrunkSpring, 0, stiffness, damping, StepSeconds);
    if (Math.abs(TrunkSpring.angle) > maxAngle) {
      TrunkSpring.angle = Math.sign(TrunkSpring.angle) * maxAngle;
      // Stop pushing further out once the bend hits the cap.
      if (Math.sign(TrunkSpring.velocity) === Math.sign(TrunkSpring.angle)) TrunkSpring.velocity = 0;
    }
    BranchSprings.forEach((BranchSpring) =>
      stepSwaySpring(
        BranchSpring,
        TrunkSpring.angle * branchFollow,
        stiffness * BranchSpring.stiffnessScale,
        damping,
        StepSeconds,
      ),
    );
  };

  // The zigzag a tap plays, Seconds after it started: an even left-right swing that fades out.
  // The springs swing too slowly to follow it, so it is added on top of them instead.
  const getTapZigzagAngle = (Seconds) => {
    const { tapAmplitude, tapFrequency, tapDuration } = SwaySettings;
    if (Seconds === null || Seconds < 0 || Seconds >= tapDuration) return 0;
    const TapFade = 1 - Seconds / tapDuration;
    return tapAmplitude * Math.sin(Math.PI * 2 * tapFrequency * Seconds) * TapFade * TapFade;
  };

  // A positive angle tips the top toward +x (screen right, as the camera looks down -Z),
  // which is a negative rotation around z. Each trunk bone takes an equal part, so the trunk
  // bends in an even arc with its base in place. Returns the trunk angle it applied.
  const applyCherryTreeSway = () => {
    const { maxAngle, branchFollow } = SwaySettings;
    const TrunkAngle = THREE.MathUtils.clamp(
      TrunkSpring.angle + getTapZigzagAngle(TapSeconds),
      -maxAngle,
      maxAngle,
    );
    CherryTrunkBones.forEach((TrunkBone) => {
      TrunkBone.rotation.z = -TrunkAngle / CherryTrunkBones.length;
    });
    CherryBranchBones.forEach((BranchBone, BranchIndex) => {
      const BranchSpring = BranchSprings[BranchIndex];
      const BranchTapAngle = TapSeconds === null ? 0 : getTapZigzagAngle(TapSeconds - BranchSpring.tapDelay);
      const BranchAngle = BranchSpring.angle + BranchTapAngle * branchFollow;
      BranchBone.rotation.z = -BranchAngle * BranchBone.userData.CherryChainShare;
    });
    return TrunkAngle;
  };

  const runCherryTreeSwayFrame = (FrameTime) => {
    const FrameSeconds = LastSwayFrameTime
      ? Math.min((FrameTime - LastSwayFrameTime) / 1000, MaxSwayFrameSeconds)
      : 1 / 60;
    LastSwayFrameTime = FrameTime;
    if (TapSeconds !== null) {
      TapSeconds += FrameSeconds;
      if (TapSeconds >= SwaySettings.tapDuration + MaxTapRippleSeconds) TapSeconds = null;
    }
    let RemainingSeconds = FrameSeconds;
    while (RemainingSeconds > 0) {
      stepCherryTreeSway(Math.min(RemainingSeconds, SwayStepSeconds));
      RemainingSeconds -= SwayStepSeconds;
    }

    const IsSettled =
      TapSeconds === null && isSwaySpringAtRest(TrunkSpring) && BranchSprings.every(isSwaySpringAtRest);
    if (IsSettled) {
      [TrunkSpring, ...BranchSprings].forEach((Spring) => {
        Spring.angle = 0;
        Spring.velocity = 0;
      });
    }
    const TrunkAngle = applyCherryTreeSway();
    TrunkBendVelocity = IsSettled ? 0 : (TrunkAngle - AppliedTrunkAngle) / FrameSeconds;
    AppliedTrunkAngle = TrunkAngle;
    onSwayFrame();
    if (IsSettled) {
      SwayFrameId = 0;
      LastSwayFrameTime = 0;
      return;
    }
    SwayFrameId = requestAnimationFrame(runCherryTreeSwayFrame);
  };

  // DeltaX is the pointer movement as a fraction of the container width (positive = right).
  const pushCherryTreeSway = (DeltaX) => {
    // The model hasn't loaded yet.
    if (!CherryTrunkBones.length || !DeltaX) return;
    TrunkSpring.velocity += DeltaX * SwaySettings.strength;
    if (!SwayFrameId) SwayFrameId = requestAnimationFrame(runCherryTreeSwayFrame);
  };

  // Plays the tap zigzag. Taps while one is playing are ignored, since restarting would snap
  // the tree back to the middle mid-swing.
  const zigzagCherryTreeSway = () => {
    if (!CherryTrunkBones.length || TapSeconds !== null) return;
    TapSeconds = 0;
    if (!SwayFrameId) SwayFrameId = requestAnimationFrame(runCherryTreeSwayFrame);
  };

  const getCherryTreeBendVelocity = () => TrunkBendVelocity;

  const disposeCherryTreeSway = () => {
    cancelAnimationFrame(SwayFrameId);
    SwayFrameId = 0;
    TrunkBendVelocity = 0;
  };

  return {
    attachCherryTreeRig,
    pushCherryTreeSway,
    zigzagCherryTreeSway,
    getCherryTreeBendVelocity,
    disposeCherryTreeSway,
  };
};

// Each pointer move over the Container pushes the tree by how far the pointer went since the
// last one, as a fraction of the Container's width. Entering or leaving forgets the last
// position, so coming in from the side isn't one big jump. A click (or tap, which browsers
// also report as a click) plays the zigzag. Returns a function that removes the listeners.
export const addCherryTreeSwayPointerListeners = (
  Container,
  { pushCherryTreeSway, zigzagCherryTreeSway },
) => {
  let LastPointerX = null;
  const resetCherryTreePointer = () => {
    LastPointerX = null;
  };
  const swayCherryTreeOnPointerMove = (PointerEvent) => {
    if (LastPointerX !== null) {
      pushCherryTreeSway((PointerEvent.clientX - LastPointerX) / Math.max(1, Container.offsetWidth));
    }
    LastPointerX = PointerEvent.clientX;
  };
  Container.addEventListener("pointerenter", resetCherryTreePointer);
  Container.addEventListener("pointerleave", resetCherryTreePointer);
  Container.addEventListener("pointermove", swayCherryTreeOnPointerMove);
  Container.addEventListener("click", zigzagCherryTreeSway);
  return () => {
    Container.removeEventListener("pointerenter", resetCherryTreePointer);
    Container.removeEventListener("pointerleave", resetCherryTreePointer);
    Container.removeEventListener("pointermove", swayCherryTreeOnPointerMove);
    Container.removeEventListener("click", zigzagCherryTreeSway);
  };
};
