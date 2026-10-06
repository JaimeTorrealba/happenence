import * as THREE from "three";

// Runtime rig for the cherry tree GLB, which ships without bones. A short chain of trunk bones
// bends the whole tree in an arc, and one branch bone per slice of the canopy lets the crown
// lag and ripple. The six blossom meshes are not separate clusters (each one is spread over the
// whole canopy), so the branch bones split the canopy by direction around the trunk instead.
// Bark and blossoms get their weights from the same function of position, so leaves move
// exactly like the branch they sit on.

const CherryTrunkBoneCount = 4;
const CherryBranchSectorCount = 6;
// Measured from the model: the bark is a single trunk up to ~40% of its height, then splits.
const CherryForkHeightFraction = 0.4;
// Height (fraction of the whole tree) over which the weights hand over from trunk to branches.
const CherryForkBlendFraction = 0.1;
// Bark vertices in this lowest fraction of its height mark the centre of the trunk's base.
const CherryTrunkBaseFraction = 0.05;
const CherryMaxInfluences = 4;

// Every vertex of the mesh in the Model's local space. fromBufferAttribute undoes the int16
// quantization of the positions.
const getCherryModelSpacePositions = (Mesh, ModelInverse) => {
  const MeshToModel = new THREE.Matrix4().multiplyMatrices(ModelInverse, Mesh.matrixWorld);
  const PositionAttribute = Mesh.geometry.attributes.position;
  return Array.from({ length: PositionAttribute.count }, (_, VertexIndex) =>
    new THREE.Vector3().fromBufferAttribute(PositionAttribute, VertexIndex).applyMatrix4(MeshToModel),
  );
};

// The centre of the trunk where it meets the ground, and the bark's height above it.
const getCherryTrunkBase = (BarkPositions) => {
  const BarkHeights = BarkPositions.map((Position) => Position.y);
  const MinY = Math.min(...BarkHeights);
  const BarkHeight = Math.max(...BarkHeights) - MinY;
  const BaseCutoff = MinY + BarkHeight * CherryTrunkBaseFraction;
  const BasePositions = BarkPositions.filter((Position) => Position.y <= BaseCutoff);
  const TrunkBase = BasePositions.reduce((Sum, Position) => Sum.add(Position), new THREE.Vector3());
  TrunkBase.divideScalar(BasePositions.length).setY(MinY);
  return { TrunkBase, BarkHeight };
};

// Splits the canopy into equal slices of direction around the trunk. Each slice gets its
// centre and spread (RMS distance to the centre), which shape its branch bone's falloff.
const getCherryBranchSectors = (CanopyPositions, TrunkBase) => {
  const SectorPositions = Array.from({ length: CherryBranchSectorCount }, () => []);
  CanopyPositions.forEach((Position) => {
    const Azimuth = Math.atan2(Position.z - TrunkBase.z, Position.x - TrunkBase.x) + Math.PI;
    const SectorIndex = Math.floor((Azimuth / (Math.PI * 2)) * CherryBranchSectorCount);
    SectorPositions[Math.min(SectorIndex, CherryBranchSectorCount - 1)].push(Position);
  });
  return SectorPositions.filter((Positions) => Positions.length).map((Positions) => {
    const Center = Positions.reduce((Sum, Position) => Sum.add(Position), new THREE.Vector3());
    Center.divideScalar(Positions.length);
    const SquaredSpread =
      Positions.reduce((Sum, Position) => Sum + Position.distanceToSquared(Center), 0) / Positions.length;
    return { Center, Spread: Math.sqrt(SquaredSpread) };
  });
};

// [bone index, weight] pairs for a model-space position. Below the fork it follows the two
// trunk bones around its height; above it, the two branch bones whose slices are closest.
const getCherryTreeInfluences = (Position, CherryRigLayout) => {
  const { TrunkBase, ChainHeight, ForkY, ForkBlend, BranchSectors } = CherryRigLayout;
  const ChainPosition = THREE.MathUtils.clamp(
    ((Position.y - TrunkBase.y) / ChainHeight) * CherryTrunkBoneCount,
    0,
    CherryTrunkBoneCount - 1,
  );
  const LowerBoneIndex = Math.floor(ChainPosition);
  const UpperBoneShare = ChainPosition - LowerBoneIndex;
  const BranchShare = THREE.MathUtils.smoothstep(Position.y, ForkY - ForkBlend / 2, ForkY + ForkBlend / 2);
  const Influences = [
    [LowerBoneIndex, (1 - BranchShare) * (1 - UpperBoneShare)],
    [Math.min(LowerBoneIndex + 1, CherryTrunkBoneCount - 1), (1 - BranchShare) * UpperBoneShare],
  ];
  if (BranchShare === 0) return Influences;

  const ClosestBranches = BranchSectors.map((Sector, SectorIndex) => [
    CherryTrunkBoneCount + SectorIndex,
    Math.exp(-Position.distanceToSquared(Sector.Center) / (2 * Sector.Spread ** 2)),
  ])
    .sort((BranchA, BranchB) => BranchB[1] - BranchA[1])
    .slice(0, 2);
  const FalloffSum = ClosestBranches.reduce((Sum, [, Falloff]) => Sum + Falloff, 0);
  ClosestBranches.forEach(([BoneIndex, Falloff]) => {
    // Far from every slice the falloffs can all round to 0; share evenly then.
    const BranchWeight = FalloffSum > 0 ? Falloff / FalloffSum : 1 / ClosestBranches.length;
    Influences.push([BoneIndex, BranchShare * BranchWeight]);
  });
  return Influences;
};

// Writes the 4 strongest influences per vertex, normalised to sum 1, as skin attributes.
const setCherryTreeSkinAttributes = (Mesh, Positions, CherryRigLayout) => {
  const SkinIndices = new Uint16Array(Positions.length * CherryMaxInfluences);
  const SkinWeights = new Float32Array(Positions.length * CherryMaxInfluences);
  Positions.forEach((Position, VertexIndex) => {
    const Influences = getCherryTreeInfluences(Position, CherryRigLayout)
      .filter(([, Weight]) => Weight > 0)
      .sort((InfluenceA, InfluenceB) => InfluenceB[1] - InfluenceA[1])
      .slice(0, CherryMaxInfluences);
    const WeightSum = Influences.reduce((Sum, [, Weight]) => Sum + Weight, 0);
    Influences.forEach(([BoneIndex, Weight], Slot) => {
      SkinIndices[VertexIndex * CherryMaxInfluences + Slot] = BoneIndex;
      SkinWeights[VertexIndex * CherryMaxInfluences + Slot] = Weight / WeightSum;
    });
  });
  Mesh.geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(SkinIndices, CherryMaxInfluences));
  Mesh.geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(SkinWeights, CherryMaxInfluences));
};

// The trunk chain: the root at the base of the trunk, each next bone a step higher.
const createCherryTrunkBones = (Model, TrunkBase, ChainHeight) =>
  Array.from({ length: CherryTrunkBoneCount }).reduce((TrunkBones, _, BoneIndex) => {
    const TrunkBone = new THREE.Bone();
    TrunkBone.name = `CherryTrunkBone${BoneIndex}`;
    if (BoneIndex === 0) {
      TrunkBone.position.copy(TrunkBase);
      Model.add(TrunkBone);
    } else {
      TrunkBone.position.set(0, ChainHeight / CherryTrunkBoneCount, 0);
      TrunkBones[BoneIndex - 1].add(TrunkBone);
    }
    return [...TrunkBones, TrunkBone];
  }, []);

// The branch bones all pivot on the trunk axis at the fork, hung from the trunk bone there.
// They only inherit the trunk bend up to that bone, so CherryChainShare is the part of the
// trunk bend (the bones above it) they have to add themselves to keep up with the trunk.
const createCherryBranchBones = (TrunkBones, CherryRigLayout) => {
  const { ChainHeight, ForkY, TrunkBase, BranchSectors } = CherryRigLayout;
  const BoneSpacing = ChainHeight / CherryTrunkBoneCount;
  const ParentIndex = THREE.MathUtils.clamp(
    Math.floor((ForkY - TrunkBase.y) / BoneSpacing),
    0,
    CherryTrunkBoneCount - 1,
  );
  return BranchSectors.map((_, SectorIndex) => {
    const BranchBone = new THREE.Bone();
    BranchBone.name = `CherryBranchBone${SectorIndex}`;
    BranchBone.position.set(0, ForkY - TrunkBase.y - ParentIndex * BoneSpacing, 0);
    BranchBone.userData.CherryChainShare = (CherryTrunkBoneCount - 1 - ParentIndex) / CherryTrunkBoneCount;
    TrunkBones[ParentIndex].add(BranchBone);
    return BranchBone;
  });
};

// Swaps a plain mesh for a SkinnedMesh with the same geometry, material and placement.
const replaceWithSkinnedCherryMesh = (Mesh) => {
  const SkinnedMesh = new THREE.SkinnedMesh(Mesh.geometry, Mesh.material);
  SkinnedMesh.name = Mesh.name;
  SkinnedMesh.position.copy(Mesh.position);
  SkinnedMesh.quaternion.copy(Mesh.quaternion);
  SkinnedMesh.scale.copy(Mesh.scale);
  Mesh.parent.add(SkinnedMesh);
  Mesh.removeFromParent();
  return SkinnedMesh;
};

// Call once the Model is placed in the scene (after fitCameraToCherryTree). Returns the new
// skinned meshes; the old ones are gone from the scene, so keep using these instead.
export const buildCherryTreeRig = (Model, BarkMeshes, BlossomMeshes) => {
  Model.updateWorldMatrix(true, true);
  const ModelInverse = Model.matrixWorld.clone().invert();
  const BarkPositions = BarkMeshes.map((Mesh) => getCherryModelSpacePositions(Mesh, ModelInverse));
  const BlossomPositions = BlossomMeshes.map((Mesh) => getCherryModelSpacePositions(Mesh, ModelInverse));
  const AllPositions = [...BarkPositions, ...BlossomPositions].flat();

  const { TrunkBase, BarkHeight } = getCherryTrunkBase(BarkPositions.flat());
  const ChainHeight = Math.max(...AllPositions.map((Position) => Position.y)) - TrunkBase.y;
  const ForkY = TrunkBase.y + BarkHeight * CherryForkHeightFraction;
  const CherryRigLayout = {
    TrunkBase,
    ChainHeight,
    ForkY,
    ForkBlend: ChainHeight * CherryForkBlendFraction,
    BranchSectors: getCherryBranchSectors(
      AllPositions.filter((Position) => Position.y > ForkY),
      TrunkBase,
    ),
  };

  const CherryTrunkBones = createCherryTrunkBones(Model, TrunkBase, ChainHeight);
  const CherryBranchBones = createCherryBranchBones(CherryTrunkBones, CherryRigLayout);
  BarkMeshes.forEach((Mesh, MeshIndex) =>
    setCherryTreeSkinAttributes(Mesh, BarkPositions[MeshIndex], CherryRigLayout),
  );
  BlossomMeshes.forEach((Mesh, MeshIndex) =>
    setCherryTreeSkinAttributes(Mesh, BlossomPositions[MeshIndex], CherryRigLayout),
  );
  const CherryBarkMeshes = BarkMeshes.map(replaceWithSkinnedCherryMesh);
  const CherryBlossomMeshes = BlossomMeshes.map(replaceWithSkinnedCherryMesh);

  // The skeleton takes its bind pose from the bones' current world matrices, so everything
  // has to be in place first. One skeleton is shared by all seven meshes.
  Model.updateWorldMatrix(true, true);
  const CherrySkeleton = new THREE.Skeleton([...CherryTrunkBones, ...CherryBranchBones]);
  [...CherryBarkMeshes, ...CherryBlossomMeshes].forEach((SkinnedMesh) =>
    SkinnedMesh.bind(CherrySkeleton, SkinnedMesh.matrixWorld),
  );
  return { CherryTrunkBones, CherryBranchBones, CherryBarkMeshes, CherryBlossomMeshes };
};
