import type { RebuildWorkerBuildResult } from '@/engine/rebuild-worker-client'

export function getWorkerPerformanceStats(workerBuild: RebuildWorkerBuildResult) {
  return {
    workerMs: workerBuild.workerMs,
    workerBlueprintMs: workerBuild.workerMetrics.blueprintMs,
    workerLodMs: workerBuild.workerMetrics.lodMs,
    workerMatrixMs: workerBuild.workerMetrics.matrixMs,
    workerGeometryMs: workerBuild.workerMetrics.geometryMs,
    workerCloneMs: workerBuild.workerMetrics.cloneMs,
    workerCacheHits: workerBuild.workerMetrics.cacheHits,
    workerCacheMisses: workerBuild.workerMetrics.cacheMisses,
    workerPlanCacheHit: workerBuild.workerMetrics.planCacheHit,
  }
}
