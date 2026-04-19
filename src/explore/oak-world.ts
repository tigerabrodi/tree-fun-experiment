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
  createPackedTreeMatrices,
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
import type { TerrainHeightSampler } from './terrain'
import {
  EXPLORE_TERRAIN_CLEAR_RADIUS,
  EXPLORE_TERRAIN_TILE_SIZE,
  EXPLORE_TERRAIN_TREE_MARGIN,
} from './terrain'
import type { ForestInstance } from '@/engine/forest'
import * as THREE from 'three/webgpu'

const VARIANT_COUNT = 14
type ExploreOakLodLevel = 'mid' | 'far'

function createSeededRandom(seed: number) {
  let rng = Math.abs(Math.floor(seed)) % 2147483647
  if (rng === 0) rng = 1

  return function random() {
    rng = (rng * 16807) % 2147483647
    return rng / 2147483647
  }
}

function createCellSeed(seed: number, gridX: number, gridZ: number) {
  return (
    (Math.imul(seed ^ (gridX + 1013), 73856093) ^
      Math.imul(seed ^ (gridZ + 1709), 19349663)) >>>
      0 || 1
  )
}

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
    leafSize: forestOak.leafSize * 1.12,
    leafDensity: Math.max(0.64, forestOak.leafDensity * 0.8),
    leafClusterCount: Math.max(4, Math.round(forestOak.leafClusterCount * 0.72)),
    leafClusterSpread: forestOak.leafClusterSpread * 1.12,
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
      alphaTest: 0.4,
    }),
    far: createLeafMaterial(leafTexture, null, {
      alphaTest: 0.44,
    }),
  }
  const leafGeometries: Record<ExploreOakLodLevel, THREE.BufferGeometry> = {
    mid: createLeafGeometry(exploreOak.leafSize * 1.1, 'cluster'),
    far: createLeafGeometry(exploreOak.leafSize * 1.42, 'single'),
  }

  const variants = new Array(VARIANT_COUNT).fill(null).map((_, index) => {
    const seed = (Math.imul(index + 1, 92837111) ^ 0x51c3ad15) >>> 0 || 1
    const config = createForestVariantConfig(exploreOak, seed, 1.75)
    const blueprint = buildTreeBlueprint(config, seed)
    const midLod = buildTreeLodVariant(blueprint, 'mid')
    const farLod = buildTreeLodVariant(blueprint, 'far')

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
      },
    }
  })

  return {
    barkMaterial,
    leafMaterials,
    leafGeometries,
    leafBoundsRadiusByLod: {
      mid: exploreOak.leafSize * 1.62,
      far: exploreOak.leafSize * 1.95,
    },
    variants,
  }
}

function createTileInstances(
  worldSeed: number,
  gridX: number,
  gridZ: number,
  sampleHeight: TerrainHeightSampler
) {
  const seed = createCellSeed(worldSeed, gridX, gridZ)
  const random = createSeededRandom(seed)
  const tileCenterX = gridX * EXPLORE_TERRAIN_TILE_SIZE
  const tileCenterZ = gridZ * EXPLORE_TERRAIN_TILE_SIZE
  const halfSize = EXPLORE_TERRAIN_TILE_SIZE * 0.5 - EXPLORE_TERRAIN_TREE_MARGIN
  const desiredCount = 3 + Math.floor(random() * 3)
  const placements: Array<ForestInstance & { variantIndex: number }> = []
  let attempts = 0

  while (placements.length < desiredCount && attempts < desiredCount * 24) {
    attempts += 1
    const localX = (random() - 0.5) * 2 * halfSize
    const localZ = (random() - 0.5) * 2 * halfSize
    const worldX = tileCenterX + localX
    const worldZ = tileCenterZ + localZ

    if (Math.hypot(worldX, worldZ) < EXPLORE_TERRAIN_CLEAR_RADIUS) {
      continue
    }

    let isTooClose = false

    for (const existing of placements) {
      const dx = existing.position.x - worldX
      const dz = existing.position.z - worldZ

      if (Math.hypot(dx, dz) < 15) {
        isTooClose = true
        break
      }
    }

    if (isTooClose) {
      continue
    }

    placements.push({
      position: {
        x: worldX,
        y: sampleHeight(worldX, worldZ),
        z: worldZ,
      },
      rotationY: random() * Math.PI * 2,
      scale: 0.8 + random() * 0.42,
      seed: (Math.floor(random() * 2147483646) + 1) >>> 0,
      variantIndex: Math.floor(random() * VARIANT_COUNT),
    })
  }

  return placements
}

export function buildExploreOakTile(
  worldSeed: number,
  gridX: number,
  gridZ: number,
  sampleHeight: TerrainHeightSampler,
  resources: ExploreOakWorldResources,
  lodLevel: ExploreOakLodLevel
): ExploreOakTileBuild {
  const group = new THREE.Group()
  const placements = createTileInstances(worldSeed, gridX, gridZ, sampleHeight)

  if (placements.length === 0) {
    return {
      group,
      treeCount: 0,
    }
  }

  for (const variant of resources.variants) {
    const variantPlacements = placements.filter(
      (placement) => placement.variantIndex === variant.index
    )

    if (variantPlacements.length === 0) {
      continue
    }

    const treeMatrixElements = createPackedTreeMatrices(variantPlacements)
    const variantLodState = variant.lodStates[lodLevel]
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
      resources.leafGeometries[lodLevel],
      leafMatrixElements,
      resources.leafMaterials[lodLevel]
    )
    leafMesh.userData.treeRole = 'leaf'
    leafMesh.frustumCulled = true
    finalizeInstancedBounds(leafMesh, resources.leafBoundsRadiusByLod[lodLevel])
    group.add(leafMesh)
  }

  group.updateMatrixWorld(true)

  return {
    group,
    treeCount: placements.length,
  }
}

export function disposeExploreOakWorldResources(
  resources: ExploreOakWorldResources
) {
  resources.barkMaterial.dispose()
  resources.leafMaterials.mid.dispose()
  resources.leafMaterials.far.dispose()
  resources.leafGeometries.mid.dispose()
  resources.leafGeometries.far.dispose()

  for (const variant of resources.variants) {
    variant.lodStates.mid.trunkGeometry.dispose()
    variant.lodStates.far.trunkGeometry.dispose()
  }
}
