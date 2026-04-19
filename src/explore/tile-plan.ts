import type { ForestInstance } from '@/engine/forest'
import type { TerrainHeightSampler } from './terrain-height'
import {
  EXPLORE_TERRAIN_CLEAR_RADIUS,
  EXPLORE_TERRAIN_TILE_SIZE,
  EXPLORE_TERRAIN_TREE_MARGIN,
  getExploreTerrainSegmentsForRing,
} from './terrain-config'
import { createExploreTerrainHeightGrid } from './terrain-height'

export type ExploreOakLodLevel = 'mid' | 'far' | 'ultraFar'

export interface ExploreTileBuildRequest {
  key: string
  gridX: number
  gridZ: number
  ringDistance: number
}

export interface ExploreTileVariantPlan {
  variantIndex: number
  treeMatrixElements: Float32Array
}

export interface ExploreTilePlan {
  key: string
  gridX: number
  gridZ: number
  ringDistance: number
  lodLevel: ExploreOakLodLevel
  terrainSegments: number
  terrainHeights: Float32Array
  treeCount: number
  variantPlans: Array<ExploreTileVariantPlan>
}

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

function createPackedTreeMatrices(instances: Array<ForestInstance>) {
  const elements = new Float32Array(instances.length * 16)

  for (let index = 0; index < instances.length; index += 1) {
    const instance = instances[index]
    const offset = index * 16
    const cosine = Math.cos(instance.rotationY) * instance.scale
    const sine = Math.sin(instance.rotationY) * instance.scale

    elements[offset + 0] = cosine
    elements[offset + 1] = 0
    elements[offset + 2] = -sine
    elements[offset + 3] = 0

    elements[offset + 4] = 0
    elements[offset + 5] = instance.scale
    elements[offset + 6] = 0
    elements[offset + 7] = 0

    elements[offset + 8] = sine
    elements[offset + 9] = 0
    elements[offset + 10] = cosine
    elements[offset + 11] = 0

    elements[offset + 12] = instance.position.x
    elements[offset + 13] = instance.position.y
    elements[offset + 14] = instance.position.z
    elements[offset + 15] = 1
  }

  return elements
}

export function getExploreOakLodLevelForRing(
  ringDistance: number
): ExploreOakLodLevel {
  if (ringDistance <= 0) {
    return 'mid'
  }

  if (ringDistance === 1) {
    return 'far'
  }

  return 'ultraFar'
}

function createTileInstances(
  worldSeed: number,
  gridX: number,
  gridZ: number,
  sampleHeight: TerrainHeightSampler,
  variantCount: number
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
      variantIndex: Math.floor(random() * variantCount),
    })
  }

  return placements
}

export function createExploreTilePlan(
  worldSeed: number,
  request: ExploreTileBuildRequest,
  sampleHeight: TerrainHeightSampler,
  variantCount: number
): ExploreTilePlan {
  const centerX = request.gridX * EXPLORE_TERRAIN_TILE_SIZE
  const centerZ = request.gridZ * EXPLORE_TERRAIN_TILE_SIZE
  const terrainSegments = getExploreTerrainSegmentsForRing(request.ringDistance)
  const terrainHeights = createExploreTerrainHeightGrid(
    centerX,
    centerZ,
    sampleHeight,
    terrainSegments
  )
  const placements = createTileInstances(
    worldSeed,
    request.gridX,
    request.gridZ,
    sampleHeight,
    variantCount
  )

  const variantPlans = new Array<ExploreTileVariantPlan>()

  for (let variantIndex = 0; variantIndex < variantCount; variantIndex += 1) {
    const variantPlacements = placements.filter(
      (placement) => placement.variantIndex === variantIndex
    )

    if (variantPlacements.length === 0) {
      continue
    }

    variantPlans.push({
      variantIndex,
      treeMatrixElements: createPackedTreeMatrices(variantPlacements),
    })
  }

  return {
    key: request.key,
    gridX: request.gridX,
    gridZ: request.gridZ,
    ringDistance: request.ringDistance,
    lodLevel: getExploreOakLodLevelForRing(request.ringDistance),
    terrainSegments,
    terrainHeights,
    treeCount: placements.length,
    variantPlans,
  }
}
