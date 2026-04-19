import { initKTX2Loader } from '@/three/textures'
import * as THREE from 'three/webgpu'
import { float, normalLocal, normalMap, positionLocal, texture } from 'three/tsl'
import { EXPLORE_TERRAIN_TEXTURE_URLS } from './terrain-assets'
import { EXPLORE_TERRAIN_TILE_SIZE } from './terrain-config'
import {
  createExploreTerrainHeightGrid,
  type TerrainHeightSampler,
} from './terrain-height'

export interface ExploreTerrainTextures {
  basecolor: THREE.Texture
  height: THREE.Texture
  metalness: THREE.Texture
  normal: THREE.Texture
  roughness: THREE.Texture
}

export function createExploreTerrainTileGeometry(
  centerX: number,
  centerZ: number,
  sampleHeight: TerrainHeightSampler,
  segments: number
) {
  const heightGrid = createExploreTerrainHeightGrid(
    centerX,
    centerZ,
    sampleHeight,
    segments
  )

  return createExploreTerrainTileGeometryFromHeightGrid(
    segments,
    heightGrid
  )
}

export function createExploreTerrainTileGeometryFromHeightGrid(
  segments: number,
  heightGrid: Float32Array
) {
  const geometry = new THREE.PlaneGeometry(
    EXPLORE_TERRAIN_TILE_SIZE,
    EXPLORE_TERRAIN_TILE_SIZE,
    segments,
    segments
  )
  geometry.rotateX(-Math.PI / 2)

  const positions = geometry.getAttribute('position')
  const halfSize = EXPLORE_TERRAIN_TILE_SIZE * 0.5
  const step = EXPLORE_TERRAIN_TILE_SIZE / segments

  for (let index = 0; index < positions.count; index += 1) {
    const localX = positions.getX(index)
    const localZ = positions.getZ(index)
    const column = Math.round((localX + halfSize) / step)
    const row = Math.round((localZ + halfSize) / step)
    const gridIndex = row * (segments + 1) + column
    positions.setY(index, heightGrid[gridIndex] ?? 0)
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return geometry
}

export async function loadExploreTerrainTextures(
  renderer: THREE.WebGPURenderer
): Promise<ExploreTerrainTextures> {
  const loader = initKTX2Loader(renderer)

  const [basecolor, height, metalness, normal, roughness] = await Promise.all([
    loader.loadAsync(EXPLORE_TERRAIN_TEXTURE_URLS.basecolor),
    loader.loadAsync(EXPLORE_TERRAIN_TEXTURE_URLS.height),
    loader.loadAsync(EXPLORE_TERRAIN_TEXTURE_URLS.metalness),
    loader.loadAsync(EXPLORE_TERRAIN_TEXTURE_URLS.normal),
    loader.loadAsync(EXPLORE_TERRAIN_TEXTURE_URLS.roughness),
  ])

  for (const textureMap of [basecolor, height, metalness, normal, roughness]) {
    textureMap.wrapS = THREE.RepeatWrapping
    textureMap.wrapT = THREE.RepeatWrapping
    textureMap.repeat.set(7.5, 7.5)
  }

  basecolor.colorSpace = THREE.SRGBColorSpace

  return {
    basecolor,
    height,
    metalness,
    normal,
    roughness,
  }
}

export function createExploreTerrainMaterial(textures: ExploreTerrainTextures) {
  const material = new THREE.MeshStandardNodeMaterial()

  material.colorNode = texture(textures.basecolor)
  material.normalNode = normalMap(texture(textures.normal))
  material.roughnessNode = texture(textures.roughness).r
  material.metalnessNode = texture(textures.metalness).r

  const displacementScale = float(0.015)
  material.positionNode = positionLocal.add(
    normalLocal.mul(texture(textures.height).r.mul(displacementScale))
  )

  return material
}
