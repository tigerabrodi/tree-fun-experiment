import type { ForestInstance, ForestMode } from '@/engine/forest'
import type { ForestVariantBlueprint, TreeBlueprint } from '@/engine/blueprint'
import type { DebugViewSettings } from './debug'

export interface ChunkPerformanceSummary {
  id: string
  treeCount: number
  variantCount: number
  woodDrawBatches: number
  woodInstanceCount: number
  leafAnchorCount: number
  leafInstanceCount: number
  branchSegmentCount: number
  cellSize: number
  centerX: number
  centerZ: number
}

export interface StaticScenePerformanceStats {
  forestMode: ForestMode
  treeCount: number
  uniqueBlueprintCount: number
  chunkCount: number
  chunkCellSize: number
  chunkTreeMin: number
  chunkTreeMax: number
  chunkTreeAverage: number
  woodDrawBatches: number
  woodInstanceCount: number
  leafDrawBatches: number
  leafAnchorCount: number
  leafInstanceCount: number
  branchSegmentCount: number
  rebuildMs: number
}

export interface ScenePerformanceStats extends StaticScenePerformanceStats {
  drawCalls: number
  computeCalls: number
  triangles: number
  geometries: number
  textures: number
  fps: number
}

export interface SceneDebugSnapshot {
  performance: ScenePerformanceStats | null
  chunks: Array<ChunkPerformanceSummary>
  debugView: DebugViewSettings
}

interface SingleForestPerformanceInput {
  forestMode: ForestMode
  layout: Array<ForestInstance>
  blueprints: Array<TreeBlueprint>
  leafInstanceCount: number
  rebuildMs: number
  chunkCellSize: number
}

interface GiantForestPerformanceInput {
  forestMode: ForestMode
  layout: Array<ForestInstance>
  variants: Array<ForestVariantBlueprint>
  chunks: Array<ChunkPerformanceSummary>
  leafInstanceCount: number
  rebuildMs: number
  chunkCellSize: number
}

interface LiveRenderPerformanceStats {
  drawCalls: number
  computeCalls: number
  triangles: number
  geometries: number
  textures: number
  fps: number
}

function roundRebuildMs(rebuildMs: number): number {
  return Math.max(0, Number(rebuildMs.toFixed(2)))
}

export function summarizeSingleForestPerformance(
  input: SingleForestPerformanceInput
): StaticScenePerformanceStats {
  const leafAnchorCount = input.blueprints.reduce(
    (count, blueprint) => count + blueprint.leaves.length,
    0
  )
  const branchSegmentCount = input.blueprints.reduce(
    (count, blueprint) => count + blueprint.segments.length,
    0
  )

  return {
    forestMode: input.forestMode,
    treeCount: input.layout.length,
    uniqueBlueprintCount: input.blueprints.length,
    chunkCount: 1,
    chunkCellSize: input.chunkCellSize,
    chunkTreeMin: input.layout.length,
    chunkTreeMax: input.layout.length,
    chunkTreeAverage: input.layout.length,
    woodDrawBatches: input.blueprints.length,
    woodInstanceCount: input.layout.length,
    leafDrawBatches: input.leafInstanceCount > 0 ? 1 : 0,
    leafAnchorCount,
    leafInstanceCount: input.leafInstanceCount,
    branchSegmentCount,
    rebuildMs: roundRebuildMs(input.rebuildMs),
  }
}

export function summarizeGiantForestPerformance(
  input: GiantForestPerformanceInput
): StaticScenePerformanceStats {
  const leafAnchorCount = input.variants.reduce(
    (count, variant) =>
      count + variant.blueprint.leaves.length * variant.instances.length,
    0
  )
  const branchSegmentCount = input.variants.reduce(
    (count, variant) =>
      count + variant.blueprint.segments.length * variant.instances.length,
    0
  )

  const chunkTreeCounts = input.chunks.map((chunk) => chunk.treeCount)
  const chunkTreeTotal = chunkTreeCounts.reduce(
    (count, value) => count + value,
    0
  )

  return {
    forestMode: input.forestMode,
    treeCount: input.layout.length,
    uniqueBlueprintCount: input.variants.length,
    chunkCount: input.chunks.length,
    chunkCellSize: input.chunkCellSize,
    chunkTreeMin: chunkTreeCounts.length > 0 ? Math.min(...chunkTreeCounts) : 0,
    chunkTreeMax: chunkTreeCounts.length > 0 ? Math.max(...chunkTreeCounts) : 0,
    chunkTreeAverage:
      chunkTreeCounts.length > 0 ? chunkTreeTotal / chunkTreeCounts.length : 0,
    woodDrawBatches: input.chunks.reduce(
      (count, chunk) => count + chunk.woodDrawBatches,
      0
    ),
    woodInstanceCount: input.layout.length,
    leafDrawBatches: input.chunks.reduce(
      (count, chunk) => count + (chunk.leafInstanceCount > 0 ? 1 : 0),
      0
    ),
    leafAnchorCount,
    leafInstanceCount: input.leafInstanceCount,
    branchSegmentCount,
    rebuildMs: roundRebuildMs(input.rebuildMs),
  }
}

export function mergeScenePerformanceStats(
  staticStats: StaticScenePerformanceStats,
  liveStats: LiveRenderPerformanceStats
): ScenePerformanceStats {
  return {
    ...staticStats,
    ...liveStats,
  }
}
