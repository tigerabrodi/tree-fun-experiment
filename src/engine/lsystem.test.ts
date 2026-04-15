import { describe, expect, it } from 'vitest'
import {
  applyRules,
  generateLString,
  interpretLString,
} from './lsystem'
import { OAK, PINE, BIRCH } from './species'
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
    const rules: Array<LSystemRule> = [
      { predecessor: 'F', successor: 'FF' },
    ]
    expect(applyRules('F+F', rules)).toBe('FF+FF')
    expect(applyRules('[F]', rules)).toBe('[FF]')
  })

  it('handles empty input', () => {
    const rules: Array<LSystemRule> = [
      { predecessor: 'F', successor: 'FF' },
    ]
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
    expect(segments[0]!.start.x).toBeCloseTo(0)
    expect(segments[0]!.start.y).toBeCloseTo(0)
    expect(segments[0]!.start.z).toBeCloseTo(0)
  })

  it('F moves upward by default', () => {
    const config = {
      ...OAK,
      lengthScale: 1.0,
      lengthDecay: 1.0,
      angleVariance: 0,
    }
    const { segments } = interpretLString('F', config, 42)
    const seg = segments[0]!
    expect(seg.end.y).toBeGreaterThan(seg.start.y)
    expect(seg.end.x).toBeCloseTo(0, 5)
    expect(seg.end.z).toBeCloseTo(0, 5)
  })

  it('segments connect end to start', () => {
    const config = {
      ...OAK,
      angleVariance: 0,
      lengthDecay: 1.0,
    }
    const { segments } = interpretLString('FF', config, 42)
    expect(segments[0]!.end.x).toBeCloseTo(segments[1]!.start.x, 5)
    expect(segments[0]!.end.y).toBeCloseTo(segments[1]!.start.y, 5)
    expect(segments[0]!.end.z).toBeCloseTo(segments[1]!.start.z, 5)
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
    expect(segments[2]!.start.x).toBeCloseTo(segments[0]!.end.x, 5)
    expect(segments[2]!.start.y).toBeCloseTo(segments[0]!.end.y, 5)
    expect(segments[2]!.start.z).toBeCloseTo(segments[0]!.end.z, 5)
  })

  it('produces leaf points at ] characters', () => {
    const config = { ...OAK, angleVariance: 0 }
    const { leaves } = interpretLString('F[F][F]', config, 42)
    expect(leaves).toHaveLength(2)
  })

  it('depth increases inside brackets', () => {
    const config = { ...OAK, angleVariance: 0 }
    const { segments } = interpretLString('F[F[F]]', config, 42)
    expect(segments[0]!.depth).toBe(0) // outer F
    expect(segments[1]!.depth).toBe(1) // first [
    expect(segments[2]!.depth).toBe(2) // second [
  })

  it('seed produces deterministic output', () => {
    const config = { ...OAK }
    const lstring = generateLString(config)
    const result1 = interpretLString(lstring, config, 12345)
    const result2 = interpretLString(lstring, config, 12345)
    expect(result1.segments.length).toBe(result2.segments.length)
    expect(result1.segments[0]!.end.x).toBeCloseTo(
      result2.segments[0]!.end.x,
      10
    )
  })

  it('handles full species presets without crashing', () => {
    for (const species of [OAK, PINE, BIRCH]) {
      const lstring = generateLString(species)
      const { segments, leaves } = interpretLString(lstring, species, 42)
      expect(segments.length).toBeGreaterThan(0)
      expect(leaves.length).toBeGreaterThan(0)
    }
  })
})
