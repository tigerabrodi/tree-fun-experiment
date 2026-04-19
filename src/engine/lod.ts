import type { ForestInstance } from './forest'
import type { ForestVariantBlueprint, TreeBlueprint } from './blueprint'
import type { TreeSegment, LeafPoint } from './lsystem'
import type { SpeciesConfig } from './species'
import type { PackedTrunkGeometryData } from '@/three/trunk-geometry-data'

export type TreeLodLevel = 'near' | 'mid' | 'far' | 'ultraFar'

export const TREE_LOD_LEVELS: Array<TreeLodLevel> = [
  'near',
  'mid',
  'far',
  'ultraFar',
]

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
  leafAlphaTest: number
  trunkRadialSegments: number
}

export interface TreeLodVariant {
  level: TreeLodLevel
  blueprint: TreeBlueprint
  renderConfig: TreeLodRenderConfig
}

export interface PlannedForestLodVariant {
  seed: number
  instances: Array<ForestInstance>
  blueprint: TreeBlueprint
  renderConfig: TreeLodRenderConfig
  treeMatrixElements?: Float32Array
  trunkGeometryData?: PackedTrunkGeometryData
}

export interface PlannedChunkLodState {
  variants: Array<PlannedForestLodVariant>
  leafMatrixElements: Float32Array
}

interface TreeLodSettings {
  keepLeafRatio: number
  alwaysKeepDepth: number
  keepThicknessRatio: number
  thinSegmentKeepRatio: number
  trunkRadialSegments: number
  leafGeometryType: SpeciesConfig['leafTextureType'] | 'preserve'
  leafAlphaTest: number
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
    leafAlphaTest: 0.35,
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
    leafAlphaTest: 0.4,
    leafClusterCountScale: 0.72,
    leafClusterSpreadScale: 0.94,
    leafSizeScale: 1.04,
  },
  far: {
    keepLeafRatio: 0.16,
    alwaysKeepDepth: 1,
    keepThicknessRatio: 0.56,
    thinSegmentKeepRatio: 0.05,
    trunkRadialSegments: 3,
    leafGeometryType: 'single',
    leafAlphaTest: 0.44,
    leafClusterCountScale: 0.34,
    leafClusterSpreadScale: 0.76,
    leafSizeScale: 1.66,
  },
  ultraFar: {
    keepLeafRatio: 0.08,
    alwaysKeepDepth: 1,
    keepThicknessRatio: 0.7,
    thinSegmentKeepRatio: 0.02,
    trunkRadialSegments: 3,
    leafGeometryType: 'single',
    leafAlphaTest: 0.5,
    leafClusterCountScale: 0.2,
    leafClusterSpreadScale: 0.78,
    leafSizeScale: 1.8,
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
    leafAlphaTest: settings.leafAlphaTest,
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

export function buildForestLodVariants(
  variants: Array<ForestVariantBlueprint>,
  level: TreeLodLevel
): Array<PlannedForestLodVariant> {
  return variants.map((variant) => {
    const lodVariant = buildTreeLodVariant(variant.blueprint, level)

    return {
      seed: variant.seed,
      instances: variant.instances,
      blueprint: lodVariant.blueprint,
      renderConfig: lodVariant.renderConfig,
    }
  })
}
