import type { ForestInstance, ForestMode } from '@/engine/forest'
import type {
  ForestVariantBlueprint,
  TreeBlueprint,
} from '@/engine/blueprint'

export interface StaticScenePerformanceStats {
  forestMode: ForestMode
  treeCount: number
  uniqueBlueprintCount: number
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

interface SingleForestPerformanceInput {
  forestMode: ForestMode
  layout: Array<ForestInstance>
  blueprints: Array<TreeBlueprint>
  leafInstanceCount: number
  rebuildMs: number
}

interface GiantForestPerformanceInput {
  forestMode: ForestMode
  layout: Array<ForestInstance>
  variants: Array<ForestVariantBlueprint>
  leafInstanceCount: number
  rebuildMs: number
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

  return {
    forestMode: input.forestMode,
    treeCount: input.layout.length,
    uniqueBlueprintCount: input.variants.length,
    woodDrawBatches: input.variants.length,
    woodInstanceCount: input.layout.length,
    leafDrawBatches: input.leafInstanceCount > 0 ? 1 : 0,
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
