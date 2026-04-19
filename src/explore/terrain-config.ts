export const EXPLORE_TERRAIN_TILE_SIZE = 72
export const EXPLORE_TERRAIN_CENTER_TILE_SEGMENTS = 18
export const EXPLORE_TERRAIN_MIDDLE_TILE_SEGMENTS = 10
export const EXPLORE_TERRAIN_OUTER_TILE_SEGMENTS = 6
export const EXPLORE_TERRAIN_CACHE_RADIUS = 2
export const EXPLORE_TERRAIN_CLEAR_RADIUS = 20
export const EXPLORE_TERRAIN_TREE_MARGIN = 8

export function getExploreTerrainCellIndex(position: number) {
  return Math.floor((position + EXPLORE_TERRAIN_TILE_SIZE * 0.5) / EXPLORE_TERRAIN_TILE_SIZE)
}

export function getExploreTerrainSegmentsForRing(ringDistance: number) {
  if (ringDistance <= 0) {
    return EXPLORE_TERRAIN_CENTER_TILE_SEGMENTS
  }

  if (ringDistance === 1) {
    return EXPLORE_TERRAIN_MIDDLE_TILE_SEGMENTS
  }

  return EXPLORE_TERRAIN_OUTER_TILE_SEGMENTS
}
