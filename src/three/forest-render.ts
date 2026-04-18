import type { ForestInstance } from '@/engine/forest'
import {
  type TreeLodLevel,
  type PlannedChunkLodState,
  type PlannedForestLodVariant,
} from '@/engine/lod'
import type { ForestChunk } from '@/engine/chunks'
import type { TreeBlueprint } from '@/engine/blueprint'
import * as THREE from 'three/webgpu'
import { createLeafMaterial } from './materials'
import {
  buildInstancedMeshFromMatrixElements,
  createLeafGeometry,
} from './tree-mesh'
import {
  createLeafWindRuntimeFromMatrixElements,
  getWindLodProfile,
  scaleWindSettings,
  type LeafWindRuntime,
  type WindSettings,
} from './wind'
import type { ChunkPerformanceSummary } from './performance'
import { createTrunkGeometryFromPackedData } from './trunk-geometry-data'

export interface ChunkLodRenderState {
  group: THREE.Group
  leafWindRuntime: LeafWindRuntime | null
  leafInstanceCount: number
  windMode: 'animated' | 'static'
}

export interface ForestSharedRenderVariant {
  seed: number
  instances: Array<ForestInstance>
  blueprint: TreeBlueprint
  renderConfig: PlannedForestLodVariant['renderConfig']
  treeMatrixElements?: Float32Array
  trunkGeometryData?: PlannedForestLodVariant['trunkGeometryData']
}

export function finalizeInstancedBounds(
  mesh: THREE.InstancedMesh,
  expandBy = 0
) {
  mesh.computeBoundingBox()
  mesh.computeBoundingSphere()

  if (expandBy > 0) {
    mesh.boundingBox?.expandByScalar(expandBy)
    if (mesh.boundingSphere) {
      mesh.boundingSphere.radius += expandBy
    }
  }
}

export function createTreeMatrix(instance: ForestInstance): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(
      instance.position.x,
      instance.position.y,
      instance.position.z
    ),
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      instance.rotationY
    ),
    new THREE.Vector3(instance.scale, instance.scale, instance.scale)
  )
}

export function buildSharedForestGroup(
  variants: Array<ForestSharedRenderVariant>,
  barkMaterial: THREE.Material
): THREE.Group {
  const group = new THREE.Group()

  for (const variant of variants) {
    const trunkGeometry = variant.trunkGeometryData
      ? createTrunkGeometryFromPackedData(variant.trunkGeometryData)
      : new THREE.BufferGeometry()
    const trunkMesh = buildInstancedMeshFromMatrixElements(
      trunkGeometry,
      variant.treeMatrixElements ?? new Float32Array(),
      barkMaterial,
    )
    trunkMesh.userData.treeRole = 'wood'
    finalizeInstancedBounds(trunkMesh)
    group.add(trunkMesh)
  }

  return group
}

export function buildChunkSummary(
  chunk: ForestChunk,
  variants: Array<Pick<ForestSharedRenderVariant, 'instances' | 'blueprint'>>,
  leafInstanceCount: number
): ChunkPerformanceSummary {
  const treeCount = chunk.instances.length
  const leafAnchorCount = variants.reduce(
    (count, variant) =>
      count + variant.blueprint.leaves.length * variant.instances.length,
    0
  )
  const branchSegmentCount = variants.reduce(
    (count, variant) =>
      count + variant.blueprint.segments.length * variant.instances.length,
    0
  )

  return {
    id: chunk.id,
    treeCount,
    variantCount: variants.length,
    woodDrawBatches: variants.length,
    woodInstanceCount: treeCount,
    leafAnchorCount,
    leafInstanceCount,
    branchSegmentCount,
    cellSize: chunk.cellSize,
    centerX: chunk.center.x,
    centerZ: chunk.center.z,
    visible: true,
    lodLevel: 'near',
  }
}

export function buildChunkLodRenderState(
  level: TreeLodLevel,
  lodState: PlannedChunkLodState,
  barkMaterial: THREE.Material,
  leafTexture: THREE.Texture,
  wind: WindSettings
): ChunkLodRenderState {
  const group = new THREE.Group()
  const sharedForestGroup = buildSharedForestGroup(lodState.variants, barkMaterial)

  group.add(sharedForestGroup)

  const windProfile = getWindLodProfile(level)
  const leafWindRuntime = createLeafWindRuntimeFromMatrixElements(
    lodState.leafMatrixElements,
    scaleWindSettings(wind, windProfile),
    {
      animate: windProfile.animate,
    }
  )

  if (leafWindRuntime && lodState.leafMatrixElements.length > 0) {
    const leafMaterial = createLeafMaterial(
      leafTexture,
      leafWindRuntime.renderOffsetBuffer,
      {
        alphaTest: lodState.variants[0].renderConfig.leafAlphaTest,
      }
    )
    const leafGeometry = createLeafGeometry(
      lodState.variants[0].renderConfig.leafSize,
      lodState.variants[0].renderConfig.leafGeometryType
    )
    const leafMesh = buildInstancedMeshFromMatrixElements(
      leafGeometry,
      lodState.leafMatrixElements,
      leafMaterial
    )
    leafMesh.userData.treeRole = 'leaf'
    leafMesh.frustumCulled = true
    finalizeInstancedBounds(
      leafMesh,
      lodState.variants[0].renderConfig.leafSize * 1.6
    )
    group.add(leafMesh)
  }

  group.updateMatrixWorld(true)

  return {
    group,
    leafWindRuntime,
    leafInstanceCount: lodState.leafMatrixElements.length / 16,
    windMode: leafWindRuntime?.windMode ?? 'static',
  }
}
