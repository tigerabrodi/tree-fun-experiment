import { initKTX2Loader } from '@/three/textures'
import * as THREE from 'three/webgpu'
import { float, normalLocal, normalMap, positionLocal, texture } from 'three/tsl'
import { EXPLORE_TERRAIN_TEXTURE_URLS } from './terrain-assets'
import { SimplexNoise } from './simplex-noise'

export const EXPLORE_TERRAIN_TILE_SIZE = 72
export const EXPLORE_TERRAIN_CENTER_TILE_SEGMENTS = 18
export const EXPLORE_TERRAIN_MIDDLE_TILE_SEGMENTS = 10
export const EXPLORE_TERRAIN_OUTER_TILE_SEGMENTS = 6
export const EXPLORE_TERRAIN_CACHE_RADIUS = 2
export const EXPLORE_TERRAIN_CLEAR_RADIUS = 20
export const EXPLORE_TERRAIN_TREE_MARGIN = 8

export interface ExploreTerrainTextures {
  basecolor: THREE.Texture
  height: THREE.Texture
  metalness: THREE.Texture
  normal: THREE.Texture
  roughness: THREE.Texture
}

export type TerrainHeightSampler = (x: number, z: number) => number

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function getExploreTerrainCellIndex(position: number) {
  return Math.floor((position + EXPLORE_TERRAIN_TILE_SIZE * 0.5) / EXPLORE_TERRAIN_TILE_SIZE)
}

export function createExploreTerrainHeightSampler(seed: number): TerrainHeightSampler {
  const broadNoise = new SimplexNoise(`explore-broad:${seed}`)
  const detailNoise = new SimplexNoise(`explore-detail:${seed}`)

  return (x: number, z: number) => {
    const broad =
      broadNoise.noise3D(x * 0.0038, z * 0.0038, 11.27) * 5.8
    const detail =
      detailNoise.noise3D(x * 0.0105, z * 0.0105, 31.9) * 1.35
    const ripple =
      detailNoise.noise3D(x * 0.024, z * 0.024, 73.4) * 0.35
    const flatten = smoothstep(
      EXPLORE_TERRAIN_CLEAR_RADIUS * 0.45,
      EXPLORE_TERRAIN_CLEAR_RADIUS * 1.75,
      Math.hypot(x, z)
    )

    return (broad + detail + ripple) * flatten
  }
}

export function createExploreTerrainTileGeometry(
  centerX: number,
  centerZ: number,
  sampleHeight: TerrainHeightSampler,
  segments: number
) {
  const geometry = new THREE.PlaneGeometry(
    EXPLORE_TERRAIN_TILE_SIZE,
    EXPLORE_TERRAIN_TILE_SIZE,
    segments,
    segments
  )
  geometry.rotateX(-Math.PI / 2)

  const positions = geometry.getAttribute('position')

  for (let index = 0; index < positions.count; index += 1) {
    const localX = positions.getX(index)
    const localZ = positions.getZ(index)
    const worldX = centerX + localX
    const worldZ = centerZ + localZ
    positions.setY(index, sampleHeight(worldX, worldZ))
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
