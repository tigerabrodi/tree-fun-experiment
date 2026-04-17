import * as THREE from 'three/webgpu'

export interface ChunkDebugBounds {
  id: string
  box: THREE.Box3
}

export function createChunkDebugOverlay(
  chunkBounds: Array<ChunkDebugBounds>
): THREE.Group {
  const overlay = new THREE.Group()
  const palette = [
    '#ff3b30',
    '#ff9500',
    '#ffd60a',
    '#34c759',
    '#00c7be',
    '#32ade6',
    '#0a84ff',
    '#5e5ce6',
    '#bf5af2',
    '#ff2d55',
  ]

  for (let index = 0; index < chunkBounds.length; index += 1) {
    const chunk = chunkBounds[index]
    const color = new THREE.Color(palette[index % palette.length])
    const size = chunk.box.getSize(new THREE.Vector3())
    const center = chunk.box.getCenter(new THREE.Vector3())
    const fill = new THREE.Mesh(
      new THREE.BoxGeometry(
        Math.max(size.x - 0.2, size.x * 0.96),
        Math.max(size.y - 0.2, size.y * 0.96),
        Math.max(size.z - 0.2, size.z * 0.96)
      ),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.07,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    )
    fill.position.copy(center)
    fill.renderOrder = 40
    overlay.add(fill)

    const helper = new THREE.Box3Helper(chunk.box.clone(), color)
    const material = helper.material as THREE.LineBasicMaterial

    material.depthTest = false
    material.depthWrite = false
    material.transparent = true
    material.opacity = 1
    material.toneMapped = false
    helper.renderOrder = 50
    helper.userData.chunkId = chunk.id
    overlay.add(helper)
  }

  return overlay
}
