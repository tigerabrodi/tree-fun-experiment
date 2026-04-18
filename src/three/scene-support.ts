import type { SpeciesConfig } from '@/engine/species'
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

export async function getBarkTextures(species: string) {
  if (!barkCache.has(species)) {
    barkCache.set(species, await loadBarkTextures(species))
  }
  return barkCache.get(species)!
}

export async function getLeafTexture(
  species: string,
  type: SpeciesConfig['leafTextureType']
) {
  const key = `${species}_${type}`
  if (!leafCache.has(key)) {
    leafCache.set(key, await loadLeafTexture(species, type))
  }
  return leafCache.get(key)!
}
