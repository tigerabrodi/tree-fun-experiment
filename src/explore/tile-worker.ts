/// <reference lib="webworker" />

import {
  createExploreTilePlan,
  type ExploreTilePlan,
} from './tile-plan'
import { createExploreTerrainHeightSampler } from './terrain-height'
import type {
  ExploreTileWorkerRequest,
  ExploreTileWorkerResponse,
} from './tile-worker-types'

function collectTransferBuffers(plans: Array<ExploreTilePlan>) {
  const buffers = new Array<Transferable>()

  for (const plan of plans) {
    buffers.push(plan.terrainHeights.buffer as ArrayBuffer)

    for (const variantPlan of plan.variantPlans) {
      buffers.push(variantPlan.treeMatrixElements.buffer as ArrayBuffer)
    }
  }

  return buffers
}

self.onmessage = (event: MessageEvent<ExploreTileWorkerRequest>) => {
  const start = performance.now()
  const message = event.data

  try {
    const sampleHeight = createExploreTerrainHeightSampler(message.worldSeed)
    const plans = message.tileRequests.map((request) =>
      createExploreTilePlan(
        message.worldSeed,
        request,
        sampleHeight,
        message.variantCount
      )
    )

    const response: ExploreTileWorkerResponse = {
      id: message.id,
      ok: true,
      plans,
      workerMs: Number((performance.now() - start).toFixed(2)),
    }

    self.postMessage(response, collectTransferBuffers(plans))
  } catch (error) {
    const response: ExploreTileWorkerResponse = {
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : 'Explore tile worker failed',
    }

    self.postMessage(response)
  }
}

export {}
