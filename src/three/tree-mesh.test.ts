import * as THREE from 'three/webgpu'
import { describe, expect, it } from 'vitest'
import {
  buildLeafMatrices,
  collapseTrunkSegments,
  createLeafGeometry,
  buildTrunkGeometry,
  buildTrunkWindProfiles,
} from './tree-mesh'

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
    expect(profiles[0].baseWeight).toBeCloseTo(0, 5)
    expect(profiles[0].tipWeight).toBeLessThan(profiles[1].tipWeight)
    expect(profiles[1].baseWeight).toBeGreaterThan(profiles[0].baseWeight)
    expect(profiles[1].phase).not.toBeCloseTo(profiles[0].phase, 5)
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

  it('extends bark segments past their raw endpoints to hide joint seams', () => {
    const geometry = buildTrunkGeometry([
      {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 0, y: 2.4, z: 0 },
        startRadius: 0.9,
        endRadius: 0.7,
        depth: 0,
      },
    ])

    geometry.computeBoundingBox()

    expect(geometry.boundingBox).toBeTruthy()
    expect(geometry.boundingBox!.min.y).toBeLessThan(-0.15)
    expect(geometry.boundingBox!.max.y).toBeGreaterThan(2.55)
  })

  it('uses fewer vertices when lower radial segments are requested for lod', () => {
    const detailed = buildTrunkGeometry(
      [
        {
          start: { x: 0, y: 0, z: 0 },
          end: { x: 0, y: 2.4, z: 0 },
          startRadius: 0.9,
          endRadius: 0.7,
          depth: 0,
        },
      ],
      { radialSegments: 8 }
    )
    const simplified = buildTrunkGeometry(
      [
        {
          start: { x: 0, y: 0, z: 0 },
          end: { x: 0, y: 2.4, z: 0 },
          startRadius: 0.9,
          endRadius: 0.7,
          depth: 0,
        },
      ],
      { radialSegments: 4 }
    )

    expect(
      simplified.getAttribute('position').count
    ).toBeLessThan(detailed.getAttribute('position').count)
  })
})

describe('collapseTrunkSegments', () => {
  it('merges straight bark runs into one continuous render segment', () => {
    const segments = collapseTrunkSegments([
      {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 0, y: 1, z: 0 },
        startRadius: 0.9,
        endRadius: 0.8,
        depth: 0,
      },
      {
        start: { x: 0, y: 1, z: 0 },
        end: { x: 0, y: 2, z: 0 },
        startRadius: 0.8,
        endRadius: 0.7,
        depth: 0,
      },
      {
        start: { x: 0, y: 2, z: 0 },
        end: { x: 0, y: 3, z: 0 },
        startRadius: 0.7,
        endRadius: 0.6,
        depth: 0,
      },
    ])

    expect(segments).toHaveLength(1)
    expect(segments[0].start.y).toBe(0)
    expect(segments[0].end.y).toBe(3)
    expect(segments[0].startRadius).toBe(0.9)
    expect(segments[0].endRadius).toBe(0.6)
  })

  it('keeps side branches split while merging the straight trunk through a fork', () => {
    const segments = collapseTrunkSegments([
      {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 0, y: 1, z: 0 },
        startRadius: 0.9,
        endRadius: 0.8,
        depth: 0,
      },
      {
        start: { x: 0, y: 1, z: 0 },
        end: { x: 0, y: 2, z: 0 },
        startRadius: 0.8,
        endRadius: 0.7,
        depth: 0,
      },
      {
        start: { x: 0, y: 1, z: 0 },
        end: { x: 1, y: 2, z: 0 },
        startRadius: 0.8,
        endRadius: 0.3,
        depth: 1,
      },
    ])

    expect(segments).toHaveLength(2)
    expect(segments.find((segment) => segment.depth === 0)?.start.y).toBe(0)
    expect(segments.find((segment) => segment.depth === 0)?.end.y).toBe(2)
    expect(segments.find((segment) => segment.depth === 1)?.end.x).toBe(1)
  })
})

describe('buildLeafMatrices', () => {
  it('uses a single card for single leaf textures and a cross for clustered textures', () => {
    const single = createLeafGeometry(1, 'single')
    const cluster = createLeafGeometry(1, 'cluster')

    expect(single.getAttribute('position').count).toBeLessThan(
      cluster.getAttribute('position').count
    )
  })

  it('expands each leaf tip into a small deterministic cluster', () => {
    const matrices = buildLeafMatrices(
      [
        {
          position: { x: 1, y: 2, z: 3 },
          direction: { x: 0, y: 1, z: 0 },
          up: { x: 0, y: 0, z: 1 },
        },
      ],
      42,
      {
        leafClusterCount: 4,
        leafClusterSpread: 0.25,
        leafClusterStyle: 'broad',
      }
    )

    const firstPosition = new THREE.Vector3().setFromMatrixPosition(matrices[0])
    const secondPosition = new THREE.Vector3().setFromMatrixPosition(
      matrices[1]
    )

    expect(matrices).toHaveLength(4)
    expect(firstPosition.x).toBeCloseTo(1, 5)
    expect(firstPosition.y).toBeCloseTo(2, 5)
    expect(firstPosition.z).toBeCloseTo(3, 5)
    expect(secondPosition.distanceTo(firstPosition)).toBeGreaterThan(0.01)

    const repeatMatrices = buildLeafMatrices(
      [
        {
          position: { x: 1, y: 2, z: 3 },
          direction: { x: 0, y: 1, z: 0 },
          up: { x: 0, y: 0, z: 1 },
        },
      ],
      42,
      {
        leafClusterCount: 4,
        leafClusterSpread: 0.25,
        leafClusterStyle: 'broad',
      }
    )
    const repeatSecondPosition = new THREE.Vector3().setFromMatrixPosition(
      repeatMatrices[1]
    )

    expect(repeatSecondPosition.x).toBeCloseTo(secondPosition.x, 5)
    expect(repeatSecondPosition.y).toBeCloseTo(secondPosition.y, 5)
    expect(repeatSecondPosition.z).toBeCloseTo(secondPosition.z, 5)
  })

  it('uses wider side spread for broadleaf clusters than pine tufts', () => {
    const broad = buildLeafMatrices(
      [
        {
          position: { x: 0, y: 0, z: 0 },
          direction: { x: 0, y: 1, z: 0 },
          up: { x: 0, y: 0, z: 1 },
        },
      ],
      42,
      {
        leafClusterCount: 5,
        leafClusterSpread: 0.3,
        leafClusterStyle: 'broad',
      }
    )
    const tuft = buildLeafMatrices(
      [
        {
          position: { x: 0, y: 0, z: 0 },
          direction: { x: 0, y: 1, z: 0 },
          up: { x: 0, y: 0, z: 1 },
        },
      ],
      42,
      {
        leafClusterCount: 5,
        leafClusterSpread: 0.3,
        leafClusterStyle: 'tuft',
      }
    )

    const broadMaxX = Math.max(
      ...broad.map((matrix) =>
        Math.abs(new THREE.Vector3().setFromMatrixPosition(matrix).x)
      )
    )
    const tuftMaxX = Math.max(
      ...tuft.map((matrix) =>
        Math.abs(new THREE.Vector3().setFromMatrixPosition(matrix).x)
      )
    )

    expect(broadMaxX).toBeGreaterThan(tuftMaxX)
  })
})
