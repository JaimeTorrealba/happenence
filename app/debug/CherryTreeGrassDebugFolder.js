// The "Grass" folder of the cherry tree debug pane (CherryTreeDebugPane.js), kept apart so the
// pane file stays short. Radius and subdivisions rebuild the blades; everything else is applied live.

// [setting, label, min, max, step] for every slider after the layout ones.
const CherryGrassSliders = [
  ["bladeWidth", "blade width", 0.0005, 0.02, 0.0005],
  ["bladeHeight", "blade height", 0.005, 0.2, 0.001],
  ["bladeHeightRandomness", "height randomness", 0, 1, 0.01],
  ["shadowIntensity", "shadow intensity", 0, 1, 0.01],
  ["windStrength", "wind strength", 0, 0.05, 0.0005],
  ["windFrequency", "wind frequency", 0, 60, 0.5],
  ["windSpeed", "wind speed", 0, 10, 0.1],
];

export const addCherryTreeGrassDebugFolder = (
  CherryTreePane,
  GrassSettings,
  { onGrassChange, onGrassLayoutChange },
) => {
  const GrassFolder = CherryTreePane.addFolder({ title: "Grass", expanded: false });
  GrassFolder.addBinding(GrassSettings, "radius", { min: 0.05, max: 1, step: 0.01 })
    .on("change", onGrassLayoutChange);
  GrassFolder.addBinding(GrassSettings, "subdivisions", { min: 10, max: 300, step: 1 })
    .on("change", onGrassLayoutChange);
  const GrassBindings = [
    ...CherryGrassSliders.map(([SettingName, label, min, max, step]) =>
      GrassFolder.addBinding(GrassSettings, SettingName, { label, min, max, step }),
    ),
    // A 2D pad: y is the world z axis.
    GrassFolder.addBinding(GrassSettings, "windDirection", {
      label: "wind direction",
      x: { min: -1, max: 1 },
      y: { min: -1, max: 1 },
    }),
    GrassFolder.addBinding(GrassSettings, "color"),
    GrassFolder.addBinding(GrassSettings, "tint"),
    GrassFolder.addBinding(GrassSettings, "groundColor", { label: "ground color" }),
  ];
  GrassBindings.forEach((GrassBinding) => GrassBinding.on("change", onGrassChange));
  return GrassFolder;
};
