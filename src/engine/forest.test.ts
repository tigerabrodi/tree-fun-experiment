import { describe, expect, it } from 'vitest'
import { buildForestLayout } from './forest'

describe('buildForestLayout', () => {
  it('returns a single centered tree when count is one', () => {
    const layout = buildForestLayout({ count: 1, radius: 12, seed: 42 })
    expect(layout).toHaveLength(1)
    expect(layout[0]!.position.x).toBeCloseTo(0, 5)
    expect(layout[0]!.position.z).toBeCloseTo(0, 5)
    expect(layout[0]!.scale).toBeCloseTo(1, 5)
  })

  it('keeps every generated tree inside the requested radius', () => {
    const layout = buildForestLayout({ count: 16, radius: 20, seed: 42 })
    expect(layout).toHaveLength(16)
    for (const item of layout) {
      const distance = Math.hypot(item.position.x, item.position.z)
      expect(distance).toBeLessThanOrEqual(20)
    }
  })

  it('clusters multi tree forests inside a tighter inner grove', () => {
    const layout = buildForestLayout({ count: 16, radius: 20, seed: 42 })
    const furthest = Math.max(
      ...layout.map((item) => Math.hypot(item.position.x, item.position.z))
    )
    expect(furthest).toBeLessThanOrEqual(16.5)
  })

  it('is deterministic for the same seed', () => {
    const first = buildForestLayout({ count: 9, radius: 14, seed: 1234 })
    const second = buildForestLayout({ count: 9, radius: 14, seed: 1234 })
    expect(first).toEqual(second)
  })
})
