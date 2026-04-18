import { describe, expect, it } from 'vitest'
import { buildTrunkGeometry } from './tree-mesh'
import {
  createPackedTrunkGeometryData,
  createTrunkGeometryFromPackedData,
} from './trunk-geometry-data'

const SEGMENTS = [
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

describe('packed trunk geometry', () => {
  it('reconstructs the same attribute counts as the direct geometry path', () => {
    const direct = buildTrunkGeometry(SEGMENTS, {
      radialSegments: 6,
    })
    const packed = createPackedTrunkGeometryData(SEGMENTS, {
      radialSegments: 6,
    })
    const rebuilt = createTrunkGeometryFromPackedData(packed)

    expect(rebuilt.getAttribute('position').count).toBe(
      direct.getAttribute('position').count
    )
    expect(rebuilt.getAttribute('normal').count).toBe(
      direct.getAttribute('normal').count
    )
    expect(rebuilt.getAttribute('uv').count).toBe(
      direct.getAttribute('uv').count
    )
    expect(rebuilt.getAttribute('windWeight').count).toBe(
      direct.getAttribute('windWeight').count
    )
    expect(rebuilt.getAttribute('windPhase').count).toBe(
      direct.getAttribute('windPhase').count
    )
    expect(rebuilt.getIndex()?.count).toBe(direct.getIndex()?.count)
  })
})
