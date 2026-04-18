import * as THREE from 'three/webgpu'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import {
  getBarkTextureAssetPaths,
  getLeafTextureAssetPaths,
  getTreeTextureAssetFormat,
  getTreeTextureAssetUrl,
  type TreeTextureAssetSource,
  type TreeAssetPack,
  DEFAULT_TREE_ASSET_PACK,
} from '@/lib/assets'

const ktx2Loaders = new Map<string, KTX2Loader>()
const imageLoader = new THREE.TextureLoader()

export function initKTX2Loader(
  renderer: THREE.WebGPURenderer,
  transcoderPath = DEFAULT_TREE_ASSET_PACK.transcoderPath
): KTX2Loader {
  const existingLoader = ktx2Loaders.get(transcoderPath)
  if (existingLoader) {
    existingLoader.detectSupport(renderer)
    return existingLoader
  }

  const loader = new KTX2Loader()
  loader.setTranscoderPath(transcoderPath)
  loader.detectSupport(renderer)
  ktx2Loaders.set(transcoderPath, loader)
  return loader
}

export interface BarkTextures {
  basecolor: THREE.Texture
  normal: THREE.Texture
  roughness: THREE.Texture
  metalness: THREE.Texture
  height: THREE.Texture
}

async function loadTextureAssetSource(
  source: TreeTextureAssetSource,
  assetPack: TreeAssetPack
): Promise<THREE.Texture> {
  const url = getTreeTextureAssetUrl(source)
  const format = getTreeTextureAssetFormat(source)

  if (format === 'ktx2') {
    const loader = ktx2Loaders.get(assetPack.transcoderPath)

    if (!loader) {
      throw new Error(
        'KTX2 loader is not initialized. Call initKTX2Loader() before loading ktx2 textures.'
      )
    }

    return loader.loadAsync(url)
  }

  return imageLoader.loadAsync(url)
}

export async function loadBarkTextures(
  barkId: string,
  assetPack: TreeAssetPack
): Promise<BarkTextures> {
  const barkPaths = getBarkTextureAssetPaths(assetPack, barkId)

  const [basecolor, normal, roughness, metalness, height] = await Promise.all([
    loadTextureAssetSource(barkPaths.basecolor, assetPack),
    loadTextureAssetSource(barkPaths.normal, assetPack),
    loadTextureAssetSource(barkPaths.roughness, assetPack),
    loadTextureAssetSource(barkPaths.metalness, assetPack),
    loadTextureAssetSource(barkPaths.height, assetPack),
  ])

  for (const tex of [basecolor, normal, roughness, metalness, height]) {
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
  }

  basecolor.colorSpace = THREE.SRGBColorSpace

  return { basecolor, normal, roughness, metalness, height }
}

export async function loadLeafTexture(
  leafId: string,
  type: 'single' | 'cluster',
  assetPack: TreeAssetPack
): Promise<THREE.Texture> {
  const leafPaths = getLeafTextureAssetPaths(assetPack, leafId)
  const tex = await loadTextureAssetSource(leafPaths[type], assetPack)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
