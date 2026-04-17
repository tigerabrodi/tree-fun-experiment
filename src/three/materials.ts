/* eslint-disable @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import * as THREE from 'three/webgpu'
import {
  float,
  Fn,
  instanceIndex,
  normalLocal,
  normalMap,
  positionLocal,
  texture,
} from 'three/tsl'
import type { BarkTextures } from './textures'
import type { WindBufferNode, WindSettings } from './wind'

export function createBarkMaterial(
  textures: BarkTextures,
  wind: WindSettings
): THREE.MeshStandardNodeMaterial {
  void wind
  const material = new THREE.MeshStandardNodeMaterial()

  material.colorNode = texture(textures.basecolor)
  material.normalNode = normalMap(texture(textures.normal))
  material.roughnessNode = texture(textures.roughness).r
  material.metalnessNode = texture(textures.metalness).r

  const displacementScale = float(0.03)
  const displacement = texture(textures.height).r.mul(displacementScale)
  const barkPosition = positionLocal.add(normalLocal.mul(displacement))
  material.positionNode = barkPosition

  return material
}

export function createLeafMaterial(
  leafMap: THREE.Texture,
  windOffsetBuffer: WindBufferNode | null = null,
  options: {
    alphaTest?: number
  } = {}
): THREE.MeshStandardNodeMaterial {
  const material = new THREE.MeshStandardNodeMaterial()
  const alphaTest = options.alphaTest ?? 0.35

  const leafTex = texture(leafMap)
  material.colorNode = leafTex
  material.opacityNode = leafTex.a
  material.alphaTestNode = float(alphaTest)
  material.roughnessNode = float(0.8)
  material.metalnessNode = float(0.0)
  material.side = THREE.DoubleSide

  // Subtle leaf translucency via emissive
  material.emissiveNode = Fn(() => {
    return leafTex.rgb.mul(0.08)
  })()

  if (windOffsetBuffer) {
    material.positionNode = positionLocal.add(
      windOffsetBuffer.element(instanceIndex)
    )
  }

  return material
}
