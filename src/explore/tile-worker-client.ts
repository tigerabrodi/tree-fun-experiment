import TileWorker from './tile-worker.ts?worker&inline'
import type { ExploreTileBuildRequest, ExploreTilePlan } from './tile-plan'
import type {
  ExploreTileWorkerRequest,
  ExploreTileWorkerResponse,
} from './tile-worker-types'

interface PendingRequest {
  resolve: (result: ExploreTileWorkerBuildResult) => void
  reject: (error: Error) => void
}

export interface ExploreTileWorkerBuildResult {
  plans: Array<ExploreTilePlan>
  workerMs: number
}

export interface ExploreTileWorkerClient {
  buildTiles: (
    worldSeed: number,
    variantCount: number,
    tileRequests: Array<ExploreTileBuildRequest>
  ) => Promise<ExploreTileWorkerBuildResult>
  dispose: () => void
}

export function createExploreTileWorkerClient(): ExploreTileWorkerClient {
  const worker = new TileWorker()
  let nextId = 1
  const pending = new Map<number, PendingRequest>()

  worker.onmessage = (event: MessageEvent<ExploreTileWorkerResponse>) => {
    const message = event.data
    const request = pending.get(message.id)

    if (!request) {
      return
    }

    pending.delete(message.id)

    if (message.ok) {
      request.resolve({
        plans: message.plans,
        workerMs: message.workerMs,
      })
      return
    }

    request.reject(new Error(message.error))
  }

  worker.onerror = (event) => {
    const error = new Error(event.message || 'Explore tile worker failed')

    for (const request of pending.values()) {
      request.reject(error)
    }
    pending.clear()
  }

  return {
    buildTiles(worldSeed, variantCount, tileRequests) {
      const id = nextId++

      return new Promise<ExploreTileWorkerBuildResult>((resolve, reject) => {
        pending.set(id, { resolve, reject })

        const message: ExploreTileWorkerRequest = {
          id,
          worldSeed,
          variantCount,
          tileRequests,
        }

        worker.postMessage(message)
      })
    },
    dispose() {
      for (const request of pending.values()) {
        request.reject(new Error('Explore tile worker disposed'))
      }
      pending.clear()
      worker.terminate()
    },
  }
}
