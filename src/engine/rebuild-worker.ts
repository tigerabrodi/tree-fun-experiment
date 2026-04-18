/// <reference lib="webworker" />

import { buildSceneRebuildPlan } from './rebuild-plan'
import type { RebuildWorkerRequest, RebuildWorkerResponse } from './rebuild-worker-types'

declare const self: DedicatedWorkerGlobalScope

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

  try {
    const plan = buildSceneRebuildPlan(config, forest, variationSeed)
    const response: RebuildWorkerResponse = {
      id,
      ok: true,
      plan,
      workerMs: Number((performance.now() - start).toFixed(2)),
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
