import { describe, expect, it } from 'vitest'
import type { ForestInstance } from '../engine/forest'
import type { ForestVariantBlueprint, TreeBlueprint } from '../engine/blueprint'
import { OAK } from '../engine/species'
import {
  mergeScenePerformanceStats,
  summarizeGiantForestPerformance,
  summarizeSingleForestPerformance,
} from './performance'

function makeInstance(seed: number): ForestInstance {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotationY: 0,
    scale: 1,
    seed,
  }
}

function makeBlueprint(
  seed: number,
  segmentCount: number,
  leafCount: number
): TreeBlueprint {
  return {
    config: OAK,
    seed,
    lstring: 'F',
    segments: new Array(segmentCount).fill(null).map((_, index) => ({
      start: { x: 0, y: index, z: 0 },
      end: { x: 0, y: index + 1, z: 0 },
      startRadius: 0.1,
      endRadius: 0.09,
      depth: 0,
    })),
    leaves: new Array(leafCount).fill(null).map((_, index) => ({
      position: { x: index, y: 1, z: 0 },
      direction: { x: 0, y: 1, z: 0 },
      up: { x: 0, y: 0, z: 1 },
    })),
  }
}

describe('summarizeSingleForestPerformance', () => {
  it('captures counts for custom forest rendering', () => {
    const layout = [makeInstance(1), makeInstance(2)]
    const blueprints = [makeBlueprint(1, 8, 4), makeBlueprint(2, 10, 5)]

    const stats = summarizeSingleForestPerformance({
      forestMode: 'custom',
      layout,
      blueprints,
      leafInstanceCount: 27,
      rebuildMs: 14.2,
      chunkCellSize: 36,
    })

    expect(stats.treeCount).toBe(2)
    expect(stats.uniqueBlueprintCount).toBe(2)
    expect(stats.chunkCount).toBe(1)
    expect(stats.chunkCellSize).toBe(36)
    expect(stats.chunkTreeMin).toBe(2)
    expect(stats.chunkTreeMax).toBe(2)
    expect(stats.chunkTreeAverage).toBe(2)
    expect(stats.woodDrawBatches).toBe(2)
    expect(stats.woodInstanceCount).toBe(2)
    expect(stats.leafAnchorCount).toBe(9)
    expect(stats.leafInstanceCount).toBe(27)
    expect(stats.branchSegmentCount).toBe(18)
    expect(stats.rebuildMs).toBeCloseTo(14.2)
  })
})

describe('summarizeGiantForestPerformance', () => {
  it('captures counts for instanced forest variants', () => {
    const layout = [makeInstance(1), makeInstance(2), makeInstance(3)]
    const variants: Array<ForestVariantBlueprint> = [
      {
        config: OAK,
        seed: 11,
        instances: [layout[0], layout[1]],
        blueprint: makeBlueprint(11, 6, 3),
      },
      {
        config: OAK,
        seed: 22,
        instances: [layout[2]],
        blueprint: makeBlueprint(22, 8, 5),
      },
    ]
    const chunks = [
      {
        id: '0:0',
        treeCount: 2,
        variantCount: 1,
        woodDrawBatches: 1,
        woodInstanceCount: 2,
        leafAnchorCount: 6,
        leafInstanceCount: 18,
        branchSegmentCount: 12,
        cellSize: 16,
        centerX: 0,
        centerZ: 0,
      },
      {
        id: '1:0',
        treeCount: 1,
        variantCount: 1,
        woodDrawBatches: 1,
        woodInstanceCount: 1,
        leafAnchorCount: 5,
        leafInstanceCount: 13,
        branchSegmentCount: 8,
        cellSize: 16,
        centerX: 16,
        centerZ: 0,
      },
    ]

    const stats = summarizeGiantForestPerformance({
      forestMode: 'giant',
      layout,
      variants,
      chunks,
      leafInstanceCount: 31,
      rebuildMs: 22.8,
      chunkCellSize: 16,
    })

    expect(stats.treeCount).toBe(3)
    expect(stats.uniqueBlueprintCount).toBe(2)
    expect(stats.chunkCount).toBe(2)
    expect(stats.chunkCellSize).toBe(16)
    expect(stats.chunkTreeMin).toBe(1)
    expect(stats.chunkTreeMax).toBe(2)
    expect(stats.chunkTreeAverage).toBeCloseTo(1.5)
    expect(stats.woodDrawBatches).toBe(2)
    expect(stats.woodInstanceCount).toBe(3)
    expect(stats.leafDrawBatches).toBe(2)
    expect(stats.leafAnchorCount).toBe(11)
    expect(stats.leafInstanceCount).toBe(31)
    expect(stats.branchSegmentCount).toBe(20)
    expect(stats.rebuildMs).toBeCloseTo(22.8)
  })
})

describe('mergeScenePerformanceStats', () => {
  it('combines static and live render stats', () => {
    const staticStats = summarizeSingleForestPerformance({
      forestMode: 'custom',
      layout: [makeInstance(1)],
      blueprints: [makeBlueprint(1, 7, 2)],
      leafInstanceCount: 8,
      rebuildMs: 9.5,
      chunkCellSize: 24,
    })

    const merged = mergeScenePerformanceStats(staticStats, {
      drawCalls: 4,
      computeCalls: 1,
      triangles: 1200,
      geometries: 3,
      textures: 2,
      fps: 58.4,
      visibleChunkCount: 1,
      culledChunkCount: 0,
    })

    expect(merged.drawCalls).toBe(4)
    expect(merged.computeCalls).toBe(1)
    expect(merged.triangles).toBe(1200)
    expect(merged.geometries).toBe(3)
    expect(merged.textures).toBe(2)
    expect(merged.fps).toBeCloseTo(58.4)
    expect(merged.visibleChunkCount).toBe(1)
    expect(merged.culledChunkCount).toBe(0)
    expect(merged.leafInstanceCount).toBe(8)
  })
})
