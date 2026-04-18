import type { ForestSettings } from './forest'
import type {
  RebuildPlanBuildMetrics,
  SceneRebuildPlan,
} from './rebuild-plan'
import type { SpeciesConfig } from './species'

export interface RebuildWorkerRequest {
  id: number
  config: SpeciesConfig
  forest: ForestSettings
  variationSeed: number
}

export interface RebuildWorkerSuccess {
  id: number
  ok: true
  plan: SceneRebuildPlan
  workerMs: number
  workerMetrics: RebuildPlanBuildMetrics
}

export interface RebuildWorkerFailure {
  id: number
  ok: false
  error: string
}

export type RebuildWorkerResponse = RebuildWorkerSuccess | RebuildWorkerFailure
