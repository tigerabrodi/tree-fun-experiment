import type { TreeLodLevel } from '@/engine/lod'
import type { PlannedChunkLodStateMap } from '@/engine/rebuild-plan'
import type { ChunkPerformanceSummary } from './performance'
import type { ChunkLodRenderState } from './forest-render'

export interface LiveChunkSummaryState {
  id: string
  treeCount: number
  cellSize: number
  centerX: number
  centerZ: number
  variantCount: number
  woodDrawBatches: number
  leafAnchorCount: number
  branchSegmentCount: number
  lodLevel: TreeLodLevel
  lodStates: Partial<Record<TreeLodLevel, ChunkLodRenderState>>
  plannedLodStates?: PlannedChunkLodStateMap
  visible: boolean
}

export function summarizeLiveChunk(
  chunk: LiveChunkSummaryState
): ChunkPerformanceSummary {
  const activeLevel = chunk.lodLevel
  const plannedLodState = chunk.plannedLodStates?.[activeLevel]
  const activeLodState = chunk.lodStates[activeLevel]

  if (!plannedLodState || !chunk.visible) {
    return {
      id: chunk.id,
      treeCount: chunk.treeCount,
      variantCount: plannedLodState?.variants.length ?? chunk.variantCount,
      woodDrawBatches: chunk.visible
        ? plannedLodState?.variants.length ?? chunk.woodDrawBatches
        : 0,
      woodInstanceCount: chunk.treeCount,
      leafAnchorCount: chunk.visible ? chunk.leafAnchorCount : 0,
      leafInstanceCount: chunk.visible ? activeLodState?.leafInstanceCount ?? 0 : 0,
      branchSegmentCount: chunk.visible ? chunk.branchSegmentCount : 0,
      cellSize: chunk.cellSize,
      centerX: chunk.centerX,
      centerZ: chunk.centerZ,
      visible: chunk.visible,
      lodLevel: chunk.visible ? chunk.lodLevel : null,
    }
  }

  const leafAnchorCount = plannedLodState.variants.reduce(
    (count, variant) =>
      count + variant.blueprint.leaves.length * variant.instances.length,
    0
  )
  const branchSegmentCount = plannedLodState.variants.reduce(
    (count, variant) =>
      count + variant.blueprint.segments.length * variant.instances.length,
    0
  )

  return {
    id: chunk.id,
    treeCount: chunk.treeCount,
    variantCount: plannedLodState.variants.length,
    woodDrawBatches: plannedLodState.variants.length,
    woodInstanceCount: chunk.treeCount,
    leafAnchorCount,
    leafInstanceCount: activeLodState?.leafInstanceCount ?? 0,
    branchSegmentCount,
    cellSize: chunk.cellSize,
    centerX: chunk.centerX,
    centerZ: chunk.centerZ,
    visible: chunk.visible,
    lodLevel: chunk.lodLevel,
  }
}

export function summarizeLiveChunks(
  chunks: Array<LiveChunkSummaryState>
): Array<ChunkPerformanceSummary> {
  return chunks.map((chunk) => summarizeLiveChunk(chunk))
}
