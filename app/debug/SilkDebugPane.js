// Live tuning panel for the About silk background. Only ever loaded through a dynamic import when
// the URL hash is #debug, so Tweakpane stays in its own chunk and normal visitors never download it.
// Lives outside components/ and utils/ so Nuxt doesn't auto-register or auto-import it.
import { Pane } from "tweakpane";

export const createSilkDebugPane = (SilkSettings, onSilkSettingsChange) => {
  const SilkPane = new Pane({ title: "Silk" });
  // Tweakpane's default wrapper is position:absolute with no z-index; pin it above the page.
  Object.assign(SilkPane.element.parentElement.style, {
    position: "fixed",
    top: "8px",
    right: "8px",
    zIndex: "9999",
    width: "280px",
  });

  SilkPane.addBinding(SilkSettings, "color");
  SilkPane.addBinding(SilkSettings, "shadowColor", { label: "shadow color" });
  SilkPane.addBinding(SilkSettings, "speed", { min: 0, max: 20, step: 0.1 });
  SilkPane.addBinding(SilkSettings, "scale", { min: 0.1, max: 5, step: 0.01 });
  SilkPane.addBinding(SilkSettings, "noiseIntensity", { label: "noise", min: 0, max: 5, step: 0.01 });
  SilkPane.addBinding(SilkSettings, "rotation", { min: -Math.PI, max: Math.PI, step: 0.01 });

  // Paste the copied JSON back into the component's prop defaults to keep the tuned values.
  SilkPane.addButton({ title: "Copy values" }).on("click", () => {
    navigator.clipboard.writeText(JSON.stringify(SilkSettings, null, 2));
  });

  SilkPane.on("change", onSilkSettingsChange);
  return SilkPane;
};
