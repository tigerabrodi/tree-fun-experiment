import { describe, expect, it } from 'vitest'
import { buildForestLayout } from './forest'
import { buildForestVariantBlueprints, buildTreeBlueprint } from './blueprint'
import { generateLString, interpretLString } from './lsystem'
import { OAK, PINE } from './species'

describe('buildTreeBlueprint', () => {
  it('reuses a precomputed l string when one is provided', () => {
    const lstring = generateLString(OAK)
    const blueprint = buildTreeBlueprint(OAK, 42, lstring)
    const direct = interpretLString(lstring, OAK, 42)

    expect(blueprint.lstring).toBe(lstring)
    expect(blueprint.segments).toEqual(direct.segments)
    expect(blueprint.leaves).toEqual(direct.leaves)
  })

  it('is deterministic for the same config and seed', () => {
    const first = buildTreeBlueprint(PINE, 99)
    const second = buildTreeBlueprint(PINE, 99)

    expect(first).toEqual(second)
  })
})

describe('buildForestVariantBlueprints', () => {
  it('keeps giant forest variant planning deterministic', () => {
    const layout = buildForestLayout({
      mode: 'giant',
      count: 120,
      radius: 48,
      seed: 77,
    })

    const first = buildForestVariantBlueprints(OAK, layout, 77)
    const second = buildForestVariantBlueprints(OAK, layout, 77)

    const mapSummary = (variants: typeof first) =>
      variants.map((variant) => ({
        seed: variant.seed,
        treeCount: variant.instances.length,
        angle: Number(variant.config.angle.toFixed(4)),
        leafCount: variant.blueprint.leaves.length,
        segmentCount: variant.blueprint.segments.length,
      }))

    expect(mapSummary(first)).toEqual(mapSummary(second))
  })

  it('spreads a giant forest across several base variants', () => {
    const layout = buildForestLayout({
      mode: 'giant',
      count: 120,
      radius: 48,
      seed: 88,
    })

    const variants = buildForestVariantBlueprints(OAK, layout, 88)
    const totalTrees = variants.reduce(
      (count, variant) => count + variant.instances.length,
      0
    )

    expect(variants.length).toBeGreaterThan(1)
    expect(variants.length).toBeLessThanOrEqual(12)
    expect(totalTrees).toBe(layout.length)
  })
})
