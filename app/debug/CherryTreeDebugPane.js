// Live tuning panel for the home page cherry tree. Only ever loaded through a dynamic import when
// the URL hash is #debug, so Tweakpane stays in its own chunk and normal visitors never download it.
// Lives outside components/ and utils/ so Nuxt doesn't auto-register or auto-import it.
import { Pane } from "tweakpane";
import { addCherryTreePetalsDebugFolder } from "./CherryTreePetalsDebugFolder.js";
import { addCherryTreeGrassDebugFolder } from "./CherryTreeGrassDebugFolder.js";

// The tree is normalised to a size of 1, so position is measured in tree sizes.
const CherryTreeAxisRange = { min: -2, max: 2, step: 0.01 };

// GSAP ease names offered in the dissolve and leaves dropdowns.
const DissolveEaseNames = [
  "none",
  "power1.in", "power1.out", "power1.inOut",
  "power2.in", "power2.out", "power2.inOut",
  "power3.in", "power3.out", "power3.inOut",
  "power4.in", "power4.out", "power4.inOut",
  "sine.in", "sine.out", "sine.inOut",
  "expo.in", "expo.out", "expo.inOut",
  "circ.in", "circ.out", "circ.inOut",
  "back.in", "back.out", "back.inOut",
];

export const createCherryTreeDebugPane = (
  CherryTreeSettings,
  {
    onCherryTreeSettingsChange,
    onDissolveShaderChange,
    onHaloChange,
    onIntroReset,
    onDustChange,
    onDustCountChange,
    onPetalCountChange,
    onGrassChange,
    onGrassLayoutChange,
  },
) => {
  const EaseOptions = Object.fromEntries(DissolveEaseNames.map((EaseName) => [EaseName, EaseName]));
  const CherryTreePane = new Pane({ title: "Cherry tree" });
  // Tweakpane's default wrapper is position:absolute with no z-index; pin it above the page.
  Object.assign(CherryTreePane.element.parentElement.style, {
    position: "fixed",
    top: "8px",
    right: "8px",
    zIndex: "9999",
    width: "280px",
  });

  const PlacementFolder = CherryTreePane.addFolder({ title: "Placement", expanded: false });
  PlacementFolder.addBinding(CherryTreeSettings, "scale", { min: 0.1, max: 3, step: 0.01 });
  // One plain slider per axis (binding the whole object would give a 2D pad instead).
  ["x", "y", "z"].forEach((Axis) => {
    PlacementFolder.addBinding(CherryTreeSettings.position, Axis, {
      label: `position ${Axis}`,
      ...CherryTreeAxisRange,
    });
  });
  PlacementFolder.on("change", onCherryTreeSettingsChange);

  // Duration and ease are read when the dissolve starts, so changes show on the next reset.
  const DissolveFolder = CherryTreePane.addFolder({ title: "Dissolve", expanded: false });
  DissolveFolder.addBinding(CherryTreeSettings.dissolve, "duration", { min: 0.1, max: 5, step: 0.1 });
  DissolveFolder.addBinding(CherryTreeSettings.dissolve, "ease", { options: EaseOptions });

  // The noise roughens the rising edge and the border makes it glow. Applied live, but only
  // visible mid-dissolve, so replay the intro to see the change.
  const DissolveShaderBindings = [
    DissolveFolder.addBinding(CherryTreeSettings.dissolve, "noiseStrength", {
      label: "noise strength",
      min: 0,
      max: 1,
      step: 0.01,
    }),
    DissolveFolder.addBinding(CherryTreeSettings.dissolve, "noiseScale", {
      label: "noise scale",
      min: 0.5,
      max: 20,
      step: 0.1,
    }),
    ...["x", "y", "z"].map((Axis) =>
      DissolveFolder.addBinding(CherryTreeSettings.dissolve.noiseOffset, Axis, {
        label: `noise offset ${Axis}`,
        min: -10,
        max: 10,
        step: 0.01,
      }),
    ),
    DissolveFolder.addBinding(CherryTreeSettings.dissolve, "borderColor", { label: "border color" }),
    DissolveFolder.addBinding(CherryTreeSettings.dissolve, "borderSize", {
      label: "border size",
      min: 0,
      max: 0.3,
      step: 0.005,
    }),
    DissolveFolder.addBinding(CherryTreeSettings.dissolve, "borderSoftness", {
      label: "border softness",
      min: 0,
      max: 1,
      step: 0.01,
    }),
    DissolveFolder.addBinding(CherryTreeSettings.dissolve, "borderGlow", {
      label: "border glow",
      min: 0,
      max: 5,
      step: 0.05,
    }),
  ];
  DissolveShaderBindings.forEach((DissolveShaderBinding) =>
    DissolveShaderBinding.on("change", onDissolveShaderChange),
  );

  // Read when the intro starts, so changes show on the next replay.
  const LeavesFolder = CherryTreePane.addFolder({ title: "Leaves", expanded: false });
  LeavesFolder.addBinding(CherryTreeSettings.leaves, "duration", { min: 0.1, max: 5, step: 0.1 });
  LeavesFolder.addBinding(CherryTreeSettings.leaves, "ease", { options: EaseOptions });
  // Seconds after the dissolve ends; negative starts the fade while the branches still grow.
  LeavesFolder.addBinding(CherryTreeSettings.leaves, "offset", { min: -2, max: 2, step: 0.05 });

  // The glow around the tree's outline. Applied live; it fades in with the leaves.
  const HaloFolder = CherryTreePane.addFolder({ title: "Halo", expanded: false });
  HaloFolder.addBinding(CherryTreeSettings.halo, "color");
  HaloFolder.addBinding(CherryTreeSettings.halo, "blur", { min: 0, max: 80, step: 1 });
  HaloFolder.addBinding(CherryTreeSettings.halo, "opacity", { min: 0, max: 1, step: 0.01 });
  HaloFolder.on("change", onHaloChange);

  // How the tree bends toward a mouse swipe. The springs read these every frame, so changes
  // show on the next swipe without a callback.
  const SwayFolder = CherryTreePane.addFolder({ title: "Sway", expanded: false });
  SwayFolder.addBinding(CherryTreeSettings.sway, "strength", { min: 0, max: 5, step: 0.05 });
  SwayFolder.addBinding(CherryTreeSettings.sway, "maxAngle", {
    label: "max angle",
    min: 0,
    max: 0.3,
    step: 0.005,
  });
  SwayFolder.addBinding(CherryTreeSettings.sway, "stiffness", { min: 1, max: 150, step: 1 });
  SwayFolder.addBinding(CherryTreeSettings.sway, "damping", { min: 0, max: 20, step: 0.1 });
  SwayFolder.addBinding(CherryTreeSettings.sway, "branchFollow", {
    label: "branch follow",
    min: 0,
    max: 2,
    step: 0.05,
  });
  // The zigzag played on a click or tap.
  SwayFolder.addBinding(CherryTreeSettings.sway, "tapAmplitude", {
    label: "tap amplitude",
    min: 0,
    max: 0.2,
    step: 0.005,
  });
  SwayFolder.addBinding(CherryTreeSettings.sway, "tapFrequency", {
    label: "tap frequency",
    min: 0.5,
    max: 6,
    step: 0.1,
  });
  SwayFolder.addBinding(CherryTreeSettings.sway, "tapDuration", {
    label: "tap duration",
    min: 0.2,
    max: 3,
    step: 0.1,
  });

  // The motes floating around the tree. Count rebuilds the cloud; everything else is applied live.
  const DustFolder = CherryTreePane.addFolder({ title: "Dust", expanded: false });
  const DustSettings = CherryTreeSettings.dust;
  DustFolder.addBinding(DustSettings, "count", { min: 0, max: 600, step: 10 })
    .on("change", onDustCountChange);
  const DustBindings = [
    DustFolder.addBinding(DustSettings, "size", { min: 0.5, max: 30, step: 0.5 }),
    DustFolder.addBinding(DustSettings, "sizeVariation", {
      label: "size variation",
      min: 0,
      max: 1,
      step: 0.01,
    }),
    DustFolder.addBinding(DustSettings, "opacity", { min: 0, max: 1, step: 0.01 }),
    DustFolder.addBinding(DustSettings, "softness", { min: 0, max: 1, step: 0.01 }),
    DustFolder.addBinding(DustSettings, "yellow"),
    DustFolder.addBinding(DustSettings, "pink"),
    DustFolder.addBinding(DustSettings, "speed", { min: 0, max: 0.2, step: 0.001 }),
    DustFolder.addBinding(DustSettings, "wobble", { min: 0, max: 0.2, step: 0.001 }),
    DustFolder.addBinding(DustSettings, "twinkle", { min: 0, max: 1, step: 0.01 }),
    // One plain slider per side, like position.
    ...["width", "height", "depth"].map((Side) =>
      DustFolder.addBinding(DustSettings.area, Side, {
        label: `area ${Side}`,
        min: 0.1,
        max: 3,
        step: 0.01,
      }),
    ),
  ];
  DustBindings.forEach((DustBinding) => DustBinding.on("change", onDustChange));

  // The petals that fall while the tree sways.
  addCherryTreePetalsDebugFolder(CherryTreePane, CherryTreeSettings.petals, onPetalCountChange);

  // The grass disc at the trunk base.
  addCherryTreeGrassDebugFolder(CherryTreePane, CherryTreeSettings.grass, {
    onGrassChange,
    onGrassLayoutChange,
  });

  // Replays the whole intro: branches dissolve in, then the leaves fade in.
  CherryTreePane.addButton({ title: "Replay intro" }).on("click", onIntroReset);

  // Paste the copied JSON back into CherryTreeSettings in utils/cherryTreeSettings.js to keep the tuned values.
  CherryTreePane.addButton({ title: "Copy values" }).on("click", () => {
    navigator.clipboard.writeText(JSON.stringify(CherryTreeSettings, null, 2));
  });

  return CherryTreePane;
};
