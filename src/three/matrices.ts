import * as THREE from 'three/webgpu'
import type { ForestInstance } from '@/engine/forest'
import type { LeafPoint } from '@/engine/lsystem'
import type { SpeciesConfig } from '@/engine/species'

function createSeededRandom(seed: number) {
  let rng = Math.abs(Math.floor(seed)) % 2147483647
  if (rng === 0) rng = 1

  return function random(): number {
    rng = (rng * 16807) % 2147483647
    return rng / 2147483647
  }
}

export function createTreeMatrix(instance: ForestInstance): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(
      instance.position.x,
      instance.position.y,
      instance.position.z
    ),
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      instance.rotationY
    ),
    new THREE.Vector3(instance.scale, instance.scale, instance.scale)
  )
}

export function packMatrices(matrices: Array<THREE.Matrix4>): Float32Array {
  const elements = new Float32Array(matrices.length * 16)

  for (let i = 0; i < matrices.length; i++) {
    elements.set(matrices[i].elements, i * 16)
  }

  return elements
}

export function createPackedTreeMatrices(
  instances: Array<ForestInstance>
): Float32Array {
  return packMatrices(instances.map((instance) => createTreeMatrix(instance)))
}

export function buildLeafMatrices(
  leaves: Array<LeafPoint>,
  seed: number,
  config: Pick<
    SpeciesConfig,
    'leafClusterCount' | 'leafClusterSpread' | 'leafClusterStyle'
  >
): Array<THREE.Matrix4> {
  const matrices: Array<THREE.Matrix4> = []
  const dummy = new THREE.Object3D()
  const worldUp = new THREE.Vector3(0, 1, 0)
  const worldRight = new THREE.Vector3(1, 0, 0)
  const random = createSeededRandom(seed)
  const clusterCount = Math.max(1, Math.round(config.leafClusterCount))
  const clusterSpread = Math.max(0, config.leafClusterSpread)
  const clusterStyle = config.leafClusterStyle

  function getLeafOffset(index: number) {
    if (index === 0) {
      return {
        side: 0,
        up: 0,
        forward: 0,
      }
    }

    switch (clusterStyle) {
      case 'classic':
        return {
          side: (random() - 0.5) * 2 * clusterSpread,
          up: (random() - 0.28) * clusterSpread * 1.15,
          forward: (random() - 0.2) * clusterSpread * 0.8,
        }
      case 'broad':
        return {
          side: (random() - 0.5) * 2 * clusterSpread * 1.4,
          up: (random() - 0.18) * clusterSpread * 0.95,
          forward: (random() - 0.5) * 2 * clusterSpread * 0.42,
        }
      case 'airy':
        return {
          side: (random() - 0.5) * 2 * clusterSpread * 1.2,
          up: (random() - 0.08) * clusterSpread * 1.2,
          forward: (random() - 0.5) * 2 * clusterSpread * 0.32,
        }
      case 'blossom':
        return {
          side: (random() - 0.5) * 2 * clusterSpread * 1.05,
          up: (random() - 0.04) * clusterSpread * 1.1,
          forward: (random() - 0.5) * 2 * clusterSpread * 0.75,
        }
      case 'tuft':
      default:
        return {
          side: (random() - 0.5) * 2 * clusterSpread * 0.82,
          up: (random() - 0.62) * clusterSpread * 0.92,
          forward: (random() - 0.5) * clusterSpread * 1.35,
        }
    }
  }

  function getLeafScale(index: number) {
    switch (clusterStyle) {
      case 'classic':
        return index === 0 ? 0.95 + random() * 0.2 : 0.68 + random() * 0.42
      case 'broad':
        return index === 0 ? 0.8 + random() * 0.1 : 0.46 + random() * 0.2
      case 'airy':
        return index === 0 ? 0.84 + random() * 0.12 : 0.42 + random() * 0.28
      case 'blossom':
        return index === 0 ? 0.9 + random() * 0.14 : 0.56 + random() * 0.32
      case 'tuft':
      default:
        return index === 0 ? 1 + random() * 0.14 : 0.6 + random() * 0.28
    }
  }

  function getFacingDirection(dir: THREE.Vector3, basisUp: THREE.Vector3) {
    switch (clusterStyle) {
      case 'classic':
        return dir.clone()
      case 'broad':
        return dir.clone().lerp(basisUp, 0.46).normalize()
      case 'airy':
        return dir.clone().lerp(basisUp, 0.38).normalize()
      case 'blossom':
        return dir.clone().lerp(basisUp, 0.3).normalize()
      case 'tuft':
      default:
        return dir.clone().lerp(basisUp, 0.16).normalize()
    }
  }

  function getPitchAngle() {
    switch (clusterStyle) {
      case 'classic':
        return 0
      case 'broad':
        return (random() - 0.4) * 0.38
      case 'airy':
        return (random() - 0.3) * 0.55
      case 'blossom':
        return (random() - 0.45) * 0.45
      case 'tuft':
      default:
        return (random() - 0.72) * 0.32
    }
  }

  function getTwistAngle() {
    switch (clusterStyle) {
      case 'classic':
        return random() * Math.PI
      case 'broad':
        return (random() - 0.5) * Math.PI * 0.4
      case 'airy':
        return (random() - 0.5) * Math.PI * 0.8
      case 'blossom':
        return random() * Math.PI
      case 'tuft':
      default:
        return random() * Math.PI
    }
  }

  for (const leaf of leaves) {
    const dir = new THREE.Vector3(
      leaf.direction.x,
      leaf.direction.y,
      leaf.direction.z
    ).normalize()
    const localUp = new THREE.Vector3(
      leaf.up.x,
      leaf.up.y,
      leaf.up.z
    ).normalize()
    const side = new THREE.Vector3().crossVectors(dir, localUp)

    if (side.lengthSq() < 1e-6) {
      side.crossVectors(dir, worldUp)
    }
    if (side.lengthSq() < 1e-6) {
      side.crossVectors(dir, worldRight)
    }
    side.normalize()

    const basisUp = new THREE.Vector3().crossVectors(side, dir).normalize()

    for (let i = 0; i < clusterCount; i++) {
      const offset = getLeafOffset(i)

      dummy.position.set(
        leaf.position.x +
          side.x * offset.side +
          basisUp.x * offset.up +
          dir.x * offset.forward,
        leaf.position.y +
          side.y * offset.side +
          basisUp.y * offset.up +
          dir.y * offset.forward,
        leaf.position.z +
          side.z * offset.side +
          basisUp.z * offset.up +
          dir.z * offset.forward
      )

      const facing = getFacingDirection(dir, basisUp)
      const quat = new THREE.Quaternion().setFromUnitVectors(worldUp, facing)
      const pitchAxis = side.clone().normalize()
      const pitch = new THREE.Quaternion().setFromAxisAngle(
        pitchAxis,
        getPitchAngle()
      )
      const twist = new THREE.Quaternion().setFromAxisAngle(
        facing,
        getTwistAngle()
      )
      quat.multiply(pitch)
      quat.multiply(twist)
      dummy.quaternion.copy(quat)

      const scale = getLeafScale(i)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      matrices.push(dummy.matrix.clone())
    }
  }

  return matrices
}

export function createPackedLeafMatrices(
  leaves: Array<LeafPoint>,
  seed: number,
  config: Pick<
    SpeciesConfig,
    'leafClusterCount' | 'leafClusterSpread' | 'leafClusterStyle'
  >
): Float32Array {
  return packMatrices(buildLeafMatrices(leaves, seed, config))
}

export function expandPackedLeafMatrices(
  treeMatrixElements: Float32Array,
  baseLeafMatrixElements: Float32Array
): Float32Array {
  if (treeMatrixElements.length === 0 || baseLeafMatrixElements.length === 0) {
    return new Float32Array()
  }

  const treeCount = treeMatrixElements.length / 16
  const baseLeafCount = baseLeafMatrixElements.length / 16
  const combined = new Float32Array(treeCount * baseLeafCount * 16)
  const treeMatrix = new THREE.Matrix4()
  const leafMatrix = new THREE.Matrix4()
  const scratchMatrix = new THREE.Matrix4()
  let offset = 0

  for (let treeIndex = 0; treeIndex < treeCount; treeIndex++) {
    treeMatrix.fromArray(treeMatrixElements, treeIndex * 16)

    for (let leafIndex = 0; leafIndex < baseLeafCount; leafIndex++) {
      leafMatrix.fromArray(baseLeafMatrixElements, leafIndex * 16)
      scratchMatrix.multiplyMatrices(treeMatrix, leafMatrix)
      combined.set(scratchMatrix.elements, offset)
      offset += 16
    }
  }

  return combined
}
