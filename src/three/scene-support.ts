import type { SpeciesConfig } from '@/engine/species'
import {
  getTreeTextureAssetFormat,
  getTreeTextureAssetUrl,
  type TreeAssetPack,
} from '@/lib/assets'
import * as THREE from 'three/webgpu'
import { loadBarkTextures, loadLeafTexture } from './textures'

const barkCache = new Map<
  string,
  Awaited<ReturnType<typeof loadBarkTextures>>
>()
const leafCache = new Map<string, THREE.Texture>()

export function disposeGroupResources(group: THREE.Group) {
  const materials = new Set<THREE.Material>()

  group.traverse((obj) => {
    if (
      obj instanceof THREE.Mesh ||
      obj instanceof THREE.InstancedMesh ||
      obj instanceof THREE.LineSegments
    ) {
      const geometry = obj.geometry as THREE.BufferGeometry
      const material = obj.material as THREE.Material | Array<THREE.Material>

      geometry.dispose()
      if (Array.isArray(material)) {
        for (const materialItem of material) {
          materials.add(materialItem)
        }
      } else {
        materials.add(material)
      }
    }
  })

  for (const material of materials) {
    material.dispose()
  }
}

export function setMaterialWireframe(material: THREE.Material, enabled: boolean) {
  const materialWithWireframe = material as THREE.Material & {
    wireframe?: boolean
  }

  if ('wireframe' in materialWithWireframe) {
    materialWithWireframe.wireframe = enabled
    material.needsUpdate = true
  }
}

export async function getBarkTextures(
  species: string,
  assetPack: TreeAssetPack
) {
  const bark = assetPack.bark[species]
  const cacheKey = bark
    ? `${assetPack.transcoderPath}|${species}|${getTreeTextureAssetFormat(bark.basecolor)}:${getTreeTextureAssetUrl(bark.basecolor)}|${getTreeTextureAssetFormat(bark.normal)}:${getTreeTextureAssetUrl(bark.normal)}|${getTreeTextureAssetFormat(bark.roughness)}:${getTreeTextureAssetUrl(bark.roughness)}|${getTreeTextureAssetFormat(bark.metalness)}:${getTreeTextureAssetUrl(bark.metalness)}|${getTreeTextureAssetFormat(bark.height)}:${getTreeTextureAssetUrl(bark.height)}`
    : `${assetPack.transcoderPath}|${species}|missing`

  if (!barkCache.has(cacheKey)) {
    barkCache.set(cacheKey, await loadBarkTextures(species, assetPack))
  }
  return barkCache.get(cacheKey)!
}

export async function getLeafTexture(
  species: string,
  type: SpeciesConfig['leafTextureType'],
  assetPack: TreeAssetPack
) {
  const textureSource = assetPack.leaves[species]?.[type]
  const key = textureSource
    ? `${assetPack.transcoderPath}|${species}_${type}|${getTreeTextureAssetFormat(textureSource)}:${getTreeTextureAssetUrl(textureSource)}`
    : `${assetPack.transcoderPath}|${species}_${type}|missing`
  if (!leafCache.has(key)) {
    leafCache.set(key, await loadLeafTexture(species, type, assetPack))
  }
  return leafCache.get(key)!
}
