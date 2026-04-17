import type { ForestInstance } from '@/engine/forest'
import type { ForestChunk } from '@/engine/chunks'
import type { ForestVariantBlueprint, TreeBlueprint } from '@/engine/blueprint'
import {
  buildTreeLodVariant,
  type TreeLodLevel,
  type TreeLodVariant,
} from '@/engine/lod'
import * as THREE from 'three/webgpu'
import { createLeafMaterial } from './materials'
import {
  buildLeafMatrices,
  buildLeafMeshFromMatrices,
  buildTrunkGeometry,
  createLeafGeometry,
} from './tree-mesh'
import { createLeafWindRuntime, type LeafWindRuntime, type WindSettings } from './wind'
import type { ChunkPerformanceSummary } from './performance'

export interface ChunkLodRenderState {
  group: THREE.Group
  leafWindRuntime: LeafWindRuntime | null
  leafInstanceCount: number
}

export interface ForestSharedRenderVariant {
  seed: number
  instances: Array<ForestInstance>
  blueprint: TreeBlueprint
  renderConfig: TreeLodVariant['renderConfig']
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
): { group: THREE.Group; leafMatrices: Array<THREE.Matrix4> } {
  const group = new THREE.Group()
  const leafMatrices: Array<THREE.Matrix4> = []

  for (const variant of variants) {
    const trunkGeometry = buildTrunkGeometry(variant.blueprint.segments, {
      radialSegments: variant.renderConfig.trunkRadialSegments,
    })
    const trunkMesh = new THREE.InstancedMesh(
      trunkGeometry,
      barkMaterial,
      variant.instances.length
    )
    trunkMesh.userData.treeRole = 'wood'
    const treeMatrices = variant.instances.map((item) => createTreeMatrix(item))

    for (let i = 0; i < treeMatrices.length; i++) {
      trunkMesh.setMatrixAt(i, treeMatrices[i])
    }

    trunkMesh.instanceMatrix.needsUpdate = true
    finalizeInstancedBounds(trunkMesh)
    group.add(trunkMesh)

    const baseLeafMatrices = buildLeafMatrices(
      variant.blueprint.leaves,
      variant.seed,
      variant.renderConfig
    )

    for (const treeMatrix of treeMatrices) {
      for (const baseLeafMatrix of baseLeafMatrices) {
        leafMatrices.push(treeMatrix.clone().multiply(baseLeafMatrix))
      }
    }
  }

  return { group, leafMatrices }
}

export function buildChunkSummary(
  chunk: ForestChunk,
  variants: Array<ForestVariantBlueprint>,
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
  }
}

export function buildChunkLodVariants(
  variants: Array<ForestVariantBlueprint>,
  level: TreeLodLevel
): Array<ForestSharedRenderVariant> {
  return variants.map((variant) => {
    const lodVariant = buildTreeLodVariant(variant.blueprint, level)

    return {
      seed: variant.seed,
      instances: variant.instances,
      blueprint: lodVariant.blueprint,
      renderConfig: lodVariant.renderConfig,
    }
  })
}

export function buildChunkLodRenderState(
  variants: Array<ForestSharedRenderVariant>,
  barkMaterial: THREE.Material,
  leafTexture: THREE.Texture,
  wind: WindSettings
): ChunkLodRenderState {
  const group = new THREE.Group()
  const sharedForest = buildSharedForestGroup(variants, barkMaterial)

  group.add(sharedForest.group)

  const leafWindRuntime = createLeafWindRuntime(sharedForest.leafMatrices, wind)

  if (leafWindRuntime && sharedForest.leafMatrices.length > 0) {
    const leafMaterial = createLeafMaterial(
      leafTexture,
      leafWindRuntime.renderOffsetBuffer
    )
    const leafGeometry = createLeafGeometry(
      variants[0].renderConfig.leafSize,
      variants[0].renderConfig.leafGeometryType
    )
    const leafMesh = buildLeafMeshFromMatrices(
      leafGeometry,
      sharedForest.leafMatrices,
      leafMaterial
    )
    leafMesh.userData.treeRole = 'leaf'
    leafMesh.frustumCulled = true
    finalizeInstancedBounds(leafMesh, variants[0].renderConfig.leafSize * 1.6)
    group.add(leafMesh)
  }

  group.updateMatrixWorld(true)

  return {
    group,
    leafWindRuntime,
    leafInstanceCount: sharedForest.leafMatrices.length,
  }
}
