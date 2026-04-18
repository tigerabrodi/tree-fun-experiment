import { describe, expect, it } from 'vitest'
import {
  createTreeAssetPack,
  DEFAULT_TREE_ASSET_PACK,
  getTreeTextureAssetFormat,
  getTreeTextureAssetUrl,
  getBarkTextureAssetPaths,
  getLeafTextureAssetPaths,
} from './assets'

describe('createTreeAssetPack', () => {
  it('keeps the shipped default textures when no overrides are provided', () => {
    const assetPack = createTreeAssetPack()

    expect(assetPack).toEqual(DEFAULT_TREE_ASSET_PACK)
  })

  it('lets callers override one shipped bark texture path without redefining the whole set', () => {
    const assetPack = createTreeAssetPack({
      bark: {
        oak: {
          basecolor: '/custom/oak_basecolor.ktx2',
        },
      },
    })

    expect(getBarkTextureAssetPaths(assetPack, 'oak')).toEqual({
      ...DEFAULT_TREE_ASSET_PACK.bark.oak,
      basecolor: '/custom/oak_basecolor.ktx2',
    })
  })

  it('lets callers add a brand new leaf asset id for custom species', () => {
    const assetPack = createTreeAssetPack({
      leaves: {
        willow: {
          single: '/custom/willow_single.ktx2',
          cluster: '/custom/willow_cluster.ktx2',
        },
      },
    })

    expect(getLeafTextureAssetPaths(assetPack, 'willow')).toEqual({
      single: '/custom/willow_single.ktx2',
      cluster: '/custom/willow_cluster.ktx2',
    })
  })

  it('accepts normal image formats for custom bark and leaf textures', () => {
    const assetPack = createTreeAssetPack({
      bark: {
        oak: {
          basecolor: '/custom/oak_basecolor.webp',
        },
      },
      leaves: {
        willow: {
          single: '/custom/willow_single.png',
          cluster: '/custom/willow_cluster.jpg',
        },
      },
    })

    expect(getBarkTextureAssetPaths(assetPack, 'oak').basecolor).toBe(
      '/custom/oak_basecolor.webp'
    )
    expect(getLeafTextureAssetPaths(assetPack, 'willow')).toEqual({
      single: '/custom/willow_single.png',
      cluster: '/custom/willow_cluster.jpg',
    })
  })
})

describe('texture asset helpers', () => {
  it('infers ktx2 versus normal image formats from string paths', () => {
    expect(getTreeTextureAssetFormat('/custom/oak_basecolor.ktx2')).toBe('ktx2')
    expect(getTreeTextureAssetFormat('/custom/oak_basecolor.webp')).toBe(
      'image'
    )
    expect(getTreeTextureAssetFormat('/custom/oak_basecolor.png?v=1')).toBe(
      'image'
    )
    expect(getTreeTextureAssetFormat('/custom/oak_basecolor.jpg#debug')).toBe(
      'image'
    )
  })

  it('infers data image urls as normal images and other data urls as ktx2', () => {
    expect(
      getTreeTextureAssetFormat('data:image/webp;base64,abc123')
    ).toBe('image')
    expect(
      getTreeTextureAssetFormat('data:application/octet-stream;base64,abc123')
    ).toBe('ktx2')
  })

  it('lets callers force the format for extensionless urls', () => {
    const source = {
      url: 'https://cdn.example.com/tree/oak-leaf',
      format: 'image' as const,
    }

    expect(getTreeTextureAssetUrl(source)).toBe(
      'https://cdn.example.com/tree/oak-leaf'
    )
    expect(getTreeTextureAssetFormat(source)).toBe('image')
  })
})
