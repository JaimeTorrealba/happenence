import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

// Model helpers for HomeCherryTree.vue.

// Bound as a runtime URL (served from public/) so Vite does not try to bundle it.
const CherryTreeModelSrc = "/models/japanese_cherry_tree_low-poly.glb";

// The model has Draco-compressed geometry and KTX2 (Basis) textures. Both decoders
// are copied from node_modules/three/examples/jsm/libs/ (draco/gltf/ and basis/)
// into public/; re-copy them when three is upgraded so they match the loaders.
const DracoDecoderPath = "/draco/";
const BasisTranscoderPath = "/basis/";

// Loads the cherry tree GLB. The Renderer is needed to pick the compressed texture
// format this GPU can use.
export const loadCherryTreeGltf = (Renderer, onCherryTreeLoad, onCherryTreeError) => {
  const CherryTreeDracoLoader = new DRACOLoader().setDecoderPath(DracoDecoderPath);
  const CherryTreeKtx2Loader = new KTX2Loader()
    .setTranscoderPath(BasisTranscoderPath)
    .detectSupport(Renderer);
  const CherryTreeGltfLoader = new GLTFLoader()
    .setDRACOLoader(CherryTreeDracoLoader)
    .setKTX2Loader(CherryTreeKtx2Loader);

  // Only one model is decoded, so the decoder workers can go straight away.
  const disposeCherryTreeDecoders = () => {
    CherryTreeDracoLoader.dispose();
    CherryTreeKtx2Loader.dispose();
  };

  CherryTreeGltfLoader.load(
    CherryTreeModelSrc,
    (Gltf) => {
      disposeCherryTreeDecoders();
      onCherryTreeLoad(Gltf);
    },
    undefined,
    (LoadError) => {
      disposeCherryTreeDecoders();
      onCherryTreeError(LoadError);
    },
  );
};

// The model has one bark mesh and six blossom meshes; each blossom material is
// named after its texture ("nature_blossoms_prunusserrulata_01_m_000N.jpg").
export const getCherryBlossomMeshes = (Model) => {
  const BlossomMeshes = [];
  Model.traverse((Child) => {
    if (Child.isMesh && Child.material.name.includes("blossoms")) BlossomMeshes.push(Child);
  });
  return BlossomMeshes;
};

// The trunk and branches: every mesh that isn't a blossom.
export const getCherryBarkMeshes = (Model, BlossomMeshes) => {
  const BarkMeshes = [];
  Model.traverse((Child) => {
    if (Child.isMesh && !BlossomMeshes.includes(Child)) BarkMeshes.push(Child);
  });
  return BarkMeshes;
};

// Texture alpha below this is cut away from the blossom cards.
const BlossomAlphaCutoff = 0.5;

// The blossom cards are alpha-blended; cutting them out instead avoids the
// sorting glitches (petals vanishing behind each other) of transparent foliage.
// GLTFLoader turns depthWrite off for BLEND materials; without it the cards would layer by
// draw order instead of distance, and that order changes when the fade ends.
export const setCutoutBlossomMaterials = (BlossomMeshes) => {
  BlossomMeshes.forEach((BlossomMesh) => {
    BlossomMesh.material.transparent = false;
    BlossomMesh.material.depthWrite = true;
    BlossomMesh.material.alphaTest = BlossomAlphaCutoff;
  });
};

// Fades the blossoms between hidden (0) and the finished cutout (1). three's alpha test
// compares texture alpha × opacity, so the cutoff is scaled by the opacity to keep the same
// petal shapes mid-fade instead of every petal popping out below 50%. They are blended only
// while fading, then go back to the cutout to avoid the sorting glitches.
export const setCherryBlossomOpacity = (BlossomMeshes, Opacity) => {
  const IsFading = Opacity < 1;
  BlossomMeshes.forEach((BlossomMesh) => {
    const BlossomMaterial = BlossomMesh.material;
    BlossomMesh.visible = Opacity > 0;
    BlossomMaterial.opacity = Opacity;
    // Never 0: three compiles a different shader when the alpha test is switched off.
    BlossomMaterial.alphaTest = IsFading
      ? Math.max(BlossomAlphaCutoff * Opacity, 0.001)
      : BlossomAlphaCutoff;
    if (BlossomMaterial.transparent !== IsFading) {
      BlossomMaterial.transparent = IsFading;
      BlossomMaterial.needsUpdate = true;
    }
  });
};

// Scales the tree so its largest side is 1, centres it on its trunk with its base at y = 0,
// then frames the camera around it.
export const fitCameraToCherryTree = (Model, ModelPivot, Camera) => {
  const ModelBox = new THREE.Box3().setFromObject(Model);
  const ModelCenter = ModelBox.getCenter(new THREE.Vector3());
  const RawSize = ModelBox.getSize(new THREE.Vector3());
  const NormalizeScale = 1 / Math.max(RawSize.x, RawSize.y, RawSize.z);
  const ModelSize = RawSize.multiplyScalar(NormalizeScale);
  Model.scale.multiplyScalar(NormalizeScale);
  Model.position.set(-ModelCenter.x, -ModelBox.min.y, -ModelCenter.z).multiplyScalar(NormalizeScale);
  ModelPivot.add(Model);

  const FitDistance = 0.5 / Math.tan(THREE.MathUtils.degToRad(Camera.fov / 2));
  Camera.position.set(0, ModelSize.y * 0.55, FitDistance * 1.15);
  Camera.lookAt(0, ModelSize.y * 0.45, 0);
  Camera.near = FitDistance / 100;
  Camera.far = FitDistance * 10;
  Camera.updateProjectionMatrix();
};

export const disposeCherryTreeScene = (Scene) => {
  Scene.traverse((Child) => {
    if (!Child.isMesh) return;
    // Frees the bone texture. The skeleton is shared by every tree mesh; disposing it again
    // is harmless.
    if (Child.isSkinnedMesh) Child.skeleton?.dispose();
    Child.geometry.dispose();
    Object.values(Child.material).forEach((Value) => Value?.isTexture && Value.dispose());
    Child.material.dispose();
  });
};
