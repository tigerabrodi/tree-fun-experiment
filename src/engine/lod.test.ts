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
  })

  it('reduces mid lod structure while keeping the species readable', () => {
    const base = buildTreeBlueprint(OAK, 42)
    const mid = buildTreeLodVariant(base, 'mid')

    expect(mid.blueprint.segments.length).toBeLessThan(base.segments.length)
    expect(mid.blueprint.leaves.length).toBeLessThan(base.leaves.length)
    expect(mid.renderConfig.trunkRadialSegments).toBe(6)
    expect(mid.renderConfig.leafTextureType).toBe('cluster')
    expect(mid.renderConfig.leafGeometryType).toBe('cluster')
  })

  it('reduces far lod more aggressively while keeping the same leaf texture family', () => {
    const base = buildTreeBlueprint(OAK, 42)
    const far = buildTreeLodVariant(base, 'far')

    expect(far.blueprint.segments.length).toBeLessThan(base.segments.length)
    expect(far.blueprint.leaves.length).toBeLessThan(base.leaves.length)
    expect(far.renderConfig.trunkRadialSegments).toBe(3)
    expect(far.renderConfig.leafTextureType).toBe(base.config.leafTextureType)
    expect(far.renderConfig.leafGeometryType).toBe('single')
    expect(far.renderConfig.leafClusterCount).toBe(1)
  })

  it('is deterministic for the same base blueprint and lod level', () => {
    const base = buildTreeBlueprint(OAK, 77)
    const first = buildTreeLodVariant(base, 'far')
    const second = buildTreeLodVariant(base, 'far')

    expect(first).toEqual(second)
  })
})
