import { DEFAULT_TREE_ASSET_PACK_PATHS } from './default-asset-urls'

export type TreeTextureAssetFormat = 'ktx2' | 'image'

export interface TreeTextureAssetDescriptor {
  url: string
  format?: TreeTextureAssetFormat
}

export type TreeTextureAssetSource = string | TreeTextureAssetDescriptor

export interface BarkTextureAssetPaths {
  basecolor: TreeTextureAssetSource
  normal: TreeTextureAssetSource
  roughness: TreeTextureAssetSource
  metalness: TreeTextureAssetSource
  height: TreeTextureAssetSource
}

export interface LeafTextureAssetPaths {
  single: TreeTextureAssetSource
  cluster: TreeTextureAssetSource
}

export interface TreeAssetPack {
  transcoderPath: string
  bark: Record<string, BarkTextureAssetPaths>
  leaves: Record<string, LeafTextureAssetPaths>
}

export interface TreeAssetPackOverrides {
  transcoderPath?: string
  bark?: Partial<Record<string, Partial<BarkTextureAssetPaths>>>
  leaves?: Partial<Record<string, Partial<LeafTextureAssetPaths>>>
}

export const DEFAULT_KTX2_TRANSCODER_PATH =
  'https://cdn.jsdelivr.net/npm/three@0.183.2/examples/jsm/libs/basis/'

export const DEFAULT_TREE_ASSET_PACK: TreeAssetPack = {
  transcoderPath: DEFAULT_KTX2_TRANSCODER_PATH,
  bark: DEFAULT_TREE_ASSET_PACK_PATHS.bark,
  leaves: DEFAULT_TREE_ASSET_PACK_PATHS.leaves,
}

export function getTreeTextureAssetUrl(source: TreeTextureAssetSource): string {
  return typeof source === 'string' ? source : source.url
}

export function inferTreeTextureAssetFormat(
  url: string
): TreeTextureAssetFormat {
  const trimmedUrl = url.trim()
  const normalizedUrl = trimmedUrl.split('#')[0].split('?')[0].toLowerCase()

  if (trimmedUrl.startsWith('data:image/')) {
    return 'image'
  }

  if (trimmedUrl.startsWith('data:')) {
    return 'ktx2'
  }

  if (normalizedUrl.endsWith('.ktx2')) {
    return 'ktx2'
  }

  return 'image'
}

export function getTreeTextureAssetFormat(
  source: TreeTextureAssetSource
): TreeTextureAssetFormat {
  if (typeof source === 'string') {
    return inferTreeTextureAssetFormat(source)
  }

  return source.format ?? inferTreeTextureAssetFormat(source.url)
}

function mergeBarkAssetPaths(
  base: BarkTextureAssetPaths,
  override: Partial<BarkTextureAssetPaths> | undefined
): BarkTextureAssetPaths {
  return {
    ...base,
    ...override,
  }
}

function mergeLeafAssetPaths(
  base: LeafTextureAssetPaths,
  override: Partial<LeafTextureAssetPaths> | undefined
): LeafTextureAssetPaths {
  return {
    ...base,
    ...override,
  }
}

export function createTreeAssetPack(
  overrides: TreeAssetPackOverrides = {}
): TreeAssetPack {
  const bark = { ...DEFAULT_TREE_ASSET_PACK.bark }
  const leaves = { ...DEFAULT_TREE_ASSET_PACK.leaves }

  if (overrides.bark) {
    for (const [id, paths] of Object.entries(overrides.bark)) {
      const base = bark[id]

      if (base) {
        bark[id] = mergeBarkAssetPaths(base, paths)
        continue
      }

      if (
        paths?.basecolor &&
        paths.normal &&
        paths.roughness &&
        paths.metalness &&
        paths.height
      ) {
        bark[id] = {
          basecolor: paths.basecolor,
          normal: paths.normal,
          roughness: paths.roughness,
          metalness: paths.metalness,
          height: paths.height,
        }
      }
    }
  }

  if (overrides.leaves) {
    for (const [id, paths] of Object.entries(overrides.leaves)) {
      const base = leaves[id]

      if (base) {
        leaves[id] = mergeLeafAssetPaths(base, paths)
        continue
      }

      if (paths?.single && paths.cluster) {
        leaves[id] = {
          single: paths.single,
          cluster: paths.cluster,
        }
      }
    }
  }

  return {
    transcoderPath:
      overrides.transcoderPath ?? DEFAULT_TREE_ASSET_PACK.transcoderPath,
    bark,
    leaves,
  }
}

export function getBarkTextureAssetPaths(
  assetPack: TreeAssetPack,
  barkId: string
): BarkTextureAssetPaths {
  const bark = assetPack.bark[barkId]

  if (!bark) {
    throw new Error(
      `Missing bark texture asset pack entry for "${barkId}". Add it to createTreeAssetPack().`
    )
  }

  return bark
}

export function getLeafTextureAssetPaths(
  assetPack: TreeAssetPack,
  leafId: string
): LeafTextureAssetPaths {
  const leaves = assetPack.leaves[leafId]

  if (!leaves) {
    throw new Error(
      `Missing leaf texture asset pack entry for "${leafId}". Add it to createTreeAssetPack().`
    )
  }

  return leaves
}
