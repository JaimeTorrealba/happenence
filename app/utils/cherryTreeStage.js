import * as THREE from "three";
import { disposeCherryTreeScene } from "./cherryTreeModel.js";

// The renderer, scene, camera, lights and model pivot of the home page cherry tree
// (HomeCherryTree.vue), plus keeping the canvas sized to its container. Kept apart so the
// component stays short.
export const createCherryTreeStage = (Container) => {
  const CherryTreeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  CherryTreeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  Container.appendChild(CherryTreeRenderer.domElement);

  const CherryTreeScene = new THREE.Scene();
  const Camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  CherryTreeScene.add(new THREE.HemisphereLight("#fff4ec", "#c9b8a8", 2));
  const SunLight = new THREE.DirectionalLight("#ffffff", 2.5);
  SunLight.position.set(5, 10, 7);
  CherryTreeScene.add(SunLight);

  // Sits at the base of the trunk, so scaling grows the tree from the ground up.
  const ModelPivot = new THREE.Group();
  CherryTreeScene.add(ModelPivot);

  const drawCherryTreeFrame = () => CherryTreeRenderer.render(CherryTreeScene, Camera);

  const resizeRendererToContainer = () => {
    const Width = Math.max(1, Container.offsetWidth);
    const Height = Math.max(1, Container.offsetHeight);
    CherryTreeRenderer.setSize(Width, Height, false);
    Camera.aspect = Width / Height;
    Camera.updateProjectionMatrix();
  };

  // Always draws straight away: resizing clears the canvas after this frame's dust loop ran,
  // so waiting for the next one would flash a blank frame.
  const ContainerResizeObserver = new ResizeObserver(() => {
    resizeRendererToContainer();
    drawCherryTreeFrame();
  });
  ContainerResizeObserver.observe(Container);
  resizeRendererToContainer();

  // Frees every mesh in the scene (tree, petals, grass) and the WebGL context.
  const disposeCherryTreeStage = () => {
    ContainerResizeObserver.disconnect();
    disposeCherryTreeScene(CherryTreeScene);
    CherryTreeRenderer.dispose();
    CherryTreeRenderer.forceContextLoss();
  };

  return { CherryTreeRenderer, Camera, ModelPivot, drawCherryTreeFrame, disposeCherryTreeStage };
};
