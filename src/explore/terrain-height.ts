import { EXPLORE_TERRAIN_CLEAR_RADIUS, EXPLORE_TERRAIN_TILE_SIZE } from './terrain-config'
import { SimplexNoise } from './simplex-noise'

export type TerrainHeightSampler = (x: number, z: number) => number

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
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

export function createExploreTerrainHeightGrid(
  centerX: number,
  centerZ: number,
  sampleHeight: TerrainHeightSampler,
  segments: number
) {
  const heights = new Float32Array((segments + 1) * (segments + 1))
  const halfSize = EXPLORE_TERRAIN_TILE_SIZE * 0.5
  const step = EXPLORE_TERRAIN_TILE_SIZE / segments
  let index = 0

  for (let row = 0; row <= segments; row += 1) {
    const localZ = -halfSize + row * step

    for (let column = 0; column <= segments; column += 1) {
      const localX = -halfSize + column * step
      heights[index] = sampleHeight(centerX + localX, centerZ + localZ)
      index += 1
    }
  }

  return heights
}
