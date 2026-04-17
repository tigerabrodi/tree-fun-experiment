import * as THREE from 'three/webgpu'
import { describe, expect, it } from 'vitest'
import { directionDegreesToVector, packLeafWindData } from './wind'

describe('directionDegreesToVector', () => {
  it('converts degrees into a normalized horizontal vector', () => {
    const direction = directionDegreesToVector(90)
    expect(direction.length()).toBeCloseTo(1, 5)
    expect(direction.x).toBeCloseTo(0, 5)
    expect(direction.z).toBeCloseTo(1, 5)
  })
})

describe('packLeafWindData', () => {
  it('packs leaf positions and higher sway for higher leaves', () => {
    const lowLeaf = new THREE.Matrix4().makeTranslation(1, 2, 3)
    const highLeaf = new THREE.Matrix4().makeTranslation(-4, 10, 6)

    const packed = packLeafWindData([lowLeaf, highLeaf])

    expect(packed).toHaveLength(8)
    expect(packed[0]).toBeCloseTo(1, 5)
    expect(packed[1]).toBeCloseTo(2, 5)
    expect(packed[2]).toBeCloseTo(3, 5)
    expect(packed[4]).toBeCloseTo(-4, 5)
    expect(packed[5]).toBeCloseTo(10, 5)
    expect(packed[6]).toBeCloseTo(6, 5)
    expect(packed[3]).toBeLessThan(packed[7])
    expect(packed[3]).toBeGreaterThanOrEqual(0.18)
    expect(packed[7]).toBeLessThanOrEqual(1)
  })
})
