import type { ForestInstance } from './forest'
import {
  generateLString,
  interpretLString,
  type LeafPoint,
  type TreeSegment,
} from './lsystem'
import { createForestVariantConfig, type SpeciesConfig } from './species'

export interface TreeBlueprint {
  config: SpeciesConfig
  seed: number
  lstring: string
  segments: Array<TreeSegment>
  leaves: Array<LeafPoint>
}

export interface ForestVariantBlueprint {
  config: SpeciesConfig
  seed: number
  instances: Array<ForestInstance>
  blueprint: TreeBlueprint
}

function getForestVariantCount(treeCount: number): number {
  return Math.max(
    1,
    Math.min(treeCount, 12, Math.round(Math.sqrt(treeCount) * 1.1))
  )
}

function getForestVariantStrength(treeCount: number): number {
  return 1.15 + Math.min(0.65, treeCount / 200)
}

function getForestVariantIndex(seed: number, variantCount: number): number {
  return (Math.imul(seed, 2654435761) >>> 0) % variantCount
}

function getForestVariantSeed(
  bucketSeed: number,
  variationSeed: number,
  variantIndex: number
): number {
  return (
    (Math.imul(bucketSeed ^ variationSeed, 1597334677) >>> 0 || 1) +
    variantIndex * 9973
  )
}

export function buildTreeBlueprint(
  config: SpeciesConfig,
  seed: number,
  lstring = generateLString(config)
): TreeBlueprint {
  const { segments, leaves } = interpretLString(lstring, config, seed)

  return {
    config,
    seed,
    lstring,
    segments,
    leaves,
  }
}

export function buildForestVariantBlueprints(
  config: SpeciesConfig,
  layout: Array<ForestInstance>,
  variationSeed: number
): Array<ForestVariantBlueprint> {
  if (layout.length === 0) {
    return []
  }

  const variantCount = getForestVariantCount(layout.length)
  const variantStrength = getForestVariantStrength(layout.length)
  const buckets = new Array(variantCount)
    .fill(null)
    .map(() => [] as Array<ForestInstance>)

  for (const item of layout) {
    const variantIndex = getForestVariantIndex(item.seed, variantCount)
    buckets[variantIndex].push(item)
  }

  const variants: Array<ForestVariantBlueprint> = []

  for (let variantIndex = 0; variantIndex < buckets.length; variantIndex++) {
    const bucket = buckets[variantIndex]
    if (bucket.length === 0) continue

    const variantSeed = getForestVariantSeed(
      bucket[0].seed,
      variationSeed,
      variantIndex
    )
    const variantConfig = createForestVariantConfig(
      config,
      variantSeed,
      variantStrength
    )

    variants.push({
      config: variantConfig,
      seed: variantSeed,
      instances: bucket,
      blueprint: buildTreeBlueprint(variantConfig, variantSeed),
    })
  }

  return variants
}
