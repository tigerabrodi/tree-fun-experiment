import { describe, expect, it } from 'vitest'
import { GIANT_FOREST_SETTINGS, SINGLE_TREE_FOREST } from './forest'
import { OAK } from './species'
import {
  buildSceneRebuildPlan,
  cloneSceneRebuildPlan,
  createRebuildPlanBuildMetrics,
  createRebuildPlanCache,
  flattenNearVariants,
  getPlannedChunkLodStates,
} from './rebuild-plan'
import type { SceneRebuildPlan } from './rebuild-plan'

function summarizePlan(plan: SceneRebuildPlan) {
  if (plan.kind === 'single') {
    return {
      kind: plan.kind,
      layout: plan.layout,
      chunkPlan: plan.chunkPlan,
      blueprintSeeds: plan.blueprints.map((blueprint) => blueprint.seed),
      blueprintLeafCounts: plan.blueprints.map((blueprint) => blueprint.leaves.length),
      blueprintSegmentCounts: plan.blueprints.map(
        (blueprint) => blueprint.segments.length
      ),
      leafMatrixSample: Array.from(plan.leafMatrixElements.slice(0, 32)),
      trunkPositionLengths: plan.trunkGeometryData.map(
        (geometry) => geometry.position.length
      ),
    }
  }

  return {
    kind: plan.kind,
    layout: plan.layout,
    chunkPlan: plan.chunkPlan,
    chunks: plan.chunks.map((chunk) => ({
      id: chunk.id,
      treeCount: chunk.instances.length,
      lodStates: {
        near: {
          variantSeeds: chunk.lodStates.near.variants.map((variant) => variant.seed),
          treeMatrixSample: Array.from(
            chunk.lodStates.near.variants[0]?.treeMatrixElements?.slice(0, 16) ??
              []
          ),
          leafMatrixSample: Array.from(
            chunk.lodStates.near.leafMatrixElements.slice(0, 32)
          ),
          trunkPositionLengths: chunk.lodStates.near.variants.map(
            (variant) => variant.trunkGeometryData?.position.length ?? 0
          ),
        },
        mid: {
          variantSeeds: chunk.lodStates.mid.variants.map((variant) => variant.seed),
          leafMatrixSample: Array.from(
            chunk.lodStates.mid.leafMatrixElements.slice(0, 32)
          ),
        },
        far: {
          variantSeeds: chunk.lodStates.far.variants.map((variant) => variant.seed),
          leafMatrixSample: Array.from(
            chunk.lodStates.far.leafMatrixElements.slice(0, 32)
          ),
        },
        ultraFar: {
          variantSeeds: chunk.lodStates.ultraFar.variants.map(
            (variant) => variant.seed
          ),
          leafMatrixSample: Array.from(
            chunk.lodStates.ultraFar.leafMatrixElements.slice(0, 32)
          ),
        },
      },
    })),
  }
}

describe('buildSceneRebuildPlan', () => {
  it('builds single tree plans with matching blueprints', () => {
    const plan = buildSceneRebuildPlan(OAK, SINGLE_TREE_FOREST, 42)

    expect(plan.kind).toBe('single')
    if (plan.kind !== 'single') {
      return
    }

    expect(plan.layout).toHaveLength(1)
    expect(plan.blueprints).toHaveLength(1)
    expect(plan.chunkPlan.chunks).toHaveLength(1)
    expect(plan.blueprints[0].seed).toBe(plan.layout[0].seed)
    expect(plan.leafMatrixElements.length).toBeGreaterThan(0)
    expect(plan.trunkGeometryData).toHaveLength(1)
    expect(plan.trunkGeometryData[0].position.length).toBeGreaterThan(0)
  })

  it('builds giant forest plans with lod states for every chunk', () => {
    const testForest = {
      ...GIANT_FOREST_SETTINGS,
      count: 10,
      radius: 16,
    }
    const plan = buildSceneRebuildPlan(OAK, testForest, 42)

    expect(plan.kind).toBe('giant')
    if (plan.kind !== 'giant') {
      return
    }

    expect(plan.chunks.length).toBeGreaterThan(1)
    expect(flattenNearVariants(plan.chunks).length).toBeGreaterThan(1)

    for (const chunk of plan.chunks) {
      const lodStates = getPlannedChunkLodStates(chunk)
      expect(lodStates).toHaveLength(4)
      expect(chunk.lodStates.near.variants.length).toBeGreaterThan(0)
      expect(chunk.lodStates.mid.variants.length).toBeGreaterThan(0)
      expect(chunk.lodStates.far.variants.length).toBeGreaterThan(0)
      expect(chunk.lodStates.ultraFar.variants.length).toBeGreaterThan(0)
      expect(chunk.lodStates.near.leafMatrixElements.length).toBeGreaterThan(0)
      expect(
        chunk.lodStates.near.variants[0].trunkGeometryData?.position.length
      ).toBeGreaterThan(0)
    }
  })

  it('is deterministic for the same config and seed', () => {
    const testForest = {
      ...GIANT_FOREST_SETTINGS,
      count: 8,
      radius: 16,
    }
    const first = buildSceneRebuildPlan(OAK, testForest, 77)
    const second = buildSceneRebuildPlan(OAK, testForest, 77)

    expect(summarizePlan(first)).toEqual(summarizePlan(second))
  })

  it('reuses cached worker build pieces on repeated builds', () => {
    const cache = createRebuildPlanCache()
    const firstMetrics = createRebuildPlanBuildMetrics()
    const secondMetrics = createRebuildPlanBuildMetrics()
    const testForest = {
      ...GIANT_FOREST_SETTINGS,
      count: 14,
      radius: 20,
    }

    buildSceneRebuildPlan(OAK, testForest, 77, {
      cache,
      metrics: firstMetrics,
    })
    buildSceneRebuildPlan(OAK, testForest, 77, {
      cache,
      metrics: secondMetrics,
    })

    expect(firstMetrics.cacheMisses).toBeGreaterThan(0)
    expect(secondMetrics.cacheHits).toBeGreaterThan(0)
    expect(secondMetrics.cacheMisses).toBeLessThan(firstMetrics.cacheMisses)
  })

  it('clones typed arrays before a worker response is transferred', () => {
    const plan = buildSceneRebuildPlan(OAK, SINGLE_TREE_FOREST, 42)
    const clone = cloneSceneRebuildPlan(plan)

    if (plan.kind !== 'single' || clone.kind !== 'single') {
      throw new Error('expected single tree plans')
    }

    clone.leafMatrixElements[0] += 1
    clone.trunkGeometryData[0].position[0] += 1

    expect(clone.leafMatrixElements[0]).not.toBe(plan.leafMatrixElements[0])
    expect(clone.trunkGeometryData[0].position[0]).not.toBe(
      plan.trunkGeometryData[0].position[0]
    )
  })
})
