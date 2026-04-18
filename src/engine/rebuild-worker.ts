/// <reference lib="webworker" />

import {
  buildSceneRebuildPlan,
  cloneSceneRebuildPlan,
  createRebuildPlanBuildMetrics,
  createRebuildPlanCache,
  createSceneRebuildPlanCacheKey,
} from './rebuild-plan'
import type { RebuildWorkerRequest, RebuildWorkerResponse } from './rebuild-worker-types'

declare const self: DedicatedWorkerGlobalScope
const rebuildPlanCache = createRebuildPlanCache()

function collectRebuildPlanTransferables(
  plan: ReturnType<typeof buildSceneRebuildPlan>
): Array<Transferable> {
  function pushBuffer(
    buffers: Array<Transferable>,
    typedArray: Float32Array | undefined
  ) {
    const buffer = typedArray?.buffer

    if (buffer instanceof ArrayBuffer) {
      buffers.push(buffer)
    }
  }

  function pushPackedTrunkGeometryBuffers(
    buffers: Array<Transferable>,
    geometry:
      | {
          position: Float32Array
          normal: Float32Array
          uv: Float32Array
          windWeight: Float32Array
          windPhase: Float32Array
          index: Uint16Array | Uint32Array | null
        }
      | undefined
  ) {
    if (!geometry) {
      return
    }

    pushBuffer(buffers, geometry.position)
    pushBuffer(buffers, geometry.normal)
    pushBuffer(buffers, geometry.uv)
    pushBuffer(buffers, geometry.windWeight)
    pushBuffer(buffers, geometry.windPhase)

    if (geometry.index?.buffer instanceof ArrayBuffer) {
      buffers.push(geometry.index.buffer)
    }
  }

  if (plan.kind === 'single') {
    const buffers: Array<Transferable> = []
    for (const trunkGeometryData of plan.trunkGeometryData) {
      pushPackedTrunkGeometryBuffers(buffers, trunkGeometryData)
    }
    pushBuffer(buffers, plan.leafMatrixElements)
    return buffers
  }

  const buffers: Array<Transferable> = []

  for (const chunk of plan.chunks) {
    const lodStates = [
      chunk.lodStates.near,
      chunk.lodStates.mid,
      chunk.lodStates.far,
      chunk.lodStates.ultraFar,
    ]

    for (const lodState of lodStates) {
      pushBuffer(buffers, lodState.leafMatrixElements)

      for (const variant of lodState.variants) {
        pushBuffer(buffers, variant.treeMatrixElements)
        pushPackedTrunkGeometryBuffers(buffers, variant.trunkGeometryData)
      }
    }
  }

  return buffers
}

self.onmessage = (event: MessageEvent<RebuildWorkerRequest>) => {
  const { id, config, forest, variationSeed } = event.data
  const start = performance.now()
  const workerMetrics = createRebuildPlanBuildMetrics()

  try {
    const requestKey = createSceneRebuildPlanCacheKey(
      config,
      forest,
      variationSeed
    )
    const cachedPlan = rebuildPlanCache.plans.entries.get(requestKey)
    let sourcePlan

    if (cachedPlan) {
      rebuildPlanCache.plans.entries.delete(requestKey)
      rebuildPlanCache.plans.entries.set(requestKey, cachedPlan)
      workerMetrics.planCacheHit = true
      workerMetrics.cacheHits += 1
      sourcePlan = cachedPlan
    } else {
      workerMetrics.cacheMisses += 1
      sourcePlan = buildSceneRebuildPlan(config, forest, variationSeed, {
        cache: rebuildPlanCache,
        metrics: workerMetrics,
      })
      rebuildPlanCache.plans.entries.set(requestKey, sourcePlan)
      while (rebuildPlanCache.plans.entries.size > rebuildPlanCache.plans.limit) {
        const oldestKey = rebuildPlanCache.plans.entries.keys().next().value
        if (!oldestKey) {
          break
        }
        rebuildPlanCache.plans.entries.delete(oldestKey)
      }
    }

    const cloneStart = performance.now()
    const plan = cloneSceneRebuildPlan(sourcePlan)
    workerMetrics.cloneMs = Number((performance.now() - cloneStart).toFixed(2))
    const response: RebuildWorkerResponse = {
      id,
      ok: true,
      plan,
      workerMs: Number((performance.now() - start).toFixed(2)),
      workerMetrics: {
        ...workerMetrics,
        layoutMs: Number(workerMetrics.layoutMs.toFixed(2)),
        chunkMs: Number(workerMetrics.chunkMs.toFixed(2)),
        blueprintMs: Number(workerMetrics.blueprintMs.toFixed(2)),
        lodMs: Number(workerMetrics.lodMs.toFixed(2)),
        matrixMs: Number(workerMetrics.matrixMs.toFixed(2)),
        geometryMs: Number(workerMetrics.geometryMs.toFixed(2)),
        cloneMs: Number(workerMetrics.cloneMs.toFixed(2)),
      },
    }
    self.postMessage(response, collectRebuildPlanTransferables(plan))
  } catch (error) {
    const response: RebuildWorkerResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : 'Worker rebuild failed',
    }
    self.postMessage(response)
  }
}
