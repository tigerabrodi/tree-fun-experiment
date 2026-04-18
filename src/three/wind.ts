/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
import * as THREE from 'three/webgpu'
import type { TreeLodLevel } from '@/engine/lod'
import {
  Fn,
  cos,
  dot,
  float,
  fract,
  instanceIndex,
  instancedArray,
  normalize,
  sin,
  storage,
  time,
  uniform,
  vec3,
} from 'three/tsl'

export interface WindSettings {
  strength: number
  speed: number
  direction: number
}

export interface WindLodProfile {
  animate: boolean
  strengthScale: number
  speedScale: number
}

export const DEFAULT_WIND_SETTINGS: WindSettings = {
  strength: 0.38,
  speed: 1.0,
  direction: 28,
}

export type WindBufferNode = any

export interface LeafWindRuntime {
  computeNode: object | null
  offsetBuffer: WindBufferNode
  renderOffsetBuffer: WindBufferNode
  windMode: 'animated' | 'static'
  applySettings: (settings: WindSettings) => void
  dispose: () => void
}

const WIND_LOD_PROFILES: Record<TreeLodLevel, WindLodProfile> = {
  near: {
    animate: true,
    strengthScale: 1,
    speedScale: 1,
  },
  mid: {
    animate: true,
    strengthScale: 0.72,
    speedScale: 0.82,
  },
  far: {
    animate: false,
    strengthScale: 0,
    speedScale: 0,
  },
  ultraFar: {
    animate: false,
    strengthScale: 0,
    speedScale: 0,
  },
}

export function directionDegreesToVector(direction: number): THREE.Vector3 {
  const radians = THREE.MathUtils.degToRad(direction)
  return new THREE.Vector3(Math.cos(radians), 0, Math.sin(radians)).normalize()
}

export function packLeafWindData(
  leafMatrices: Array<THREE.Matrix4>
): Float32Array {
  if (leafMatrices.length === 0) {
    return new Float32Array()
  }

  const position = new THREE.Vector3()
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const matrix of leafMatrices) {
    position.setFromMatrixPosition(matrix)
    minY = Math.min(minY, position.y)
    maxY = Math.max(maxY, position.y)
  }

  const heightRange = Math.max(0.001, maxY - minY)
  const packed = new Float32Array(leafMatrices.length * 4)

  for (let i = 0; i < leafMatrices.length; i++) {
    position.setFromMatrixPosition(leafMatrices[i])
    const offset = i * 4
    const normalizedHeight = (position.y - minY) / heightRange

    packed[offset] = position.x
    packed[offset + 1] = position.y
    packed[offset + 2] = position.z
    packed[offset + 3] = 0.18 + normalizedHeight * 0.82
  }

  return packed
}

export function packLeafWindDataFromMatrixElements(
  leafMatrixElements: Float32Array
): Float32Array {
  if (leafMatrixElements.length === 0) {
    return new Float32Array()
  }

  const leafCount = leafMatrixElements.length / 16
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (let i = 0; i < leafCount; i++) {
    const y = leafMatrixElements[i * 16 + 13]
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }

  const heightRange = Math.max(0.001, maxY - minY)
  const packed = new Float32Array(leafCount * 4)

  for (let i = 0; i < leafCount; i++) {
    const matrixOffset = i * 16
    const packedOffset = i * 4
    const x = leafMatrixElements[matrixOffset + 12]
    const y = leafMatrixElements[matrixOffset + 13]
    const z = leafMatrixElements[matrixOffset + 14]
    const normalizedHeight = (y - minY) / heightRange

    packed[packedOffset] = x
    packed[packedOffset + 1] = y
    packed[packedOffset + 2] = z
    packed[packedOffset + 3] = 0.18 + normalizedHeight * 0.82
  }

  return packed
}

export function getWindLodProfile(level: TreeLodLevel): WindLodProfile {
  return WIND_LOD_PROFILES[level]
}

export function scaleWindSettings(
  settings: WindSettings,
  profile: WindLodProfile
): WindSettings {
  return {
    strength: settings.strength * profile.strengthScale,
    speed: settings.speed * profile.speedScale,
    direction: settings.direction,
  }
}

export function createLeafWindRuntime(
  leafMatrices: Array<THREE.Matrix4>,
  settings: WindSettings,
  options: {
    animate?: boolean
  } = {}
): LeafWindRuntime | null {
  if (leafMatrices.length === 0) {
    return null
  }

  const offsets = instancedArray(leafMatrices.length, 'vec3').setName(
    'LeafWindOffsets'
  )
  const renderOffsets = storage(offsets.value, 'vec3', leafMatrices.length)
    .setName('LeafWindOffsetsRead')
    .toReadOnly()
  const shouldAnimate = options.animate ?? true

  if (!shouldAnimate) {
    return {
      computeNode: null,
      offsetBuffer: offsets,
      renderOffsetBuffer: renderOffsets,
      windMode: 'static',
      applySettings() {},
      dispose() {},
    }
  }

  const basePositions = instancedArray(packLeafWindData(leafMatrices), 'vec4')
    .setName('LeafBasePositions')
    .toReadOnly()
  const strengthUniform = uniform(settings.strength, 'float').setName(
    'windStrength'
  )
  const speedUniform = uniform(settings.speed, 'float').setName('windSpeed')
  const directionUniform = uniform(
    THREE.MathUtils.degToRad(settings.direction),
    'float'
  ).setName('windDirection')

  const hashScalar = Fn(([point]: [any]) => {
    return fract(sin(dot(point, vec3(12.9898, 78.233, 45.164))).mul(43758.5453))
  })

  const computeNode = Fn(() => {
    const base = basePositions.element(instanceIndex)
    const worldPosition = base.xyz
    const heightFactor = base.w
    const instanceFloat = float(instanceIndex)
    const t = time.mul(speedUniform)
    const direction = normalize(
      vec3(cos(directionUniform), 0.0, sin(directionUniform)).add(
        vec3(0.00001, 0.0, 0.00001)
      )
    )
    const lateral = vec3(direction.z.negate(), 0.0, direction.x)

    const branchSeed = hashScalar(
      worldPosition.mul(0.19).add(vec3(1.7, 5.2, 3.1))
    )
    const flutterSeed = hashScalar(
      worldPosition
        .mul(0.37)
        .add(
          vec3(
            instanceFloat.mul(0.013),
            instanceFloat.mul(0.021),
            instanceFloat.mul(0.017)
          )
        )
    )

    const globalWave = sin(
      t
        .mul(0.65)
        .add(dot(worldPosition, vec3(0.016, 0.0, 0.012)))
        .add(branchSeed.mul(6.28318))
    )
    const branchWave = sin(
      t
        .mul(1.45)
        .add(dot(worldPosition, vec3(0.085, 0.055, 0.11)))
        .add(branchSeed.mul(18.0))
    )
    const crossWave = cos(
      t
        .mul(1.12)
        .add(dot(worldPosition, vec3(-0.07, 0.04, 0.09)))
        .add(branchSeed.mul(13.0))
    )
    const flutter = sin(
      t.mul(5.1).add(flutterSeed.mul(25.0)).add(instanceFloat.mul(0.05))
    )
      .add(
        cos(t.mul(7.3).add(flutterSeed.mul(31.0)).add(instanceFloat.mul(0.08)))
      )
      .mul(0.5)

    const swayAmount = strengthUniform.mul(heightFactor.mul(0.8).add(0.08))
    const bend = globalWave.mul(0.72).add(branchWave.mul(0.28))
    const forward = direction.mul(bend.mul(swayAmount))
    const sideways = lateral.mul(crossWave.mul(swayAmount).mul(0.22))
    const vertical = vec3(
      0.0,
      flutter.mul(strengthUniform).mul(heightFactor).mul(0.08),
      0.0
    )

    offsets.element(instanceIndex).assign(forward.add(sideways).add(vertical))
  })()
    .compute(leafMatrices.length)
    .setName('LeafWindUpdate')

  return {
    computeNode,
    offsetBuffer: offsets,
    renderOffsetBuffer: renderOffsets,
    windMode: 'animated',
    applySettings(nextSettings) {
      strengthUniform.value = nextSettings.strength
      speedUniform.value = nextSettings.speed
      directionUniform.value = THREE.MathUtils.degToRad(nextSettings.direction)
    },
    dispose() {
      computeNode.dispose()
    },
  }
}

export function createLeafWindRuntimeFromMatrixElements(
  leafMatrixElements: Float32Array,
  settings: WindSettings,
  options: {
    animate?: boolean
  } = {}
): LeafWindRuntime | null {
  const leafCount = leafMatrixElements.length / 16

  if (leafCount === 0) {
    return null
  }

  const offsets = instancedArray(leafCount, 'vec3').setName('LeafWindOffsets')
  const renderOffsets = storage(offsets.value, 'vec3', leafCount)
    .setName('LeafWindOffsetsRead')
    .toReadOnly()
  const shouldAnimate = options.animate ?? true

  if (!shouldAnimate) {
    return {
      computeNode: null,
      offsetBuffer: offsets,
      renderOffsetBuffer: renderOffsets,
      windMode: 'static',
      applySettings() {},
      dispose() {},
    }
  }

  const basePositions = instancedArray(
    packLeafWindDataFromMatrixElements(leafMatrixElements),
    'vec4'
  )
    .setName('LeafBasePositions')
    .toReadOnly()
  const strengthUniform = uniform(settings.strength, 'float').setName(
    'windStrength'
  )
  const speedUniform = uniform(settings.speed, 'float').setName('windSpeed')
  const directionUniform = uniform(
    THREE.MathUtils.degToRad(settings.direction),
    'float'
  ).setName('windDirection')

  const hashScalar = Fn(([point]: [any]) => {
    return fract(sin(dot(point, vec3(12.9898, 78.233, 45.164))).mul(43758.5453))
  })

  const computeNode = Fn(() => {
    const base = basePositions.element(instanceIndex)
    const worldPosition = base.xyz
    const heightFactor = base.w
    const instanceFloat = float(instanceIndex)
    const t = time.mul(speedUniform)
    const direction = normalize(
      vec3(cos(directionUniform), 0.0, sin(directionUniform)).add(
        vec3(0.00001, 0.0, 0.00001)
      )
    )
    const lateral = vec3(direction.z.negate(), 0.0, direction.x)

    const branchSeed = hashScalar(
      worldPosition.mul(0.19).add(vec3(1.7, 5.2, 3.1))
    )
    const flutterSeed = hashScalar(
      worldPosition
        .mul(0.37)
        .add(
          vec3(
            instanceFloat.mul(0.013),
            instanceFloat.mul(0.021),
            instanceFloat.mul(0.017)
          )
        )
    )

    const globalWave = sin(
      t
        .mul(0.65)
        .add(dot(worldPosition, vec3(0.016, 0.0, 0.012)))
        .add(branchSeed.mul(6.28318))
    )
    const branchWave = sin(
      t
        .mul(1.45)
        .add(dot(worldPosition, vec3(0.085, 0.055, 0.11)))
        .add(branchSeed.mul(18.0))
    )
    const crossWave = cos(
      t
        .mul(1.12)
        .add(dot(worldPosition, vec3(-0.07, 0.04, 0.09)))
        .add(branchSeed.mul(13.0))
    )
    const flutter = sin(
      t.mul(5.1).add(flutterSeed.mul(25.0)).add(instanceFloat.mul(0.05))
    )
      .add(
        cos(t.mul(7.3).add(flutterSeed.mul(31.0)).add(instanceFloat.mul(0.08)))
      )
      .mul(0.5)

    const swayAmount = strengthUniform.mul(heightFactor.mul(0.8).add(0.08))
    const bend = globalWave.mul(0.72).add(branchWave.mul(0.28))
    const forward = direction.mul(bend.mul(swayAmount))
    const sideways = lateral.mul(crossWave.mul(swayAmount).mul(0.22))
    const vertical = vec3(
      0.0,
      flutter.mul(strengthUniform).mul(heightFactor).mul(0.08),
      0.0
    )

    offsets.element(instanceIndex).assign(forward.add(sideways).add(vertical))
  })()
    .compute(leafCount)
    .setName('LeafWindUpdate')

  return {
    computeNode,
    offsetBuffer: offsets,
    renderOffsetBuffer: renderOffsets,
    windMode: 'animated',
    applySettings(nextSettings) {
      strengthUniform.value = nextSettings.strength
      speedUniform.value = nextSettings.speed
      directionUniform.value = THREE.MathUtils.degToRad(nextSettings.direction)
    },
    dispose() {
      computeNode.dispose()
    },
  }
}
