// The "Petals" folder of the cherry tree debug pane (CherryTreeDebugPane.js), kept apart so the
// pane file stays short. The petals read their settings every frame, so only count needs a
// callback: it rebuilds the pool.

// [setting, label, min, max, step] for every slider after count.
const CherryPetalSliders = [
  ["rate", "rate", 0, 200, 1],
  ["maxRate", "max rate", 0, 100, 1],
  ["tapBurst", "tap burst", 0, 40, 1],
  ["minSpawnHeight", "min spawn height", 0, 1, 0.01],
  ["size", "size", 0.002, 0.1, 0.001],
  ["sizeVariation", "size variation", 0, 1, 0.01],
  ["fallSpeed", "fall speed", 0, 1, 0.005],
  ["drag", "drag", 0, 10, 0.1],
  ["wind", "wind", 0, 5, 0.05],
  ["flutter", "flutter", 0, 1, 0.005],
  ["spin", "spin", 0, 20, 0.1],
  ["fadeHeight", "fade height", 0, 0.3, 0.005],
  ["opacity", "opacity", 0, 1, 0.01],
];

export const addCherryTreePetalsDebugFolder = (CherryTreePane, PetalSettings, onPetalCountChange) => {
  const PetalsFolder = CherryTreePane.addFolder({ title: "Petals", expanded: false });
  PetalsFolder.addBinding(PetalSettings, "count", { min: 10, max: 400, step: 10 })
    .on("change", onPetalCountChange);
  CherryPetalSliders.forEach(([SettingName, label, min, max, step]) =>
    PetalsFolder.addBinding(PetalSettings, SettingName, { label, min, max, step }),
  );
  PetalsFolder.addBinding(PetalSettings, "pink");
  PetalsFolder.addBinding(PetalSettings, "white");
  return PetalsFolder;
};
