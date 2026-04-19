import { describe, expect, it } from 'vitest'
import { applyRules, generateLString, interpretLString } from './lsystem'
import { OAK, PINE, BIRCH, MAPLE, SAKURA } from './species'
import type { LSystemRule } from './species'

describe('applyRules', () => {
  it('replaces characters matching rules', () => {
    const rules: Array<LSystemRule> = [
      { predecessor: 'A', successor: 'AB' },
      { predecessor: 'B', successor: 'A' },
    ]
    expect(applyRules('A', rules)).toBe('AB')
    expect(applyRules('B', rules)).toBe('A')
    expect(applyRules('AB', rules)).toBe('ABA')
  })

  it('keeps characters with no matching rule', () => {
    const rules: Array<LSystemRule> = [{ predecessor: 'F', successor: 'FF' }]
    expect(applyRules('F+F', rules)).toBe('FF+FF')
    expect(applyRules('[F]', rules)).toBe('[FF]')
  })

  it('handles empty input', () => {
    const rules: Array<LSystemRule> = [{ predecessor: 'F', successor: 'FF' }]
    expect(applyRules('', rules)).toBe('')
  })
})

describe('generateLString', () => {
  it('iterates the correct number of times', () => {
    // Simple doubling rule: F -> FF
    const config = {
      ...OAK,
      axiom: 'F',
      rules: [{ predecessor: 'F', successor: 'FF' }],
      iterations: 3,
    }
    // F -> FF -> FFFF -> FFFFFFFF
    expect(generateLString(config)).toBe('FFFFFFFF')
  })

  it('generates non-empty strings for all species presets', () => {
    for (const species of [OAK, PINE, BIRCH]) {
      const result = generateLString(species)
      expect(result.length).toBeGreaterThan(0)
    }
  })

  it('produces longer strings with more iterations', () => {
    const config2 = { ...OAK, iterations: 2 }
    const config4 = { ...OAK, iterations: 4 }
    expect(generateLString(config4).length).toBeGreaterThan(
      generateLString(config2).length
    )
  })
})

describe('interpretLString', () => {
  it('produces segments for F commands', () => {
    const config = { ...OAK, angle: 25, angleVariance: 0 }
    const { segments } = interpretLString('FFF', config, 42)
    expect(segments).toHaveLength(3)
  })

  it('first segment starts at origin', () => {
    const config = { ...OAK, angleVariance: 0 }
    const { segments } = interpretLString('F', config, 42)
    expect(segments[0].start.x).toBeCloseTo(0)
    expect(segments[0].start.y).toBeCloseTo(0)
    expect(segments[0].start.z).toBeCloseTo(0)
  })

  it('F moves upward by default', () => {
    const config = {
      ...OAK,
      lengthScale: 1.0,
      lengthDecay: 1.0,
      angleVariance: 0,
    }
    const { segments } = interpretLString('F', config, 42)
    const seg = segments[0]
    expect(seg.end.y).toBeGreaterThan(seg.start.y)
    expect(seg.end.x).toBeCloseTo(0, 5)
    expect(seg.end.z).toBeCloseTo(0, 5)
  })

  it('S draws a shorter continuation step than F', () => {
    const config = {
      ...OAK,
      lengthScale: 1.0,
      lengthDecay: 1.0,
      angleVariance: 0,
    }
    const shortStep = interpretLString('S', config, 42).segments[0]
    const fullStep = interpretLString('F', config, 42).segments[0]
    const shortLength = shortStep.end.y - shortStep.start.y
    const fullLength = fullStep.end.y - fullStep.start.y

    expect(shortLength).toBeLessThan(fullLength)
    expect(shortLength).toBeCloseTo(0.55, 5)
  })

  it('supports deterministic jitter on short continuation steps', () => {
    const config = {
      ...PINE,
      lengthScale: 1.0,
      lengthDecay: 1.0,
      angleVariance: 0,
      shortStepJitter: 0.3,
    }
    const { segments } = interpretLString('SSS', config, 42)
    const lengths = segments.map((segment) => segment.end.y - segment.start.y)
    const uniqueLengths = new Set(lengths.map((length) => length.toFixed(4)))

    expect(uniqueLengths.size).toBeGreaterThan(1)
    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(0.55 * 0.7)
    expect(Math.max(...lengths)).toBeLessThanOrEqual(0.55 * 1.3)
  })

  it('segments connect end to start', () => {
    const config = {
      ...OAK,
      angleVariance: 0,
      lengthDecay: 1.0,
    }
    const { segments } = interpretLString('FF', config, 42)
    expect(segments[0].end.x).toBeCloseTo(segments[1].start.x, 5)
    expect(segments[0].end.y).toBeCloseTo(segments[1].start.y, 5)
    expect(segments[0].end.z).toBeCloseTo(segments[1].start.z, 5)
  })

  it('turns around on pipe commands', () => {
    const config = {
      ...OAK,
      angleVariance: 0,
      lengthScale: 1.0,
      lengthDecay: 1.0,
    }
    const { segments } = interpretLString('F|F', config, 42)
    expect(segments).toHaveLength(2)
    expect(segments[1].start.y).toBeCloseTo(1, 5)
    expect(segments[1].end.y).toBeCloseTo(0, 5)
  })

  it('tapers radius across consecutive forward segments', () => {
    const config = {
      ...OAK,
      angleVariance: 0,
      lengthDecay: 1.0,
      segmentTaper: 0.9,
    }
    const { segments } = interpretLString('FF', config, 42)
    expect(segments).toHaveLength(2)
    expect(segments[0].endRadius).toBeCloseTo(segments[1].startRadius, 5)
    expect(segments[1].startRadius).toBeLessThan(segments[0].startRadius)
  })

  it('branching [ ] restores position', () => {
    const config = {
      ...OAK,
      angleVariance: 0,
      lengthScale: 1.0,
      lengthDecay: 1.0,
    }
    // F then branch [F] then F. The second F after ] should start where the first F ended.
    const { segments } = interpretLString('F[F]F', config, 42)
    expect(segments).toHaveLength(3)
    // segment 2 (after ]) should start at same point as segment 0's end
    expect(segments[2].start.x).toBeCloseTo(segments[0].end.x, 5)
    expect(segments[2].start.y).toBeCloseTo(segments[0].end.y, 5)
    expect(segments[2].start.z).toBeCloseTo(segments[0].end.z, 5)
  })

  it('produces leaf points at ] characters', () => {
    const config = { ...OAK, angleVariance: 0, leafDensity: 1, leafDepthMin: 1 }
    const { leaves } = interpretLString('F[F][F]', config, 42)
    expect(leaves).toHaveLength(2)
  })

  it('can turn leaf generation off with density', () => {
    const config = { ...OAK, angleVariance: 0, leafDensity: 0, leafDepthMin: 1 }
    const { leaves } = interpretLString('F[F][F]', config, 42)
    expect(leaves).toHaveLength(0)
  })

  it('can keep leaves off shallow scaffold branches', () => {
    const config = { ...OAK, angleVariance: 0, leafDensity: 1, leafDepthMin: 2 }
    const { leaves } = interpretLString('F[F[F]]', config, 42)
    expect(leaves).toHaveLength(1)
  })

  it('keeps a terminal crown at unresolved leader tips', () => {
    const config = { ...OAK, angleVariance: 0, leafDensity: 1, leafDepthMin: 2 }
    const { leaves } = interpretLString('FFT', config, 42)
    expect(leaves.length).toBeGreaterThanOrEqual(4)
  })

  it('depth increases inside brackets', () => {
    const config = { ...OAK, angleVariance: 0 }
    const { segments } = interpretLString('F[F[F]]', config, 42)
    expect(segments[0].depth).toBe(0) // outer F
    expect(segments[1].depth).toBe(1) // first [
    expect(segments[2].depth).toBe(2) // second [
  })

  it('seed produces deterministic output', () => {
    const config = { ...OAK }
    const lstring = generateLString(config)
    const result1 = interpretLString(lstring, config, 12345)
    const result2 = interpretLString(lstring, config, 12345)
    expect(result1.segments.length).toBe(result2.segments.length)
    expect(result1.segments[0].end.x).toBeCloseTo(result2.segments[0].end.x, 10)
  })

  it('handles full species presets without crashing', () => {
    for (const species of [OAK, PINE, BIRCH, MAPLE, SAKURA]) {
      const lstring = generateLString(species)
      const { segments, leaves } = interpretLString(lstring, species, 42)
      expect(segments.length).toBeGreaterThan(0)
      expect(leaves.length).toBeGreaterThan(0)
    }
  })

  it('broadleaf presets generate visible side branches', () => {
    for (const species of [OAK, BIRCH, MAPLE, SAKURA]) {
      const lstring = generateLString(species)
      const { segments } = interpretLString(lstring, species, 42)

      let maxRadius = 0
      let branchCount = 0

      for (const seg of segments) {
        for (const point of [seg.start, seg.end]) {
          maxRadius = Math.max(maxRadius, Math.hypot(point.x, point.z))
        }

        const horizontalTravel = Math.hypot(
          seg.end.x - seg.start.x,
          seg.end.z - seg.start.z
        )
        if (horizontalTravel > 0.2) {
          branchCount++
        }
      }

      expect(maxRadius).toBeGreaterThan(1.5)
      expect(branchCount).toBeGreaterThan(30)
    }
  })

  it('broadleaf presets spread branch directions around the trunk', () => {
    const expectedMinBins: Record<string, number> = {
      oak: 5,
      birch: 4,
      maple: 5,
      sakura: 5,
    }

    for (const species of [OAK, BIRCH, MAPLE, SAKURA]) {
      const lstring = generateLString(species)
      const { segments } = interpretLString(lstring, species, 42)
      const bins = new Array(8).fill(0)

      for (const seg of segments) {
        const dx = seg.end.x - seg.start.x
        const dz = seg.end.z - seg.start.z
        const horizontalTravel = Math.hypot(dx, dz)

        if (horizontalTravel <= 0.15) continue

        const angle = (Math.atan2(dz, dx) + Math.PI * 2) % (Math.PI * 2)
        const bin = Math.floor((angle / (Math.PI * 2)) * bins.length)
        bins[bin]++
      }

      const occupiedBins = bins.filter((count) => count > 0).length
      expect(occupiedBins).toBeGreaterThanOrEqual(expectedMinBins[species.name])
    }
  })

  it('broadleaf presets avoid large mirrored branch fans from one node', () => {
    for (const species of [OAK, BIRCH, MAPLE, SAKURA]) {
      const lstring = generateLString(species)
      const { segments } = interpretLString(lstring, species, 42)
      const branchStarts = new Map<string, number>()

      for (const seg of segments) {
        const horizontalTravel = Math.hypot(
          seg.end.x - seg.start.x,
          seg.end.z - seg.start.z
        )

        if (horizontalTravel <= 0.18) continue

        const key = [
          seg.start.x.toFixed(2),
          seg.start.y.toFixed(2),
          seg.start.z.toFixed(2),
        ].join(',')

        branchStarts.set(key, (branchStarts.get(key) ?? 0) + 1)
      }

      const maxFan = Math.max(...branchStarts.values())
      expect(maxFan).toBeLessThanOrEqual(2)
    }
  })

  it('maple and sakura keep their crown centered in top view', () => {
    for (const species of [MAPLE, SAKURA]) {
      const lstring = generateLString(species)
      const { leaves } = interpretLString(lstring, species, 42)
      const bins = new Array(8).fill(0)
      let centerX = 0
      let centerZ = 0
      let maxRadius = 0

      for (const leaf of leaves) {
        centerX += leaf.position.x
        centerZ += leaf.position.z

        const radius = Math.hypot(leaf.position.x, leaf.position.z)
        maxRadius = Math.max(maxRadius, radius)

        const angle =
          (Math.atan2(leaf.position.z, leaf.position.x) + Math.PI * 2) %
          (Math.PI * 2)
        const bin = Math.floor((angle / (Math.PI * 2)) * bins.length)
        bins[bin]++
      }

      centerX /= leaves.length
      centerZ /= leaves.length

      const centroidRadius = Math.hypot(centerX, centerZ)
      const occupiedBins = bins.filter((count) => count > 0).length

      expect(centroidRadius / Math.max(0.001, maxRadius)).toBeLessThanOrEqual(
        0.15
      )
      expect(occupiedBins).toBeGreaterThanOrEqual(7)
    }
  })

  it('oak keeps its crown centered in top view', () => {
    const lstring = generateLString(OAK)
    const { leaves } = interpretLString(lstring, OAK, 42)
    const bins = new Array(8).fill(0)
    let centerX = 0
    let centerZ = 0
    let maxRadius = 0

    for (const leaf of leaves) {
      centerX += leaf.position.x
      centerZ += leaf.position.z

      const radius = Math.hypot(leaf.position.x, leaf.position.z)
      maxRadius = Math.max(maxRadius, radius)

      const angle =
        (Math.atan2(leaf.position.z, leaf.position.x) + Math.PI * 2) %
        (Math.PI * 2)
      const bin = Math.floor((angle / (Math.PI * 2)) * bins.length)
      bins[bin]++
    }

    centerX /= leaves.length
    centerZ /= leaves.length

    const centroidRadius = Math.hypot(centerX, centerZ)
    const occupiedBins = bins.filter((count) => count > 0).length

    expect(centroidRadius / Math.max(0.001, maxRadius)).toBeLessThanOrEqual(
      0.15
    )
    expect(occupiedBins).toBeGreaterThanOrEqual(7)
  })

  it('birch keeps some gentle downward outer branches', () => {
    const lstring = generateLString(BIRCH)
    const { segments } = interpretLString(lstring, BIRCH, 42)
    const downwardOuterSegments = segments.filter((segment) => {
      const dy = segment.end.y - segment.start.y
      return segment.depth > 1 && dy < -0.015
    })

    expect(downwardOuterSegments.length).toBeGreaterThanOrEqual(12)
  })

  it('pine preset builds layered foliage tiers instead of one tip clump', () => {
    const lstring = generateLString(PINE)
    const { segments, leaves } = interpretLString(lstring, PINE, 42)
    const bins = new Array(4).fill(0)
    let minY = Number.POSITIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    let horizontalTierSegments = 0

    for (const leaf of leaves) {
      minY = Math.min(minY, leaf.position.y)
      maxY = Math.max(maxY, leaf.position.y)
    }

    const heightRange = Math.max(0.001, maxY - minY)

    for (const leaf of leaves) {
      const t = (leaf.position.y - minY) / heightRange
      const bin = Math.min(bins.length - 1, Math.floor(t * bins.length))
      bins[bin]++
    }

    for (const seg of segments) {
      const dy = Math.abs(seg.end.y - seg.start.y)
      const horizontalTravel = Math.hypot(
        seg.end.x - seg.start.x,
        seg.end.z - seg.start.z
      )

      if (horizontalTravel > 0.22 && dy < horizontalTravel) {
        horizontalTierSegments++
      }
    }

    const occupiedBins = bins.filter((count) => count > 0).length

    expect(leaves.length).toBeGreaterThan(50)
    expect(horizontalTierSegments).toBeGreaterThan(40)
    expect(occupiedBins).toBeGreaterThanOrEqual(4)
  })

  it('pine preset varies leader spacing so tiers do not read like a perfect staircase', () => {
    const lstring = generateLString(PINE)
    const { segments } = interpretLString(lstring, PINE, 42)
    const leaderSteps = segments
      .filter((segment) => segment.depth === 0)
      .map((segment) => segment.end.y - segment.start.y)
      .filter((step) => step < PINE.lengthScale * 0.7)
      .slice(0, 12)
    const rounded = leaderSteps.map((step) => step.toFixed(3))

    expect(leaderSteps.length).toBeGreaterThanOrEqual(6)
    expect(new Set(rounded).size).toBeGreaterThanOrEqual(5)
  })

  it('pine preset keeps a conical canopy instead of a top heavy clump', () => {
    const lstring = generateLString(PINE)
    const { leaves } = interpretLString(lstring, PINE, 42)
    const bins = new Array(5).fill(0).map(() => ({
      maxRadius: 0,
      count: 0,
    }))
    let minY = Number.POSITIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    for (const leaf of leaves) {
      minY = Math.min(minY, leaf.position.y)
      maxY = Math.max(maxY, leaf.position.y)
    }

    const heightRange = Math.max(0.001, maxY - minY)

    for (const leaf of leaves) {
      const t = (leaf.position.y - minY) / heightRange
      const binIndex = Math.min(bins.length - 1, Math.floor(t * bins.length))
      const radius = Math.hypot(leaf.position.x, leaf.position.z)

      bins[binIndex].count++
      bins[binIndex].maxRadius = Math.max(bins[binIndex].maxRadius, radius)
    }

    const midRadius = Math.max(bins[1].maxRadius, bins[2].maxRadius, bins[3].maxRadius)
    const topRadius = bins[4].maxRadius

    expect(leaves.length).toBeGreaterThan(120)
    expect(bins[4].count).toBeGreaterThan(10)
    expect(topRadius).toBeLessThan(midRadius * 0.82)
  })

  it('pine preset keeps a rounded top view instead of a rigid x shape', () => {
    const lstring = generateLString(PINE)
    const { leaves } = interpretLString(lstring, PINE, 42)
    const bins: Array<number> = Array.from({ length: 12 }, () => 0)

    for (const leaf of leaves) {
      const radius = Math.hypot(leaf.position.x, leaf.position.z)
      if (radius < 0.12) continue

      const angle =
        (Math.atan2(leaf.position.z, leaf.position.x) + Math.PI * 2) %
        (Math.PI * 2)
      const bin = Math.floor((angle / (Math.PI * 2)) * bins.length)
      bins[bin]++
    }

    const occupiedBins = bins.filter((count) => count > 6).length
    const maxBin = Math.max(...bins)
    const nonZeroBins: Array<number> = bins.filter((count) => count > 0)
    const minNonZeroBin = Math.min(...nonZeroBins)

    expect(occupiedBins).toBeGreaterThanOrEqual(9)
    expect(maxBin).toBeLessThan(minNonZeroBin * 3.2)
  })
})
