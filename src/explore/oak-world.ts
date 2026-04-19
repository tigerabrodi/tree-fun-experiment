import { buildTreeBlueprint } from '@/engine/blueprint'
import {
  OAK,
  createForestRuntimeConfig,
  createForestVariantConfig,
} from '@/engine/species'
import { buildTreeLodVariant } from '@/engine/lod'
import { createBarkMaterial, createLeafMaterial } from '@/three/materials'
import {
  createPackedLeafMatrices,
  expandPackedLeafMatrices,
} from '@/three/matrices'
import { finalizeInstancedBounds } from '@/three/forest-render'
import {
  buildInstancedMeshFromMatrixElements,
  createLeafGeometry,
} from '@/three/tree-mesh'
import {
  createPackedTrunkGeometryData,
  createTrunkGeometryFromPackedData,
} from '@/three/trunk-geometry-data'
import { loadBarkTextures, loadLeafTexture } from '@/three/textures'
import { DEFAULT_TREE_ASSET_PACK, type TreeAssetPack } from '@/lib/assets'
import { DEFAULT_WIND_SETTINGS } from '@/three/wind'
import * as THREE from 'three/webgpu'
import type { ExploreTilePlan, ExploreOakLodLevel } from './tile-plan'

const VARIANT_COUNT = 14

export interface ExploreOakVariant {
  index: number
  seed: number
  lodStates: Record<
    ExploreOakLodLevel,
    {
      trunkGeometry: THREE.BufferGeometry
      baseLeafMatrixElements: Float32Array
    }
  >
}

export interface ExploreOakWorldResources {
  barkMaterial: THREE.MeshStandardNodeMaterial
  leafMaterials: Record<ExploreOakLodLevel, THREE.MeshStandardNodeMaterial>
  leafGeometries: Record<ExploreOakLodLevel, THREE.BufferGeometry>
  leafBoundsRadiusByLod: Record<ExploreOakLodLevel, number>
  variants: Array<ExploreOakVariant>
}

export interface ExploreOakTileBuild {
  group: THREE.Group
  treeCount: number
}

function createExploreOakRuntimeConfig() {
  const forestOak = createForestRuntimeConfig(OAK)

  return {
    ...forestOak,
    iterations: Math.max(4, forestOak.iterations - 1),
    initialRadius: forestOak.initialRadius * 0.92,
    leafSize: forestOak.leafSize * 1.16,
    leafDensity: Math.max(0.9, forestOak.leafDensity),
    leafClusterCount: Math.max(6, Math.round(forestOak.leafClusterCount * 0.94)),
    leafClusterSpread: forestOak.leafClusterSpread * 1.05,
  }
}

export async function createExploreOakWorldResources(
  assetPack: TreeAssetPack = DEFAULT_TREE_ASSET_PACK
): Promise<ExploreOakWorldResources> {
  const exploreOak = createExploreOakRuntimeConfig()
  const [barkTextures, leafTexture] = await Promise.all([
    loadBarkTextures(exploreOak.barkTexture, assetPack),
    loadLeafTexture(exploreOak.leafTexture, 'cluster', assetPack),
  ])

  const barkMaterial = createBarkMaterial(barkTextures, DEFAULT_WIND_SETTINGS)
  const leafMaterials: Record<ExploreOakLodLevel, THREE.MeshStandardNodeMaterial> = {
    mid: createLeafMaterial(leafTexture, null, {
      alphaTest: 0.38,
    }),
    far: createLeafMaterial(leafTexture, null, {
      alphaTest: 0.4,
    }),
    ultraFar: createLeafMaterial(leafTexture, null, {
      alphaTest: 0.46,
    }),
  }
  const leafGeometries: Record<ExploreOakLodLevel, THREE.BufferGeometry> = {
    mid: createLeafGeometry(exploreOak.leafSize * 1.18, 'cluster'),
    far: createLeafGeometry(exploreOak.leafSize * 1.24, 'cluster'),
    ultraFar: createLeafGeometry(exploreOak.leafSize * 1.5, 'single'),
  }

  const variants = new Array(VARIANT_COUNT).fill(null).map((_, index) => {
    const seed = (Math.imul(index + 1, 92837111) ^ 0x51c3ad15) >>> 0 || 1
    const config = createForestVariantConfig(exploreOak, seed, 1.75)
    const blueprint = buildTreeBlueprint(config, seed)
    const midLod = buildTreeLodVariant(blueprint, 'mid')
    const farLod = buildTreeLodVariant(blueprint, 'far')
    const ultraFarLod = buildTreeLodVariant(blueprint, 'ultraFar')

    return {
      index,
      seed,
      lodStates: {
        mid: {
          trunkGeometry: createTrunkGeometryFromPackedData(
            createPackedTrunkGeometryData(midLod.blueprint.segments, {
              radialSegments: midLod.renderConfig.trunkRadialSegments,
            })
          ),
          baseLeafMatrixElements: createPackedLeafMatrices(
            midLod.blueprint.leaves,
            seed,
            midLod.renderConfig
          ),
        },
        far: {
          trunkGeometry: createTrunkGeometryFromPackedData(
            createPackedTrunkGeometryData(farLod.blueprint.segments, {
              radialSegments: farLod.renderConfig.trunkRadialSegments,
            })
          ),
          baseLeafMatrixElements: createPackedLeafMatrices(
            farLod.blueprint.leaves,
            seed,
            farLod.renderConfig
          ),
        },
        ultraFar: {
          trunkGeometry: createTrunkGeometryFromPackedData(
            createPackedTrunkGeometryData(ultraFarLod.blueprint.segments, {
              radialSegments: ultraFarLod.renderConfig.trunkRadialSegments,
            })
          ),
          baseLeafMatrixElements: createPackedLeafMatrices(
            ultraFarLod.blueprint.leaves,
            seed,
            ultraFarLod.renderConfig
          ),
        },
      },
    }
  })

  return {
    barkMaterial,
    leafMaterials,
    leafGeometries,
    leafBoundsRadiusByLod: {
      mid: exploreOak.leafSize * 1.76,
      far: exploreOak.leafSize * 1.88,
      ultraFar: exploreOak.leafSize * 2.02,
    },
    variants,
  }
}
export function buildExploreOakTileFromPlan(
  plan: ExploreTilePlan,
  resources: ExploreOakWorldResources
): ExploreOakTileBuild {
  const group = new THREE.Group()

  if (plan.treeCount === 0) {
    return {
      group,
      treeCount: 0,
    }
  }

  for (const variant of resources.variants) {
    const variantPlan = plan.variantPlans.find(
      (candidate) => candidate.variantIndex === variant.index
    )

    if (!variantPlan) {
      continue
    }

    const treeMatrixElements = variantPlan.treeMatrixElements
    const variantLodState = variant.lodStates[plan.lodLevel]
    const trunkMesh = buildInstancedMeshFromMatrixElements(
      variantLodState.trunkGeometry,
      treeMatrixElements,
      resources.barkMaterial
    )
    trunkMesh.userData.treeRole = 'wood'
    finalizeInstancedBounds(trunkMesh)
    group.add(trunkMesh)

    const leafMatrixElements = expandPackedLeafMatrices(
      treeMatrixElements,
      variantLodState.baseLeafMatrixElements
    )
    const leafMesh = buildInstancedMeshFromMatrixElements(
      resources.leafGeometries[plan.lodLevel],
      leafMatrixElements,
      resources.leafMaterials[plan.lodLevel]
    )
    leafMesh.userData.treeRole = 'leaf'
    leafMesh.frustumCulled = true
    finalizeInstancedBounds(
      leafMesh,
      resources.leafBoundsRadiusByLod[plan.lodLevel]
    )
    group.add(leafMesh)
  }

  group.updateMatrixWorld(true)

  return {
    group,
    treeCount: plan.treeCount,
  }
}

export function disposeExploreOakWorldResources(
  resources: ExploreOakWorldResources
) {
  resources.barkMaterial.dispose()
  resources.leafMaterials.mid.dispose()
  resources.leafMaterials.far.dispose()
  resources.leafMaterials.ultraFar.dispose()
  resources.leafGeometries.mid.dispose()
  resources.leafGeometries.far.dispose()
  resources.leafGeometries.ultraFar.dispose()

  for (const variant of resources.variants) {
    variant.lodStates.mid.trunkGeometry.dispose()
    variant.lodStates.far.trunkGeometry.dispose()
    variant.lodStates.ultraFar.trunkGeometry.dispose()
  }
}
