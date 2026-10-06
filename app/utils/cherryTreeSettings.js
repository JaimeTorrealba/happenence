// Settings for the home page cherry tree (HomeCherryTree.vue).
// Tuned live with the #debug pane. The model is normalised to a size of 1, so position is in
// tree sizes. Paste the pane's "Copy values" JSON here to keep new values.
export const CherryTreeSettings = {
  scale: 1.11,
  position: { x: 0, y: -0.09, z: 0 },
  dissolve: {
    duration: 2,
    ease: "power1.in",
    // The tree grows from the bottom; the noise only roughens the rising edge.
    // Strength is how ragged it is (fraction of tree height); scale/offset shape the pattern.
    noiseStrength: 0.3,
    noiseScale: 6,
    noiseOffset: { x: 0, y: 0, z: 0 },
    // The glowing band along the rising edge. Size is a fraction of tree height, softness
    // goes from a hard band (0) to a smooth fade (1), glow above 1 outshines the lighting.
    borderColor: "#ffb7c5",
    borderSize: 0.05,
    borderSoftness: 1,
    borderGlow: 1.5,
  },
  // The leaves fade in once the branches are drawn. Offset is seconds after the dissolve
  // ends (negative overlaps it).
  leaves: {
    duration: 1.5,
    ease: "power1.out",
    offset: 0,
  },
  // Soft glow around the tree's outline (blur in px), faded in together with the leaves.
  halo: {
    color: "#ffb7c5",
    blur: 24,
    opacity: 0.5,
  },
  // The tree bends toward a mouse swipe, then springs back. Strength turns pointer movement
  // (in container widths) into bend speed, so a fast swipe bends further than a slow one;
  // maxAngle caps the bend at the top of the tree (radians). Stiffness and damping shape the spring: stiffer swings back faster, more
  // damping overshoots less. The canopy follows the trunk times branchFollow, a little late.
  // A click or tap zigzags the tree: tapAmplitude is the first swing (radians), tapFrequency
  // the swings per second, and it fades out over tapDuration seconds.
  sway: {
    strength: 1.5,
    maxAngle: 0.08,
    stiffness: 40,
    damping: 4,
    branchFollow: 1.2,
    tapAmplitude: 0.035,
    tapFrequency: 2.5,
    tapDuration: 1.2,
  },
  // Round motes floating around the tree, each coloured between yellow and pink, faded in with
  // the leaves. Size is px at the tree's distance; sizeVariation goes from all equal (0) to tiny
  // up to 2× the size (1). Softness goes from a hard disc (0) to fully feathered (1); twinkle
  // from a steady alpha (0) to a full pulse (1). Speed is the upward drift in tree units per
  // second, wobble the sideways sway in tree units, and area the box they float in (centred on
  // the trunk, base on the ground).
  dust: {
    count: 140,
    size: 6,
    sizeVariation: 0.6,
    opacity: 0.9,
    softness: 0.6,
    yellow: "#ffb7c5",
    pink: "#ffb7c5",
    speed: 0.02,
    wobble: 0.03,
    twinkle: 0.4,
    area: { width: 1.4, height: 1.2, depth: 0.8 },
  },
  // Petals fall from the canopy while the tree sways and vanish at the trunk base. Count is the
  // most in the air at once. Rate is petals per second for each rad/s of bend speed, capped at
  // maxRate; a click or tap drops tapBurst at once. They leave from blossoms above
  // minSpawnHeight (fraction of the tree height). Size is in tree units; sizeVariation goes from
  // all equal (0) to 0–2× the size (1). The tree's bend speed times wind is the air speed that
  // carries them (so a later swipe also blows petals already falling); drag is how fast they
  // catch up with the air, fallSpeed their top speed down, flutter their sideways drift (tree
  // units per second) and spin how fast they tumble (rad/s). They fade out over fadeHeight
  // above the ground. Each petal gets a colour between pink and white.
  petals: {
    count: 60,
    rate: 40,
    maxRate: 25,
    tapBurst: 6,
    minSpawnHeight: 0.35,
    size: 0.02,
    sizeVariation: 0.4,
    fallSpeed: 0.12,
    drag: 2.5,
    wind: 1.2,
    flutter: 0.15,
    spin: 3,
    fadeHeight: 0.04,
    opacity: 0.9,
    pink: "#ffb7c5",
    white: "#ffb7c5",
  },
  // A disc of grass at the trunk base; the blades grow in with the leaves. Radius is in tree
  // units, subdivisions the grid cells across the diameter (one blade per cell inside the disc).
  // Blade width and height are in tree units; heightRandomness goes from all equal (0) to fully
  // random (1), and shadowIntensity darkens the blade bases. The grass is unlit: tint stands in
  // for the lighting, while groundColor is the lit disc under it. The wind is a wave across the
  // disc: strength is how far the tips bend (tree units), frequency the waves per tree unit,
  // speed how fast they travel, and direction (x, z) where they blow.
  grass: {
    // Above ~0.24 the front edge drops below the bottom of the canvas with the current framing.
    radius: 0.2,
    subdivisions: 60,
    bladeWidth: 0.004,
    bladeHeight: 0.04,
    bladeHeightRandomness: 0.5,
    shadowIntensity: 1,
    color: "#7aa84e",
    tint: "#ffffff",
    groundColor: "#6b8a4a",
    windStrength: 0.008,
    windFrequency: 10,
    windSpeed: 1.6,
    windDirection: { x: 1, y: 0.35 },
  },
};
