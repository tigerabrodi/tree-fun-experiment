import { describe, expect, it } from 'vitest'
import { OAK, PINE, createForestVariantConfig } from './species'

describe('createForestVariantConfig', () => {
  it('is deterministic for the same seed', () => {
    const first = createForestVariantConfig(OAK, 42, 1.6)
    const second = createForestVariantConfig(OAK, 42, 1.6)

    expect(first).toEqual(second)
  })

  it('lets stronger forests push the variation further', () => {
    const subtle = createForestVariantConfig(OAK, 42, 0.6)
    const bold = createForestVariantConfig(OAK, 42, 1.8)

    expect(Math.abs(bold.angle - OAK.angle)).toBeGreaterThanOrEqual(
      Math.abs(subtle.angle - OAK.angle)
    )
    expect(
      Math.abs(bold.leafClusterSpread - OAK.leafClusterSpread)
    ).toBeGreaterThanOrEqual(
      Math.abs(subtle.leafClusterSpread - OAK.leafClusterSpread)
    )
  })

  it('keeps forest variants close to the base species shape', () => {
    const variant = createForestVariantConfig(OAK, 42, 1.8)

    expect(Math.abs(variant.angle - OAK.angle)).toBeLessThanOrEqual(6)
    expect(Math.abs(variant.lengthScale - OAK.lengthScale)).toBeLessThanOrEqual(
      0.13
    )
    expect(
      Math.abs(variant.branchSpinJitter - OAK.branchSpinJitter)
    ).toBeLessThanOrEqual(11)
    expect(Math.abs(variant.leafDensity - OAK.leafDensity)).toBeLessThanOrEqual(
      0.08
    )
    expect(
      Math.abs(variant.leafClusterCount - OAK.leafClusterCount)
    ).toBeLessThanOrEqual(1)
    expect(variant.rules).toBe(OAK.rules)
    expect(variant.leafTexture).toBe(OAK.leafTexture)
  })

  it('can vary pine branch structure without changing the species identity', () => {
    const variant = createForestVariantConfig(PINE, 99, 1.7)

    expect(variant.name).toBe(PINE.name)
    expect(variant.branchSpin).not.toBe(0)
    expect(variant.shortStepJitter).not.toBe(PINE.shortStepJitter)
    expect(variant.angle).not.toBe(PINE.angle)
  })

  it('produces several distinct forest variants across different seeds', () => {
    const keys = new Set(
      [11, 29, 47, 83, 101, 151].map((seed) => {
        const variant = createForestVariantConfig(OAK, seed, 1.8)
        return [
          Math.round(variant.angle * 10),
          variant.leafClusterCount,
          Math.round(variant.leafClusterSpread * 100),
        ].join(':')
      })
    )

    expect(keys.size).toBeGreaterThanOrEqual(4)
  })
})
