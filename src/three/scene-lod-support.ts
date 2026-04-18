import { TREE_LOD_LEVELS, type TreeLodLevel } from '@/engine/lod'
import type { PlannedChunkLodStateMap } from '@/engine/rebuild-plan'
import * as THREE from 'three/webgpu'
import type { ChunkLodRenderState } from './forest-render'

export interface SceneLodChunkState {
  lodStates: Partial<Record<TreeLodLevel, ChunkLodRenderState>>
}

export interface ChunkBuildLeafTextures {
  clusterLeafTex: THREE.Texture
  singleLeafTex: THREE.Texture
}

export function getFallbackChunkLodLevel(chunk: SceneLodChunkState): TreeLodLevel {
  return TREE_LOD_LEVELS.find((level) => chunk.lodStates[level] !== undefined) ?? 'near'
}

export function getInitialChunkLodLevel(
  cameraPosition: THREE.Vector3,
  center: THREE.Vector3,
  cellSize: number,
  getChunkLodLevel: (distance: number, cellSize: number) => TreeLodLevel
): TreeLodLevel {
  return getChunkLodLevel(cameraPosition.distanceTo(center), cellSize)
}

export function getChunkLeafTexture(
  plannedLodState: PlannedChunkLodStateMap[TreeLodLevel],
  textures: ChunkBuildLeafTextures | null
): THREE.Texture | null {
  if (!textures) {
    return null
  }

  return plannedLodState.variants[0].renderConfig.leafTextureType === 'single'
    ? textures.singleLeafTex
    : textures.clusterLeafTex
}
