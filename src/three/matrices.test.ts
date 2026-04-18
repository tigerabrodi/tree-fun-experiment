import * as THREE from 'three/webgpu'
import { describe, expect, it } from 'vitest'
import {
  buildLeafMatrices,
  createPackedLeafMatrices,
  createPackedTreeMatrices,
  createTreeMatrix,
  expandPackedLeafMatrices,
} from './matrices'

describe('createPackedTreeMatrices', () => {
  it('packs tree transforms in the same order as matrix compose', () => {
    const expected = createTreeMatrix({
      position: { x: 1.2, y: 0, z: -3.4 },
      rotationY: Math.PI / 3,
      scale: 1.8,
      seed: 11,
    }).elements
    const packed = createPackedTreeMatrices([
      {
        position: { x: 1.2, y: 0, z: -3.4 },
        rotationY: Math.PI / 3,
        scale: 1.8,
        seed: 11,
      },
    ])

    expect(packed).toHaveLength(expected.length)
    for (let i = 0; i < expected.length; i++) {
      expect(packed[i]).toBeCloseTo(expected[i], 5)
    }
  })
})

describe('expandPackedLeafMatrices', () => {
  it('matches the existing matrix expansion path', () => {
    const leaf = {
      position: { x: 1, y: 2, z: 3 },
      direction: { x: 0, y: 1, z: 0 },
      up: { x: 0, y: 0, z: 1 },
    }
    const config = {
      leafClusterCount: 4,
      leafClusterSpread: 0.25,
      leafClusterStyle: 'broad' as const,
    }
    const tree = {
      position: { x: 4, y: 0, z: -2 },
      rotationY: Math.PI / 4,
      scale: 1.3,
      seed: 99,
    }
    const treeMatrix = createTreeMatrix(tree)
    const expected = buildLeafMatrices([leaf], 42, config).map((matrix) =>
      treeMatrix.clone().multiply(matrix)
    )
    const packed = expandPackedLeafMatrices(
      createPackedTreeMatrices([tree]),
      createPackedLeafMatrices([leaf], 42, config)
    )
    const unpacked = new Array(packed.length / 16).fill(null).map((_, index) =>
      new THREE.Matrix4().fromArray(packed, index * 16)
    )

    expect(unpacked).toHaveLength(expected.length)
    for (let matrixIndex = 0; matrixIndex < expected.length; matrixIndex++) {
      for (let elementIndex = 0; elementIndex < 16; elementIndex++) {
        expect(unpacked[matrixIndex].elements[elementIndex]).toBeCloseTo(
          expected[matrixIndex].elements[elementIndex],
          5
        )
      }
    }
  })
})
