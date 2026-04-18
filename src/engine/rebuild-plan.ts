import { buildForestVariantBlueprints, buildTreeBlueprint, type TreeBlueprint } from './blueprint'
import { buildForestChunks, type ForestChunk, type ForestChunkPlan } from './chunks'
import { buildForestLayout, type ForestInstance, type ForestSettings } from './forest'
import {
  buildForestLodVariants,
  type PlannedChunkLodState,
  TREE_LOD_LEVELS,
  type PlannedForestLodVariant,
  type TreeLodLevel,
} from './lod'
import { generateLString } from './lsystem'
import type { SpeciesConfig } from './species'
import {
  createPackedLeafMatrices,
  createPackedTreeMatrices,
  expandPackedLeafMatrices,
} from '../three/matrices'
import {
  createPackedTrunkGeometryData,
  type PackedTrunkGeometryData,
} from '../three/trunk-geometry-data'

export interface PlannedChunkLodStateMap {
  near: PlannedChunkLodState
  mid: PlannedChunkLodState
  far: PlannedChunkLodState
  ultraFar: PlannedChunkLodState
}

export interface PlannedForestChunk {
  id: string
  gridX: number
  gridZ: number
  center: ForestChunk['center']
  cellSize: number
  bounds: ForestChunk['bounds']
  instances: Array<ForestInstance>
  lodStates: PlannedChunkLodStateMap
}

export interface PlannedSingleForest {
  kind: 'single'
  layout: Array<ForestInstance>
  chunkPlan: ForestChunkPlan
  blueprints: Array<TreeBlueprint>
  leafMatrixElements: Float32Array
  trunkGeometryData: Array<PackedTrunkGeometryData>
}

export interface PlannedGiantForest {
  kind: 'giant'
  layout: Array<ForestInstance>
  chunkPlan: ForestChunkPlan
  chunks: Array<PlannedForestChunk>
}

export type SceneRebuildPlan = PlannedSingleForest | PlannedGiantForest

function createChunkVariationSeed(gridX: number, gridZ: number, variationSeed: number) {
  return (
    (Math.imul(gridX ^ variationSeed, 73856093) ^
      Math.imul(gridZ ^ variationSeed, 19349663)) >>>
      0 || 1
  )
}

function createChunkLodStates(
  config: SpeciesConfig,
  chunk: ForestChunk,
  variationSeed: number
): PlannedChunkLodStateMap {
  const chunkSeed = createChunkVariationSeed(
    chunk.gridX,
    chunk.gridZ,
    variationSeed
  )
  const variants = buildForestVariantBlueprints(config, chunk.instances, chunkSeed)

  function createPlannedChunkLodState(
    level: TreeLodLevel
  ): PlannedChunkLodState {
    const renderVariants = buildForestLodVariants(variants, level).map(
      (variant) => ({
        ...variant,
        treeMatrixElements: createPackedTreeMatrices(variant.instances),
        trunkGeometryData: createPackedTrunkGeometryData(
          variant.blueprint.segments,
          {
            radialSegments: variant.renderConfig.trunkRadialSegments,
          }
        ),
      })
    )
    const leafMatrixElements = concatenateFloat32Arrays(
      renderVariants.map((variant) =>
        expandPackedLeafMatrices(
          variant.treeMatrixElements ?? new Float32Array(),
          createPackedLeafMatrices(
            variant.blueprint.leaves,
            variant.seed,
            variant.renderConfig
          )
        )
      )
    )

    return {
      variants: renderVariants,
      leafMatrixElements,
    }
  }

  return {
    near: createPlannedChunkLodState('near'),
    mid: createPlannedChunkLodState('mid'),
    far: createPlannedChunkLodState('far'),
    ultraFar: createPlannedChunkLodState('ultraFar'),
  }
}

function concatenateFloat32Arrays(buffers: Array<Float32Array>): Float32Array {
  const totalLength = buffers.reduce((count, buffer) => count + buffer.length, 0)

  if (totalLength === 0) {
    return new Float32Array()
  }

  const combined = new Float32Array(totalLength)
  let offset = 0

  for (const buffer of buffers) {
    combined.set(buffer, offset)
    offset += buffer.length
  }

  return combined
}

export function buildSceneRebuildPlan(
  config: SpeciesConfig,
  forest: ForestSettings,
  variationSeed: number
): SceneRebuildPlan {
  const layout = buildForestLayout({
    mode: forest.mode,
    count: forest.count,
    radius: forest.radius,
    seed: variationSeed,
  })
  const chunkPlan = buildForestChunks(layout, forest)

  if (forest.mode === 'giant') {
    return {
      kind: 'giant',
      layout,
      chunkPlan,
      chunks: chunkPlan.chunks.map((chunk) => ({
        ...chunk,
        lodStates: createChunkLodStates(config, chunk, variationSeed),
      })),
    }
  }

  const lstring = generateLString(config)
  const blueprints = layout.map((item) => buildTreeBlueprint(config, item.seed, lstring))

  return {
    kind: 'single',
    layout,
    chunkPlan,
    blueprints,
    trunkGeometryData: blueprints.map((blueprint) =>
      createPackedTrunkGeometryData(blueprint.segments)
    ),
    leafMatrixElements: concatenateFloat32Arrays(
      layout.map((item, index) =>
        expandPackedLeafMatrices(
          createPackedTreeMatrices([item]),
          createPackedLeafMatrices(
            blueprints[index].leaves,
            item.seed,
            config
          )
        )
      )
    ),
  }
}

export function flattenNearVariants(
  chunks: Array<PlannedForestChunk>
): Array<PlannedForestLodVariant> {
  return chunks.flatMap((chunk) => chunk.lodStates.near.variants)
}

export function getPlannedChunkLodStates(
  chunk: PlannedForestChunk
): Array<[TreeLodLevel, PlannedChunkLodState]> {
  return TREE_LOD_LEVELS.map((level) => [level, chunk.lodStates[level]])
}
