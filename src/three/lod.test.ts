import { describe, expect, it } from 'vitest'
import * as THREE from 'three/webgpu'
import { applyChunkLod, getChunkLodLevel } from './lod'

function createCamera() {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
  camera.position.set(0, 10, 0)
  camera.lookAt(0, 10, -20)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
  return camera
}

describe('getChunkLodLevel', () => {
  it('returns near for close chunks and far for distant chunks', () => {
    expect(getChunkLodLevel(10, 16)).toBe('near')
    expect(getChunkLodLevel(36, 16)).toBe('mid')
    expect(getChunkLodLevel(90, 16)).toBe('far')
  })
})

describe('applyChunkLod', () => {
  it('assigns visible chunks to near mid and far lod buckets', () => {
    const camera = createCamera()
    const chunks = [
      {
        bounds: new THREE.Box3(
          new THREE.Vector3(-4, 0, -14),
          new THREE.Vector3(4, 12, -6)
        ),
        cellSize: 16,
        lodLevel: 'far' as const,
        visible: true,
      },
      {
        bounds: new THREE.Box3(
          new THREE.Vector3(-4, 0, -38),
          new THREE.Vector3(4, 12, -30)
        ),
        cellSize: 16,
        lodLevel: 'near' as const,
        visible: true,
      },
      {
        bounds: new THREE.Box3(
          new THREE.Vector3(-4, 0, -92),
          new THREE.Vector3(4, 12, -84)
        ),
        cellSize: 16,
        lodLevel: 'near' as const,
        visible: true,
      },
    ]

    const summary = applyChunkLod(camera, chunks)

    expect(summary.nearChunkCount).toBe(1)
    expect(summary.midChunkCount).toBe(1)
    expect(summary.farChunkCount).toBe(1)
    expect(chunks[0].lodLevel).toBe('near')
    expect(chunks[1].lodLevel).toBe('mid')
    expect(chunks[2].lodLevel).toBe('far')
  })
})
