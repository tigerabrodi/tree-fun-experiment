import type { ExploreTileBuildRequest, ExploreTilePlan } from './tile-plan'

export interface ExploreTileWorkerRequest {
  id: number
  worldSeed: number
  variantCount: number
  tileRequests: Array<ExploreTileBuildRequest>
}

export interface ExploreTileWorkerSuccess {
  id: number
  ok: true
  plans: Array<ExploreTilePlan>
  workerMs: number
}

export interface ExploreTileWorkerFailure {
  id: number
  ok: false
  error: string
}

export type ExploreTileWorkerResponse =
  | ExploreTileWorkerSuccess
  | ExploreTileWorkerFailure
