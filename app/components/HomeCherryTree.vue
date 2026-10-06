<script setup>
// The renderer, camera, lights and resizing live in utils/cherryTreeStage.js; loading, framing
// and disposal in utils/cherryTreeModel.js; the dissolve shader in
// utils/dissolveMaterial.js; the intro timeline in utils/cherryTreeIntro.js; the halo in
// utils/cherryTreeHalo.js; the bones in utils/cherryTreeRig.js and their swaying in
// utils/cherryTreeSway.js; the floating dust in utils/cherryTreeDust.js; the petals that fall
// while it sways in utils/cherryTreePetals.js; the grass disc at its base in
// utils/cherryTreeGrass.js. The tunable values are CherryTreeSettings in
// utils/cherryTreeSettings.js. All are auto-imported.

const ContainerRef = ref(null);
let CherryTreeStage = null;
let CherryTreeDebugPane = null;
// The leaf meshes, kept apart from the trunk so they can be shown later.
let CherryBlossomMeshes = [];
// The trunk and branches: the meshes that dissolve in.
let CherryBarkMeshes = [];
// Bends the tree toward mouse swipes (and zigzags it on a tap) once the model is loaded and rigged.
let CherryTreeSway = null;
let removeCherryTreePointerListeners = null;
// The motes floating around the tree; they run their own frame loop while it is on screen.
let CherryTreeDust = null;
// Petals blown off the canopy by the sway; their loop runs while they fall or the tree moves.
let CherryTreePetals = null;
// The grass disc at the trunk base; its blades grow in with the leaves.
let CherryTreeGrass = null;
// Intro: the branches dissolve in once the tree scrolls into view, then the leaves fade in.
let CherryTreeIntro = null;
let IsUnmounted = false;

const CherryTreeDissolveUniforms = createDissolveUniforms();
// Tweened from 0 to 1 and applied to every blossom material, the halo, the dust and the grass.
const CherryBlossomFade = { value: 0 };

applyDissolveSettings(CherryTreeDissolveUniforms, CherryTreeSettings.dissolve);

onMounted(() => {
  const Container = ContainerRef.value;
  CherryTreeStage = createCherryTreeStage(Container);
  const { CherryTreeRenderer, Camera, ModelPivot, drawCherryTreeFrame } = CherryTreeStage;

  const applyCherryTreeSettings = () => {
    const { x, y, z } = CherryTreeSettings.position;
    ModelPivot.position.set(x, y, z);
    ModelPivot.scale.setScalar(CherryTreeSettings.scale);
    // Moving or scaling the tree changes where its base and top are in world space.
    setDissolveHeightRange(CherryTreeDissolveUniforms, CherryBarkMeshes);
  };
  applyCherryTreeSettings();

  // Apart from the dust and the grass wind (advanced on each draw), the tree is still, so a frame
  // is only drawn when something changes (load, resize, pane, sway, petals, intro). While the dust
  // loop runs it draws this frame anyway.
  const renderCherryTreeFrame = () => {
    if (!CherryTreeDust.isCherryDustRunning()) drawCherryTreeFrame();
  };

  // Reduced motion: no sway, tap zigzag, falling petals, drifting dust or grass wind, and the
  // intro is skipped (see the load callback).
  const PrefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // In the pivot, so the petals land on the trunk base wherever the tree is placed. The sway
  // is created right after, so its bend speed is read through a closure.
  CherryTreePetals = createCherryTreePetals(
    CherryTreeSettings.petals,
    ModelPivot,
    () => CherryTreeSway.getCherryTreeBendVelocity(),
    renderCherryTreeFrame,
  );
  ModelPivot.add(CherryTreePetals.CherryPetalMesh);
  // Every sway frame also wakes the petals, which shake loose while the tree moves.
  CherryTreeSway = createCherryTreeSway(CherryTreeSettings.sway, () => {
    CherryTreePetals.wakeCherryPetals();
    renderCherryTreeFrame();
  });
  if (!PrefersReducedMotion) {
    // A click or tap zigzags the tree and drops a small burst of petals.
    removeCherryTreePointerListeners = addCherryTreeSwayPointerListeners(Container, {
      pushCherryTreeSway: CherryTreeSway.pushCherryTreeSway,
      zigzagCherryTreeSway: () => {
        CherryTreeSway.zigzagCherryTreeSway();
        CherryTreePetals.burstCherryPetals();
      },
    });
  }
  // In the pivot, so the dust follows the tree's position and scale.
  CherryTreeDust = createCherryTreeDust(
    CherryTreeSettings.dust,
    Container,
    drawCherryTreeFrame,
    !PrefersReducedMotion,
  );
  ModelPivot.add(CherryTreeDust.CherryDustPoints);
  // In the pivot, so the disc stays at the trunk base.
  CherryTreeGrass = createCherryTreeGrass(CherryTreeSettings.grass, !PrefersReducedMotion);
  ModelPivot.add(CherryTreeGrass.CherryGrassGroup);

  // Shows the leaves, the halo, the dust and the grass (disc and blades) at the current fade
  // (0 = bare branches, 1 = finished tree). Petals only fall from fully grown leaves.
  const applyCherryBlossomFade = () => {
    setCherryBlossomOpacity(CherryBlossomMeshes, CherryBlossomFade.value);
    setCherryTreeHalo(CherryTreeRenderer.domElement, CherryTreeSettings.halo, CherryBlossomFade.value);
    CherryTreeDust.setCherryDustFade(CherryBlossomFade.value);
    CherryTreeGrass.setCherryGrassGrowth(CherryBlossomFade.value);
    CherryTreePetals.setCherryPetalsEnabled(CherryBlossomFade.value >= 1);
  };

  CherryTreeIntro = createCherryTreeIntro({
    CherryTreeSettings,
    CherryTreeDissolveUniforms,
    CherryBlossomFade,
    applyCherryBlossomFade,
    renderCherryTreeFrame,
  });

  loadCherryTreeGltf(
    CherryTreeRenderer,
    (Gltf) => {
      // The page can be left while the model is still downloading.
      if (IsUnmounted) return disposeCherryTreeScene(Gltf.scene);
      const BlossomMeshes = getCherryBlossomMeshes(Gltf.scene);
      const BarkMeshes = getCherryBarkMeshes(Gltf.scene, BlossomMeshes);
      // Framing still counts the hidden leaves, so the view won't jump when they appear.
      fitCameraToCherryTree(Gltf.scene, ModelPivot, Camera);
      // The rig swaps every mesh for a skinned copy, so only its meshes are used from here on.
      const CherryTreeRig = buildCherryTreeRig(Gltf.scene, BarkMeshes, BlossomMeshes);
      CherryBlossomMeshes = CherryTreeRig.CherryBlossomMeshes;
      CherryBarkMeshes = CherryTreeRig.CherryBarkMeshes;
      CherryTreeSway.attachCherryTreeRig(CherryTreeRig);
      CherryTreePetals.attachCherryBlossomMeshes(CherryBlossomMeshes);
      setCutoutBlossomMaterials(CherryBlossomMeshes);
      // The leaves stay hidden until the branches are drawn.
      setCherryBlossomOpacity(CherryBlossomMeshes, 0);
      CherryBarkMeshes.forEach((BarkMesh) =>
        addDissolveToMaterial(BarkMesh.material, CherryTreeDissolveUniforms),
      );
      setDissolveHeightRange(CherryTreeDissolveUniforms, CherryBarkMeshes);

      // Reduced motion: show the finished tree straight away.
      if (PrefersReducedMotion) {
        CherryTreeDissolveUniforms.uDissolveProgress.value =
          getDissolveEndProgress(CherryTreeDissolveUniforms);
        CherryBlossomFade.value = 1;
        applyCherryBlossomFade();
        return renderCherryTreeFrame();
      }
      // Plays once when the top of the tree reaches 80% down the viewport (straight away
      // if it is already there).
      CherryTreeIntro.playCherryTreeIntro({ trigger: Container, start: "top 80%", once: true });
    },
    (LoadError) => console.error("Cherry tree model failed to load:", LoadError),
  );

  // Dev-only tuning panel: the dynamic import keeps Tweakpane in its own chunk,
  // fetched only when the URL hash is #debug.
  if (window.location.hash === "#debug") {
    import("~/debug/CherryTreeDebugPane.js").then(({ createCherryTreeDebugPane }) => {
      if (IsUnmounted) return;
      CherryTreeDebugPane = createCherryTreeDebugPane(CherryTreeSettings, {
        onCherryTreeSettingsChange: () => {
          applyCherryTreeSettings();
          renderCherryTreeFrame();
        },
        onDissolveShaderChange: () => {
          applyDissolveSettings(CherryTreeDissolveUniforms, CherryTreeSettings.dissolve);
          // A bigger border or noise moves the end point; keep a finished tree finished.
          if (CherryTreeIntro.isCherryTreeIntroFinished()) {
            CherryTreeDissolveUniforms.uDissolveProgress.value =
              getDissolveEndProgress(CherryTreeDissolveUniforms);
          }
          renderCherryTreeFrame();
        },
        // The halo is CSS, so no frame needs drawing.
        onHaloChange: applyCherryBlossomFade,
        // Replays from the start right away, with the pane's current dissolve and leaf settings.
        onIntroReset: () => CherryTreeIntro.playCherryTreeIntro(),
        // Drawn for when the dust loop isn't running (reduced motion or off screen).
        onDustChange: () => {
          CherryTreeDust.applyCherryDustSettings();
          renderCherryTreeFrame();
        },
        onDustCountChange: () => {
          CherryTreeDust.rebuildCherryDustGeometry();
          renderCherryTreeFrame();
        },
        // The other petal settings are read every frame; a new count empties the pool.
        onPetalCountChange: () => {
          CherryTreePetals.rebuildCherryPetalPool();
          renderCherryTreeFrame();
        },
        onGrassChange: () => {
          CherryTreeGrass.applyCherryGrassSettings();
          renderCherryTreeFrame();
        },
        onGrassLayoutChange: () => {
          CherryTreeGrass.rebuildCherryGrassGeometry();
          renderCherryTreeFrame();
        },
      });
    });
  }
});

onBeforeUnmount(() => {
  IsUnmounted = true;
  CherryTreeIntro?.killCherryTreeIntro();
  removeCherryTreePointerListeners?.();
  CherryTreeSway?.disposeCherryTreeSway();
  CherryTreePetals?.disposeCherryTreePetals();
  CherryTreeDust?.disposeCherryTreeDust();
  CherryTreeDebugPane?.dispose();
  CherryTreeStage?.disposeCherryTreeStage();
});
</script>

<template>
  <div ref="ContainerRef" class="home-cherry-tree" aria-hidden="true" />
</template>

<style scoped>
.home-cherry-tree {
  width: 100%;
  height: 100%;
}
.home-cherry-tree :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
