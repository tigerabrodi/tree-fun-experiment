import * as THREE from 'three/webgpu'
import {
  attribute,
  cos,
  dot,
  float,
  Fn,
  instanceIndex,
  normalLocal,
  normalMap,
  normalize,
  positionLocal,
  sin,
  texture,
  time,
  uniform,
  vec3,
} from 'three/tsl'
import type { BarkTextures } from './textures'
import type { WindBufferNode, WindSettings } from './wind'

export function createBarkMaterial(
  textures: BarkTextures,
  wind: WindSettings
): THREE.MeshStandardNodeMaterial {
  const material = new THREE.MeshStandardNodeMaterial()

  material.colorNode = texture(textures.basecolor)
  material.normalNode = normalMap(texture(textures.normal))
  material.roughnessNode = texture(textures.roughness).r
  material.metalnessNode = texture(textures.metalness).r

  const displacementScale = float(0.03)
  const displacement = texture(textures.height).r.mul(displacementScale)
  const barkPosition = positionLocal.add(normalLocal.mul(displacement))
  const windWeight: any = attribute('windWeight', 'float')
  const windPhase: any = attribute('windPhase', 'float')
  const strengthUniform = uniform(wind.strength, 'float')
  const speedUniform = uniform(wind.speed, 'float')
  const directionUniform = uniform(THREE.MathUtils.degToRad(wind.direction), 'float')
  const direction = normalize(
    vec3(cos(directionUniform), 0.0, sin(directionUniform)).add(
      vec3(0.00001, 0.0, 0.00001)
    )
  )
  const lateral = vec3(direction.z.negate(), 0.0, direction.x)
  const t = time.mul(speedUniform)
  const globalWave = sin(
    t.mul(0.42)
      .add(dot(barkPosition, vec3(0.018, 0.0, 0.014)))
      .add(windPhase.mul(6.28318))
  )
  const branchWave = sin(
    t.mul(0.94)
      .add(dot(barkPosition, vec3(0.063, 0.028, 0.081)))
      .add(windPhase.mul(14.0))
  )
  const crossWave = cos(
    t.mul(0.73)
      .add(dot(barkPosition, vec3(-0.052, 0.019, 0.047)))
      .add(windPhase.mul(10.0))
  )
  const liftWave = sin(t.mul(1.16).add(windPhase.mul(19.0)))
  const swayStrength = strengthUniform.mul(windWeight).mul(0.24)
  const bend = globalWave.mul(0.78).add(branchWave.mul(0.22))
  const sway = direction
    .mul(bend.mul(swayStrength))
    .add(lateral.mul(crossWave.mul(swayStrength).mul(0.24)))
    .add(vec3(0.0, liftWave.mul(swayStrength).mul(0.06), 0.0))

  material.positionNode = barkPosition.add(sway)

  return material
}

export function createLeafMaterial(
  leafMap: THREE.Texture,
  windOffsetBuffer: WindBufferNode | null = null
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

  if (windOffsetBuffer) {
    material.positionNode = positionLocal.add(
      windOffsetBuffer.element(instanceIndex)
    )
  }

  return material
}
