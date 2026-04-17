import type { Vec3 } from './lsystem'
import type { ForestInstance, ForestSettings } from './forest'

export interface ForestChunkBounds {
  min: Vec3
  max: Vec3
}

export interface ForestChunk {
  id: string
  gridX: number
  gridZ: number
  center: Vec3
  cellSize: number
  bounds: ForestChunkBounds
  instances: Array<ForestInstance>
}

export interface ForestChunkPlan {
  cellSize: number
  chunks: Array<ForestChunk>
}

export function getForestChunkCellSize(settings: ForestSettings): number {
  if (settings.mode !== 'giant') {
    return Math.max(1, settings.radius * 2)
  }

  return Math.max(12, Math.min(20, settings.radius / 3))
}

function toGridCoord(value: number, cellSize: number): number {
  return Math.floor((value + cellSize * 0.5) / cellSize)
}

export function buildForestChunks(
  layout: Array<ForestInstance>,
  settings: ForestSettings
): ForestChunkPlan {
  const cellSize = getForestChunkCellSize(settings)
  const chunkMap = new Map<string, ForestChunk>()

  for (const instance of layout) {
    const gridX =
      settings.mode === 'giant' ? toGridCoord(instance.position.x, cellSize) : 0
    const gridZ =
      settings.mode === 'giant' ? toGridCoord(instance.position.z, cellSize) : 0
    const id = `${gridX}:${gridZ}`

    let chunk = chunkMap.get(id)

    if (!chunk) {
      const centerX = gridX * cellSize
      const centerZ = gridZ * cellSize
      const half = cellSize * 0.5

      chunk = {
        id,
        gridX,
        gridZ,
        center: { x: centerX, y: 0, z: centerZ },
        cellSize,
        bounds: {
          min: { x: centerX - half, y: 0, z: centerZ - half },
          max: { x: centerX + half, y: 0, z: centerZ + half },
        },
        instances: [],
      }
      chunkMap.set(id, chunk)
    }

    chunk.instances.push(instance)
  }

  const chunks = Array.from(chunkMap.values()).sort((a, b) => {
    if (a.gridZ === b.gridZ) return a.gridX - b.gridX
    return a.gridZ - b.gridZ
  })

  return {
    cellSize,
    chunks,
  }
}
