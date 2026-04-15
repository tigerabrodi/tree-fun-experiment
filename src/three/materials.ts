import * as THREE from 'three/webgpu'
import {
  texture,
  normalMap,
  float,
  Fn,
  positionLocal,
  normalLocal,
} from 'three/tsl'
import type { BarkTextures } from './textures'

export function createBarkMaterial(
  textures: BarkTextures
): THREE.MeshStandardNodeMaterial {
  const material = new THREE.MeshStandardNodeMaterial()

  material.colorNode = texture(textures.basecolor)
  material.normalNode = normalMap(texture(textures.normal))
  material.roughnessNode = texture(textures.roughness).r
  material.metalnessNode = texture(textures.metalness).r

  const displacementScale = float(0.03)
  const displacement = texture(textures.height).r.mul(displacementScale)
  material.positionNode = positionLocal.add(normalLocal.mul(displacement))

  return material
}

export function createLeafMaterial(
  leafMap: THREE.Texture
): THREE.MeshStandardNodeMaterial {
  const material = new THREE.MeshStandardNodeMaterial()

  const leafTex = texture(leafMap)
  material.colorNode = leafTex
  material.opacityNode = leafTex.a
  material.alphaTestNode = float(0.35)
  material.roughnessNode = float(0.8)
  material.metalnessNode = float(0.0)
  material.side = THREE.DoubleSide

  // Subtle leaf translucency via emissive
  material.emissiveNode = Fn(() => {
    return leafTex.rgb.mul(0.08)
  })()

  return material
}
