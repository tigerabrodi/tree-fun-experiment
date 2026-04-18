import type { ForestSettings } from './forest'
import type { SceneRebuildPlan } from './rebuild-plan'
import type {
  RebuildWorkerRequest,
  RebuildWorkerResponse,
} from './rebuild-worker-types'
import type { SpeciesConfig } from './species'

interface PendingRequest {
  resolve: (result: RebuildWorkerBuildResult) => void
  reject: (error: Error) => void
}

export interface RebuildWorkerBuildResult {
  plan: SceneRebuildPlan
  workerMs: number
}

export interface RebuildWorkerClient {
  build: (
    config: SpeciesConfig,
    forest: ForestSettings,
    variationSeed: number
  ) => Promise<RebuildWorkerBuildResult>
  dispose: () => void
}

export function createRebuildWorkerClient(): RebuildWorkerClient {
  const worker = new Worker(new URL('./rebuild-worker.ts', import.meta.url), {
    type: 'module',
  })
  let nextId = 1
  const pending = new Map<number, PendingRequest>()

  worker.onmessage = (event: MessageEvent<RebuildWorkerResponse>) => {
    const message = event.data
    const request = pending.get(message.id)

    if (!request) {
      return
    }

    pending.delete(message.id)

    if (message.ok) {
      request.resolve({
        plan: message.plan,
        workerMs: message.workerMs,
      })
      return
    }

    request.reject(new Error(message.error))
  }

  worker.onerror = (event) => {
    const error = new Error(event.message || 'Worker rebuild failed')

    for (const request of pending.values()) {
      request.reject(error)
    }
    pending.clear()
  }

  return {
    build(config, forest, variationSeed) {
      const id = nextId++

      return new Promise<RebuildWorkerBuildResult>((resolve, reject) => {
        pending.set(id, { resolve, reject })

        const message: RebuildWorkerRequest = {
          id,
          config,
          forest,
          variationSeed,
        }

        worker.postMessage(message)
      })
    },
    dispose() {
      for (const request of pending.values()) {
        request.reject(new Error('Worker disposed'))
      }
      pending.clear()
      worker.terminate()
    },
  }
}
