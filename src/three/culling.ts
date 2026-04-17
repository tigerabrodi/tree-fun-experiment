import * as THREE from 'three/webgpu'

export interface ChunkCullingTarget {
  bounds: THREE.Box3
  visible: boolean
}

export interface ChunkCullingResult {
  visibleChunkCount: number
  culledChunkCount: number
}

export function buildCameraFrustum(
  camera: THREE.PerspectiveCamera
): THREE.Frustum {
  camera.updateMatrixWorld()

  return new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    )
  )
}

export function applyChunkFrustumCulling(
  camera: THREE.PerspectiveCamera,
  chunks: Array<ChunkCullingTarget>
): ChunkCullingResult {
  const frustum = buildCameraFrustum(camera)
  let visibleChunkCount = 0

  for (const chunk of chunks) {
    const isVisible = frustum.intersectsBox(chunk.bounds)
    chunk.visible = isVisible

    if (isVisible) {
      visibleChunkCount += 1
    }
  }

  return {
    visibleChunkCount,
    culledChunkCount: chunks.length - visibleChunkCount,
  }
}
