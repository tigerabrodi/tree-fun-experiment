import {
  buildForestVariantBlueprints,
  buildTreeBlueprint,
  type TreeBlueprint,
} from './blueprint'
import { buildForestChunks, type ForestChunk, type ForestChunkPlan } from './chunks'
import { buildForestLayout, type ForestInstance, type ForestSettings } from './forest'
import {
  buildTreeLodVariant,
  type PlannedChunkLodState,
  TREE_LOD_LEVELS,
  type PlannedForestLodVariant,
  type TreeLodLevel,
  type TreeLodVariant,
} from './lod'
import { generateLString } from './lsystem'
import type { SpeciesConfig } from './species'
import {
  createPackedLeafMatrices,
  createPackedTreeMatrices,
  expandPackedLeafMatrices,
} from '../three/matrices'
import {
  createPackedTrunkGeometryData,
  type PackedTrunkGeometryData,
} from '../three/trunk-geometry-data'

interface LimitedCache<T> {
  limit: number
  entries: Map<string, T>
}

export interface RebuildPlanBuildMetrics {
  layoutMs: number
  chunkMs: number
  blueprintMs: number
  lodMs: number
  matrixMs: number
  geometryMs: number
  cloneMs: number
  cacheHits: number
  cacheMisses: number
  planCacheHit: boolean
}

export interface RebuildPlanCache {
  plans: LimitedCache<SceneRebuildPlan>
  lstrings: LimitedCache<string>
  blueprints: LimitedCache<TreeBlueprint>
  lodVariants: LimitedCache<TreeLodVariant>
  treeMatrices: LimitedCache<Float32Array>
  leafMatrices: LimitedCache<Float32Array>
  trunkGeometry: LimitedCache<PackedTrunkGeometryData>
}

export interface PlannedChunkLodStateMap {
  near: PlannedChunkLodState
  mid: PlannedChunkLodState
  far: PlannedChunkLodState
  ultraFar: PlannedChunkLodState
}

export interface PlannedForestChunk {
  id: string
  gridX: number
  gridZ: number
  center: ForestChunk['center']
  cellSize: number
  bounds: ForestChunk['bounds']
  instances: Array<ForestInstance>
  lodStates: PlannedChunkLodStateMap
}

export interface PlannedSingleForest {
  kind: 'single'
  layout: Array<ForestInstance>
  chunkPlan: ForestChunkPlan
  blueprints: Array<TreeBlueprint>
  leafMatrixElements: Float32Array
  trunkGeometryData: Array<PackedTrunkGeometryData>
}

export interface PlannedGiantForest {
  kind: 'giant'
  layout: Array<ForestInstance>
  chunkPlan: ForestChunkPlan
  chunks: Array<PlannedForestChunk>
}

export interface BuildSceneRebuildPlanOptions {
  cache?: RebuildPlanCache
  metrics?: RebuildPlanBuildMetrics
}

export type SceneRebuildPlan = PlannedSingleForest | PlannedGiantForest

function createLimitedCache<T>(limit: number): LimitedCache<T> {
  return {
    limit,
    entries: new Map<string, T>(),
  }
}

function readLimitedCache<T>(
  cache: LimitedCache<T>,
  key: string
): T | undefined {
  const value = cache.entries.get(key)
  if (value === undefined) {
    return undefined
  }

  cache.entries.delete(key)
  cache.entries.set(key, value)
  return value
}

function writeLimitedCache<T>(
  cache: LimitedCache<T>,
  key: string,
  value: T
) {
  if (cache.entries.has(key)) {
    cache.entries.delete(key)
  }

  cache.entries.set(key, value)

  while (cache.entries.size > cache.limit) {
    const oldestKey = cache.entries.keys().next().value
    if (!oldestKey) {
      break
    }
    cache.entries.delete(oldestKey)
  }
}

function measureMetric<T>(
  metrics: RebuildPlanBuildMetrics | undefined,
  key:
    | 'layoutMs'
    | 'chunkMs'
    | 'blueprintMs'
    | 'lodMs'
    | 'matrixMs'
    | 'geometryMs'
    | 'cloneMs',
  build: () => T
): T {
  if (!metrics) {
    return build()
  }

  const start = performance.now()
  const result = build()
  metrics[key] += performance.now() - start
  return result
}

function trackCacheHit(metrics: RebuildPlanBuildMetrics | undefined) {
  if (metrics) {
    metrics.cacheHits += 1
  }
}

function trackCacheMiss(metrics: RebuildPlanBuildMetrics | undefined) {
  if (metrics) {
    metrics.cacheMisses += 1
  }
}

function cloneFloat32Array(value: Float32Array): Float32Array {
  return new Float32Array(value)
}

function cloneIndexArray(
  value: Uint16Array | Uint32Array | null
): Uint16Array | Uint32Array | null {
  if (!value) {
    return null
  }

  return value instanceof Uint16Array ? new Uint16Array(value) : new Uint32Array(value)
}

function clonePackedTrunkGeometryData(
  value: PackedTrunkGeometryData
): PackedTrunkGeometryData {
  return {
    position: cloneFloat32Array(value.position),
    normal: cloneFloat32Array(value.normal),
    uv: cloneFloat32Array(value.uv),
    windWeight: cloneFloat32Array(value.windWeight),
    windPhase: cloneFloat32Array(value.windPhase),
    index: cloneIndexArray(value.index),
  }
}

function clonePlannedForestLodVariant(
  value: PlannedForestLodVariant
): PlannedForestLodVariant {
  return {
    ...value,
    treeMatrixElements: value.treeMatrixElements
      ? cloneFloat32Array(value.treeMatrixElements)
      : undefined,
    trunkGeometryData: value.trunkGeometryData
      ? clonePackedTrunkGeometryData(value.trunkGeometryData)
      : undefined,
  }
}

function clonePlannedChunkLodState(
  value: PlannedChunkLodState
): PlannedChunkLodState {
  return {
    variants: value.variants.map((variant) => clonePlannedForestLodVariant(variant)),
    leafMatrixElements: cloneFloat32Array(value.leafMatrixElements),
  }
}

function getConfigCacheKey(config: SpeciesConfig): string {
  return JSON.stringify(config)
}

function getTreeBlueprintCacheKey(config: SpeciesConfig, seed: number): string {
  return `${getConfigCacheKey(config)}|seed:${seed}`
}

function getLodVariantCacheKey(
  config: SpeciesConfig,
  seed: number,
  level: TreeLodLevel
): string {
  return `${getTreeBlueprintCacheKey(config, seed)}|lod:${level}`
}

function getInstanceMatrixCacheKey(instances: Array<ForestInstance>): string {
  return instances
    .map((instance) =>
      [
        instance.seed,
        instance.position.x,
        instance.position.y,
        instance.position.z,
        instance.rotationY,
        instance.scale,
      ].join(':')
    )
    .join('|')
}

function getLeafMatrixCacheKey(
  config: SpeciesConfig,
  seed: number,
  level: TreeLodLevel | 'singleLeaf'
): string {
  return `${getTreeBlueprintCacheKey(config, seed)}|leaf:${level}`
}

function getTrunkGeometryCacheKey(
  config: SpeciesConfig,
  seed: number,
  level: TreeLodLevel | 'singleTrunk',
  radialSegments: number
): string {
  return `${getTreeBlueprintCacheKey(config, seed)}|trunk:${level}:${radialSegments}`
}

function createChunkVariationSeed(
  gridX: number,
  gridZ: number,
  variationSeed: number
) {
  return (
    (Math.imul(gridX ^ variationSeed, 73856093) ^
      Math.imul(gridZ ^ variationSeed, 19349663)) >>>
      0 || 1
  )
}

function concatenateFloat32Arrays(buffers: Array<Float32Array>): Float32Array {
  const totalLength = buffers.reduce((count, buffer) => count + buffer.length, 0)

  if (totalLength === 0) {
    return new Float32Array()
  }

  const combined = new Float32Array(totalLength)
  let offset = 0

  for (const buffer of buffers) {
    combined.set(buffer, offset)
    offset += buffer.length
  }

  return combined
}

function getOrBuildLString(
  config: SpeciesConfig,
  cache: RebuildPlanCache | undefined,
  metrics: RebuildPlanBuildMetrics | undefined
) {
  const cacheKey = getConfigCacheKey(config)

  if (!cache) {
    return measureMetric(metrics, 'blueprintMs', () => generateLString(config))
  }

  const cached = readLimitedCache(cache.lstrings, cacheKey)
  if (cached) {
    trackCacheHit(metrics)
    return cached
  }

  trackCacheMiss(metrics)
  const built = measureMetric(metrics, 'blueprintMs', () => generateLString(config))
  writeLimitedCache(cache.lstrings, cacheKey, built)
  return built
}

function getOrBuildTreeBlueprint(
  config: SpeciesConfig,
  seed: number,
  cache: RebuildPlanCache | undefined,
  metrics: RebuildPlanBuildMetrics | undefined
): TreeBlueprint {
  const cacheKey = getTreeBlueprintCacheKey(config, seed)

  if (!cache) {
    const lstring = getOrBuildLString(config, undefined, metrics)
    return measureMetric(metrics, 'blueprintMs', () =>
      buildTreeBlueprint(config, seed, lstring)
    )
  }

  const cached = readLimitedCache(cache.blueprints, cacheKey)
  if (cached) {
    trackCacheHit(metrics)
    return cached
  }

  trackCacheMiss(metrics)
  const lstring = getOrBuildLString(config, cache, metrics)
  const built = measureMetric(metrics, 'blueprintMs', () =>
    buildTreeBlueprint(config, seed, lstring)
  )
  writeLimitedCache(cache.blueprints, cacheKey, built)
  return built
}

function getOrBuildTreeLodVariant(
  blueprint: TreeBlueprint,
  level: TreeLodLevel,
  cache: RebuildPlanCache | undefined,
  metrics: RebuildPlanBuildMetrics | undefined
): TreeLodVariant {
  const cacheKey = getLodVariantCacheKey(blueprint.config, blueprint.seed, level)

  if (!cache) {
    return measureMetric(metrics, 'lodMs', () =>
      buildTreeLodVariant(blueprint, level)
    )
  }

  const cached = readLimitedCache(cache.lodVariants, cacheKey)
  if (cached) {
    trackCacheHit(metrics)
    return cached
  }

  trackCacheMiss(metrics)
  const built = measureMetric(metrics, 'lodMs', () =>
    buildTreeLodVariant(blueprint, level)
  )
  writeLimitedCache(cache.lodVariants, cacheKey, built)
  return built
}

function getOrBuildTreeMatrices(
  instances: Array<ForestInstance>,
  cache: RebuildPlanCache | undefined,
  metrics: RebuildPlanBuildMetrics | undefined
): Float32Array {
  const cacheKey = getInstanceMatrixCacheKey(instances)

  if (!cache) {
    return measureMetric(metrics, 'matrixMs', () =>
      createPackedTreeMatrices(instances)
    )
  }

  const cached = readLimitedCache(cache.treeMatrices, cacheKey)
  if (cached) {
    trackCacheHit(metrics)
    return cached
  }

  trackCacheMiss(metrics)
  const built = measureMetric(metrics, 'matrixMs', () =>
    createPackedTreeMatrices(instances)
  )
  writeLimitedCache(cache.treeMatrices, cacheKey, built)
  return built
}

function getOrBuildLeafMatrices(
  blueprint: TreeBlueprint,
  seed: number,
  level: TreeLodLevel | 'singleLeaf',
  leafConfig: Pick<
    SpeciesConfig,
    'leafClusterCount' | 'leafClusterSpread' | 'leafClusterStyle'
  >,
  cache: RebuildPlanCache | undefined,
  metrics: RebuildPlanBuildMetrics | undefined
): Float32Array {
  const cacheKey = getLeafMatrixCacheKey(blueprint.config, seed, level)

  if (!cache) {
    return measureMetric(metrics, 'matrixMs', () =>
      createPackedLeafMatrices(blueprint.leaves, seed, leafConfig)
    )
  }

  const cached = readLimitedCache(cache.leafMatrices, cacheKey)
  if (cached) {
    trackCacheHit(metrics)
    return cached
  }

  trackCacheMiss(metrics)
  const built = measureMetric(metrics, 'matrixMs', () =>
    createPackedLeafMatrices(blueprint.leaves, seed, leafConfig)
  )
  writeLimitedCache(cache.leafMatrices, cacheKey, built)
  return built
}

function getOrBuildTrunkGeometry(
  blueprint: TreeBlueprint,
  level: TreeLodLevel | 'singleTrunk',
  radialSegments: number,
  cache: RebuildPlanCache | undefined,
  metrics: RebuildPlanBuildMetrics | undefined
): PackedTrunkGeometryData {
  const cacheKey = getTrunkGeometryCacheKey(
    blueprint.config,
    blueprint.seed,
    level,
    radialSegments
  )

  if (!cache) {
    return measureMetric(metrics, 'geometryMs', () =>
      createPackedTrunkGeometryData(blueprint.segments, { radialSegments })
    )
  }

  const cached = readLimitedCache(cache.trunkGeometry, cacheKey)
  if (cached) {
    trackCacheHit(metrics)
    return cached
  }

  trackCacheMiss(metrics)
  const built = measureMetric(metrics, 'geometryMs', () =>
    createPackedTrunkGeometryData(blueprint.segments, { radialSegments })
  )
  writeLimitedCache(cache.trunkGeometry, cacheKey, built)
  return built
}

function createChunkLodStates(
  config: SpeciesConfig,
  chunk: ForestChunk,
  variationSeed: number,
  cache: RebuildPlanCache | undefined,
  metrics: RebuildPlanBuildMetrics | undefined
): PlannedChunkLodStateMap {
  const chunkSeed = createChunkVariationSeed(
    chunk.gridX,
    chunk.gridZ,
    variationSeed
  )
  const variants = buildForestVariantBlueprints(
    config,
    chunk.instances,
    chunkSeed,
    (variantConfig, variantSeed) =>
      getOrBuildTreeBlueprint(variantConfig, variantSeed, cache, metrics)
  )

  function createPlannedChunkLodState(level: TreeLodLevel): PlannedChunkLodState {
    const renderVariantsWithLeafMatrices = variants.map((variant) => {
      const lodVariant = getOrBuildTreeLodVariant(
        variant.blueprint,
        level,
        cache,
        metrics
      )
      const treeMatrixElements = getOrBuildTreeMatrices(
        variant.instances,
        cache,
        metrics
      )
      const baseLeafMatrixElements = getOrBuildLeafMatrices(
        lodVariant.blueprint,
        variant.seed,
        level,
        lodVariant.renderConfig,
        cache,
        metrics
      )

      return {
        variant: {
          seed: variant.seed,
          instances: variant.instances,
          blueprint: lodVariant.blueprint,
          renderConfig: lodVariant.renderConfig,
          treeMatrixElements,
          trunkGeometryData: getOrBuildTrunkGeometry(
            lodVariant.blueprint,
            level,
            lodVariant.renderConfig.trunkRadialSegments,
            cache,
            metrics
          ),
        } satisfies PlannedForestLodVariant,
        baseLeafMatrixElements,
      }
    })

    const leafMatrixElements = measureMetric(metrics, 'matrixMs', () =>
      concatenateFloat32Arrays(
        renderVariantsWithLeafMatrices.map(({ variant, baseLeafMatrixElements }) =>
          expandPackedLeafMatrices(
            variant.treeMatrixElements ?? new Float32Array(),
            baseLeafMatrixElements
          )
        )
      )
    )

    return {
      variants: renderVariantsWithLeafMatrices.map(({ variant }) => variant),
      leafMatrixElements,
    }
  }

  return {
    near: createPlannedChunkLodState('near'),
    mid: createPlannedChunkLodState('mid'),
    far: createPlannedChunkLodState('far'),
    ultraFar: createPlannedChunkLodState('ultraFar'),
  }
}

export function createRebuildPlanBuildMetrics(): RebuildPlanBuildMetrics {
  return {
    layoutMs: 0,
    chunkMs: 0,
    blueprintMs: 0,
    lodMs: 0,
    matrixMs: 0,
    geometryMs: 0,
    cloneMs: 0,
    cacheHits: 0,
    cacheMisses: 0,
    planCacheHit: false,
  }
}

export function createRebuildPlanCache(): RebuildPlanCache {
  return {
    plans: createLimitedCache<SceneRebuildPlan>(6),
    lstrings: createLimitedCache<string>(32),
    blueprints: createLimitedCache<TreeBlueprint>(128),
    lodVariants: createLimitedCache<TreeLodVariant>(256),
    treeMatrices: createLimitedCache<Float32Array>(128),
    leafMatrices: createLimitedCache<Float32Array>(256),
    trunkGeometry: createLimitedCache<PackedTrunkGeometryData>(256),
  }
}

export function createSceneRebuildPlanCacheKey(
  config: SpeciesConfig,
  forest: ForestSettings,
  variationSeed: number
): string {
  return JSON.stringify({
    config,
    forest,
    variationSeed,
  })
}

export function cloneSceneRebuildPlan(plan: SceneRebuildPlan): SceneRebuildPlan {
  if (plan.kind === 'single') {
    return {
      ...plan,
      layout: plan.layout,
      chunkPlan: plan.chunkPlan,
      blueprints: plan.blueprints,
      leafMatrixElements: cloneFloat32Array(plan.leafMatrixElements),
      trunkGeometryData: plan.trunkGeometryData.map((geometry) =>
        clonePackedTrunkGeometryData(geometry)
      ),
    }
  }

  return {
    ...plan,
    layout: plan.layout,
    chunkPlan: plan.chunkPlan,
    chunks: plan.chunks.map((chunk) => ({
      ...chunk,
      lodStates: {
        near: clonePlannedChunkLodState(chunk.lodStates.near),
        mid: clonePlannedChunkLodState(chunk.lodStates.mid),
        far: clonePlannedChunkLodState(chunk.lodStates.far),
        ultraFar: clonePlannedChunkLodState(chunk.lodStates.ultraFar),
      },
    })),
  }
}

export function buildSceneRebuildPlan(
  config: SpeciesConfig,
  forest: ForestSettings,
  variationSeed: number,
  options: BuildSceneRebuildPlanOptions = {}
): SceneRebuildPlan {
  const { cache, metrics } = options
  const layout = measureMetric(metrics, 'layoutMs', () =>
    buildForestLayout({
      mode: forest.mode,
      count: forest.count,
      radius: forest.radius,
      seed: variationSeed,
    })
  )
  const chunkPlan = measureMetric(metrics, 'chunkMs', () =>
    buildForestChunks(layout, forest)
  )

  if (forest.mode === 'giant') {
    return {
      kind: 'giant',
      layout,
      chunkPlan,
      chunks: chunkPlan.chunks.map((chunk) => ({
        ...chunk,
        lodStates: createChunkLodStates(config, chunk, variationSeed, cache, metrics),
      })),
    }
  }

  const blueprints = layout.map((item) =>
    getOrBuildTreeBlueprint(config, item.seed, cache, metrics)
  )

  return {
    kind: 'single',
    layout,
    chunkPlan,
    blueprints,
    trunkGeometryData: blueprints.map((blueprint) =>
      getOrBuildTrunkGeometry(blueprint, 'singleTrunk', 8, cache, metrics)
    ),
    leafMatrixElements: measureMetric(metrics, 'matrixMs', () =>
      concatenateFloat32Arrays(
        layout.map((item, index) =>
          expandPackedLeafMatrices(
            getOrBuildTreeMatrices([item], cache, metrics),
            getOrBuildLeafMatrices(
              blueprints[index],
              item.seed,
              'singleLeaf',
              config,
              cache,
              metrics
            )
          )
        )
      )
    ),
  }
}

export function flattenNearVariants(
  chunks: Array<PlannedForestChunk>
): Array<PlannedForestLodVariant> {
  return chunks.flatMap((chunk) => chunk.lodStates.near.variants)
}

export function getPlannedChunkLodStates(
  chunk: PlannedForestChunk
): Array<[TreeLodLevel, PlannedChunkLodState]> {
  return TREE_LOD_LEVELS.map((level) => [level, chunk.lodStates[level]])
}
