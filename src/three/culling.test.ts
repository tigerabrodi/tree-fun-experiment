import { describe, expect, it } from 'vitest'
import * as THREE from 'three/webgpu'
import { applyChunkFrustumCulling, buildCameraFrustum } from './culling'

function createCamera() {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.set(0, 6, 18)
  camera.lookAt(0, 6, 0)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
  return camera
}

describe('buildCameraFrustum', () => {
  it('builds a frustum that can see a box in front of the camera', () => {
    const camera = createCamera()
    const frustum = buildCameraFrustum(camera)
    const visibleBox = new THREE.Box3(
      new THREE.Vector3(-2, 0, -2),
      new THREE.Vector3(2, 12, 2)
    )

    expect(frustum.intersectsBox(visibleBox)).toBe(true)
  })
})

describe('applyChunkFrustumCulling', () => {
  it('marks offscreen chunks invisible and keeps visible chunks alive', () => {
    const camera = createCamera()
    const chunks = [
      {
        bounds: new THREE.Box3(
          new THREE.Vector3(-2, 0, -2),
          new THREE.Vector3(2, 12, 2)
        ),
        visible: true,
      },
      {
        bounds: new THREE.Box3(
          new THREE.Vector3(80, 0, -2),
          new THREE.Vector3(92, 12, 10)
        ),
        visible: true,
      },
    ]

    const result = applyChunkFrustumCulling(camera, chunks)

    expect(result.visibleChunkCount).toBe(1)
    expect(result.culledChunkCount).toBe(1)
    expect(chunks[0].visible).toBe(true)
    expect(chunks[1].visible).toBe(false)
  })
})
