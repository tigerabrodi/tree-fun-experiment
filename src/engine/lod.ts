import type { TreeBlueprint } from './blueprint'
import type { TreeSegment, LeafPoint } from './lsystem'
import type { SpeciesConfig } from './species'

export type TreeLodLevel = 'near' | 'mid' | 'far'

export const TREE_LOD_LEVELS: Array<TreeLodLevel> = ['near', 'mid', 'far']

export interface TreeLodRenderConfig
  extends Pick<
    SpeciesConfig,
    | 'leafSize'
    | 'leafTextureType'
    | 'leafClusterStyle'
    | 'leafClusterCount'
    | 'leafClusterSpread'
  > {
  leafGeometryType: SpeciesConfig['leafTextureType']
  trunkRadialSegments: number
}

export interface TreeLodVariant {
  level: TreeLodLevel
  blueprint: TreeBlueprint
  renderConfig: TreeLodRenderConfig
}

interface TreeLodSettings {
  keepLeafRatio: number
  alwaysKeepDepth: number
  keepThicknessRatio: number
  thinSegmentKeepRatio: number
  trunkRadialSegments: number
  leafGeometryType: SpeciesConfig['leafTextureType'] | 'preserve'
  leafClusterCountScale: number
  leafClusterSpreadScale: number
  leafSizeScale: number
}

const TREE_LOD_SETTINGS: Record<TreeLodLevel, TreeLodSettings> = {
  near: {
    keepLeafRatio: 1,
    alwaysKeepDepth: 99,
    keepThicknessRatio: 0,
    thinSegmentKeepRatio: 1,
    trunkRadialSegments: 8,
    leafGeometryType: 'preserve',
    leafClusterCountScale: 1,
    leafClusterSpreadScale: 1,
    leafSizeScale: 1,
  },
  mid: {
    keepLeafRatio: 0.62,
    alwaysKeepDepth: 2,
    keepThicknessRatio: 0.34,
    thinSegmentKeepRatio: 0.52,
    trunkRadialSegments: 6,
    leafGeometryType: 'preserve',
    leafClusterCountScale: 0.72,
    leafClusterSpreadScale: 0.94,
    leafSizeScale: 1.04,
  },
  far: {
    keepLeafRatio: 0.18,
    alwaysKeepDepth: 1,
    keepThicknessRatio: 0.5,
    thinSegmentKeepRatio: 0.1,
    trunkRadialSegments: 3,
    leafGeometryType: 'single',
    leafClusterCountScale: 0.16,
    leafClusterSpreadScale: 0.34,
    leafSizeScale: 1.08,
  },
}

function hashUnit(seed: number, index: number): number {
  const hashed = Math.sin(seed * 12.9898 + (index + 1) * 78.233) * 43758.5453
  return hashed - Math.floor(hashed)
}

function sampleLeaves(
  leaves: Array<LeafPoint>,
  seed: number,
  keepRatio: number
): Array<LeafPoint> {
  if (keepRatio >= 1 || leaves.length <= 1) {
    return leaves
  }

  const sampled = leaves.filter((_, index) => hashUnit(seed, index) < keepRatio)

  if (sampled.length > 0) {
    return sampled
  }

  return [leaves[Math.floor(hashUnit(seed, leaves.length) * leaves.length)]]
}

function simplifySegments(
  segments: Array<TreeSegment>,
  seed: number,
  settings: TreeLodSettings
): Array<TreeSegment> {
  if (
    settings.thinSegmentKeepRatio >= 1 ||
    settings.alwaysKeepDepth >= 99 ||
    segments.length <= 1
  ) {
    return segments
  }

  const maxRadius = segments.reduce(
    (max, segment) =>
      Math.max(max, segment.startRadius, segment.endRadius),
    0.001
  )

  const simplified = segments.filter((segment, index) => {
    const thickness =
      Math.max(segment.startRadius, segment.endRadius) / Math.max(0.001, maxRadius)

    if (segment.depth <= settings.alwaysKeepDepth) {
      return true
    }

    if (thickness >= settings.keepThicknessRatio) {
      return true
    }

    return hashUnit(seed * 1.37 + segment.depth * 17.9, index) <
      settings.thinSegmentKeepRatio
  })

  if (simplified.length > 0) {
    return simplified
  }

  return [segments[0]]
}

function createTreeLodRenderConfig(
  config: SpeciesConfig,
  settings: TreeLodSettings
): TreeLodRenderConfig {
  return {
    leafSize: config.leafSize * settings.leafSizeScale,
    leafTextureType: config.leafTextureType,
    leafGeometryType:
      settings.leafGeometryType === 'preserve'
        ? config.leafTextureType
        : settings.leafGeometryType,
    leafClusterStyle: config.leafClusterStyle,
    leafClusterCount: Math.max(
      1,
      Math.round(config.leafClusterCount * settings.leafClusterCountScale)
    ),
    leafClusterSpread: Math.max(
      0.04,
      config.leafClusterSpread * settings.leafClusterSpreadScale
    ),
    trunkRadialSegments: settings.trunkRadialSegments,
  }
}

export function buildTreeLodVariant(
  blueprint: TreeBlueprint,
  level: TreeLodLevel
): TreeLodVariant {
  const settings = TREE_LOD_SETTINGS[level]

  if (level === 'near') {
    return {
      level,
      blueprint,
      renderConfig: createTreeLodRenderConfig(blueprint.config, settings),
    }
  }

  return {
    level,
    blueprint: {
      ...blueprint,
      segments: simplifySegments(blueprint.segments, blueprint.seed, settings),
      leaves: sampleLeaves(blueprint.leaves, blueprint.seed, settings.keepLeafRatio),
    },
    renderConfig: createTreeLodRenderConfig(blueprint.config, settings),
  }
}
