import { describe, expect, it } from 'vitest'
import { GIANT_FOREST_SETTINGS, SINGLE_TREE_FOREST } from './forest'
import { OAK } from './species'
import {
  buildSceneRebuildPlan,
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
    const plan = buildSceneRebuildPlan(OAK, GIANT_FOREST_SETTINGS, 42)

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
      count: 32,
      radius: 26,
    }
    const first = buildSceneRebuildPlan(OAK, testForest, 77)
    const second = buildSceneRebuildPlan(OAK, testForest, 77)

    expect(summarizePlan(first)).toEqual(summarizePlan(second))
  })
})
