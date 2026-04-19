import { describe, expect, it } from 'vitest'
import { buildTreeBlueprint } from './blueprint'
import { buildTreeLodVariant } from './lod'
import { OAK } from './species'

describe('buildTreeLodVariant', () => {
  it('keeps the near lod identical to the base tree blueprint', () => {
    const base = buildTreeBlueprint(OAK, 42)
    const near = buildTreeLodVariant(base, 'near')

    expect(near.blueprint.segments).toHaveLength(base.segments.length)
    expect(near.blueprint.leaves).toHaveLength(base.leaves.length)
    expect(near.renderConfig.trunkRadialSegments).toBe(8)
    expect(near.renderConfig.leafTextureType).toBe('cluster')
    expect(near.renderConfig.leafGeometryType).toBe('cluster')
    expect(near.renderConfig.leafAlphaTest).toBeCloseTo(0.35)
  })

  it('reduces mid lod structure while keeping the species readable', () => {
    const base = buildTreeBlueprint(OAK, 42)
    const mid = buildTreeLodVariant(base, 'mid')

    expect(mid.blueprint.segments.length).toBeLessThan(base.segments.length)
    expect(mid.blueprint.leaves.length).toBeLessThan(base.leaves.length)
    expect(mid.renderConfig.trunkRadialSegments).toBe(6)
    expect(mid.renderConfig.leafTextureType).toBe('cluster')
    expect(mid.renderConfig.leafGeometryType).toBe('cluster')
    expect(mid.renderConfig.leafAlphaTest).toBeCloseTo(0.4)
  })

  it('reduces far lod more aggressively while keeping the same leaf texture family', () => {
    const base = buildTreeBlueprint(OAK, 42)
    const far = buildTreeLodVariant(base, 'far')

    expect(far.blueprint.segments.length).toBeLessThan(base.segments.length)
    expect(far.blueprint.leaves.length).toBeLessThan(base.leaves.length)
    expect(far.renderConfig.trunkRadialSegments).toBe(3)
    expect(far.renderConfig.leafTextureType).toBe(base.config.leafTextureType)
    expect(far.renderConfig.leafGeometryType).toBe('single')
    expect(far.renderConfig.leafAlphaTest).toBeCloseTo(0.44)
    expect(far.renderConfig.leafClusterCount).toBe(
      Math.max(1, Math.round(base.config.leafClusterCount * 0.34))
    )
  })

  it('keeps an ultra far fallback that is cheaper but still keeps some canopy mass', () => {
    const base = buildTreeBlueprint(OAK, 42)
    const ultraFar = buildTreeLodVariant(base, 'ultraFar')

    expect(ultraFar.blueprint.segments.length).toBeLessThanOrEqual(
      buildTreeLodVariant(base, 'far').blueprint.segments.length
    )
    expect(ultraFar.blueprint.leaves.length).toBeLessThan(
      buildTreeLodVariant(base, 'far').blueprint.leaves.length
    )
    expect(ultraFar.renderConfig.trunkRadialSegments).toBe(3)
    expect(ultraFar.renderConfig.leafTextureType).toBe(base.config.leafTextureType)
    expect(ultraFar.renderConfig.leafGeometryType).toBe('single')
    expect(ultraFar.renderConfig.leafAlphaTest).toBeCloseTo(0.5)
    expect(ultraFar.renderConfig.leafClusterCount).toBe(
      Math.max(1, Math.round(base.config.leafClusterCount * 0.2))
    )
  })

  it('is deterministic for the same base blueprint and lod level', () => {
    const base = buildTreeBlueprint(OAK, 77)
    const first = buildTreeLodVariant(base, 'far')
    const second = buildTreeLodVariant(base, 'far')

    expect(first).toEqual(second)
  })
})
