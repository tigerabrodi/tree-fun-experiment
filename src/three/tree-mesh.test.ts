import { describe, expect, it } from 'vitest'
import { buildTrunkGeometry, buildTrunkWindProfiles } from './tree-mesh'

describe('buildTrunkWindProfiles', () => {
  it('keeps the trunk base stiff and the outer wood more flexible', () => {
    const segments = [
      {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 0, y: 2.4, z: 0 },
        startRadius: 0.9,
        endRadius: 0.7,
        depth: 0,
      },
      {
        start: { x: 0, y: 2.4, z: 0 },
        end: { x: 1.6, y: 4.1, z: 0.3 },
        startRadius: 0.22,
        endRadius: 0.08,
        depth: 3,
      },
    ]

    const profiles = buildTrunkWindProfiles(segments)

    expect(profiles).toHaveLength(2)
    expect(profiles[0]!.baseWeight).toBeCloseTo(0, 5)
    expect(profiles[0]!.tipWeight).toBeLessThan(profiles[1]!.tipWeight)
    expect(profiles[1]!.baseWeight).toBeGreaterThan(profiles[0]!.baseWeight)
    expect(profiles[1]!.phase).not.toBeCloseTo(profiles[0]!.phase, 5)
  })
})

describe('buildTrunkGeometry', () => {
  it('stores wind attributes on the merged bark geometry', () => {
    const geometry = buildTrunkGeometry([
      {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 0, y: 2.4, z: 0 },
        startRadius: 0.9,
        endRadius: 0.7,
        depth: 0,
      },
      {
        start: { x: 0, y: 2.4, z: 0 },
        end: { x: 1.6, y: 4.1, z: 0.3 },
        startRadius: 0.22,
        endRadius: 0.08,
        depth: 3,
      },
    ])

    const weightAttr = geometry.getAttribute('windWeight')
    const phaseAttr = geometry.getAttribute('windPhase')
    const weights = Array.from(weightAttr.array as Iterable<number>)

    expect(weightAttr).toBeTruthy()
    expect(phaseAttr).toBeTruthy()
    expect(Math.min(...weights)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...weights)).toBeLessThanOrEqual(1)
    expect(Math.max(...weights)).toBeGreaterThan(0.8)
  })
})
