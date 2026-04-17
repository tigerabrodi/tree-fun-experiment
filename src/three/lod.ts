import * as THREE from 'three/webgpu'
import type { TreeLodLevel } from '@/engine/lod'

export interface ChunkLodTarget {
  bounds: THREE.Box3
  cellSize: number
  lodLevel: TreeLodLevel
  visible: boolean
}

export interface ChunkLodSummary {
  nearChunkCount: number
  midChunkCount: number
  farChunkCount: number
}

function distanceToBox(point: THREE.Vector3, box: THREE.Box3): number {
  const clamped = point.clone().clamp(box.min, box.max)
  return clamped.distanceTo(point)
}

export function getChunkLodLevel(
  distance: number,
  cellSize: number
): TreeLodLevel {
  const nearDistance = Math.max(20, cellSize * 1.6)
  const midDistance = Math.max(52, cellSize * 4.2)

  if (distance <= nearDistance) {
    return 'near'
  }

  if (distance <= midDistance) {
    return 'mid'
  }

  return 'far'
}

export function applyChunkLod(
  camera: THREE.PerspectiveCamera,
  chunks: Array<ChunkLodTarget>
): ChunkLodSummary {
  const summary: ChunkLodSummary = {
    nearChunkCount: 0,
    midChunkCount: 0,
    farChunkCount: 0,
  }

  for (const chunk of chunks) {
    if (!chunk.visible) {
      continue
    }

    const distance = distanceToBox(camera.position, chunk.bounds)
    const lodLevel = getChunkLodLevel(distance, chunk.cellSize)
    chunk.lodLevel = lodLevel

    switch (lodLevel) {
      case 'near':
        summary.nearChunkCount += 1
        break
      case 'mid':
        summary.midChunkCount += 1
        break
      case 'far':
        summary.farChunkCount += 1
        break
    }
  }

  return summary
}
