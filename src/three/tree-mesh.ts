import * as THREE from 'three/webgpu'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { TreeSegment, LeafPoint } from '@/engine/lsystem'
import type { SpeciesConfig } from '@/engine/species'

const TUBE_RADIAL_SEGMENTS = 8

export interface TrunkWindProfile {
  baseWeight: number
  tipWeight: number
  phase: number
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function hashSegmentPhase(segment: TreeSegment): number {
  const midX = (segment.start.x + segment.end.x) * 0.5
  const midY = (segment.start.y + segment.end.y) * 0.5
  const midZ = (segment.start.z + segment.end.z) * 0.5
  const hashed = Math.sin(
    midX * 12.9898 + midY * 78.233 + midZ * 45.164 + segment.depth * 19.19
  ) * 43758.5453

  return hashed - Math.floor(hashed)
}

function createSeededRandom(seed: number) {
  let rng = Math.abs(Math.floor(seed)) % 2147483647
  if (rng === 0) rng = 1

  return function random(): number {
    rng = (rng * 16807) % 2147483647
    return rng / 2147483647
  }
}

export function buildTrunkWindProfiles(
  segments: Array<TreeSegment>
): Array<TrunkWindProfile> {
  if (segments.length === 0) {
    return []
  }

  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let maxRadius = 0
  let maxDepth = 0

  for (const segment of segments) {
    minY = Math.min(minY, segment.start.y, segment.end.y)
    maxY = Math.max(maxY, segment.start.y, segment.end.y)
    maxRadius = Math.max(maxRadius, segment.startRadius, segment.endRadius)
    maxDepth = Math.max(maxDepth, segment.depth)
  }

  const heightRange = Math.max(0.001, maxY - minY)
  const safeMaxRadius = Math.max(0.001, maxRadius)
  const safeMaxDepth = Math.max(1, maxDepth)

  return segments.map((segment) => {
    const startHeight = clamp01((segment.start.y - minY) / heightRange)
    const endHeight = clamp01((segment.end.y - minY) / heightRange)
    const thickness =
      Math.max(segment.startRadius, segment.endRadius) / safeMaxRadius
    const flexibility = Math.pow(1 - clamp01(thickness), 1.15)
    const depthFactor = segment.depth / safeMaxDepth
    const baseWeight = clamp01(
      Math.pow(startHeight, 1.35) * 0.55 +
        flexibility * 0.24 +
        depthFactor * 0.18 -
        0.05
    )
    const tipWeight = clamp01(
      Math.pow(endHeight, 1.1) * 0.72 +
        flexibility * 0.38 +
        depthFactor * 0.24
    )

    return {
      baseWeight,
      tipWeight: Math.max(baseWeight, tipWeight),
      phase: hashSegmentPhase(segment),
    }
  })
}

function buildTubeSegment(
  seg: TreeSegment,
  windProfile: TrunkWindProfile
): THREE.BufferGeometry | null {
  const dx = seg.end.x - seg.start.x
  const dy = seg.end.y - seg.start.y
  const dz = seg.end.z - seg.start.z
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (length < 0.001) return null

  const dir = new THREE.Vector3(dx / length, dy / length, dz / length)
  const up = new THREE.Vector3(0, 1, 0)
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir)

  const geo = new THREE.CylinderGeometry(
    seg.endRadius,
    seg.startRadius,
    length,
    TUBE_RADIAL_SEGMENTS,
    1,
    true
  )

  // Scale V so bark tiles proportionally
  const uvAttr = geo.attributes.uv
  for (let i = 0; i < uvAttr.count; i++) {
    uvAttr.setY(i, uvAttr.getY(i) * length * 2)
  }

  const posAttr = geo.attributes.position
  const windWeights = new Float32Array(posAttr.count)
  const windPhases = new Float32Array(posAttr.count)
  for (let i = 0; i < posAttr.count; i++) {
    const tipFactor = clamp01(posAttr.getY(i) / length + 0.5)
    windWeights[i] = THREE.MathUtils.lerp(
      windProfile.baseWeight,
      windProfile.tipWeight,
      tipFactor
    )
    windPhases[i] = windProfile.phase
  }
  geo.setAttribute('windWeight', new THREE.Float32BufferAttribute(windWeights, 1))
  geo.setAttribute('windPhase', new THREE.Float32BufferAttribute(windPhases, 1))

  const midX = (seg.start.x + seg.end.x) / 2
  const midY = (seg.start.y + seg.end.y) / 2
  const midZ = (seg.start.z + seg.end.z) / 2
  geo.applyQuaternion(quat)
  geo.translate(midX, midY, midZ)

  return geo
}

export function buildTrunkGeometry(
  segments: Array<TreeSegment>
): THREE.BufferGeometry {
  const windProfiles = buildTrunkWindProfiles(segments)
  const geos: Array<THREE.BufferGeometry> = []
  for (let i = 0; i < segments.length; i++) {
    const geo = buildTubeSegment(segments[i]!, windProfiles[i]!)
    if (geo) geos.push(geo)
  }
  if (geos.length === 0) return new THREE.BufferGeometry()
  return mergeGeometries(geos, false)
}

export function createLeafGeometry(size: number): THREE.BufferGeometry {
  const plane1 = new THREE.PlaneGeometry(size, size)
  const plane2 = new THREE.PlaneGeometry(size, size)
  plane2.rotateY(Math.PI / 2)
  return mergeGeometries([plane1, plane2], false)
}

export function buildLeafMatrices(
  leaves: Array<LeafPoint>,
  seed: number
): Array<THREE.Matrix4> {
  const matrices: Array<THREE.Matrix4> = []
  const dummy = new THREE.Object3D()
  const up = new THREE.Vector3(0, 1, 0)
  const random = createSeededRandom(seed)

  for (const leaf of leaves) {
    dummy.position.set(leaf.position.x, leaf.position.y, leaf.position.z)

    const dir = new THREE.Vector3(
      leaf.direction.x,
      leaf.direction.y,
      leaf.direction.z
    )
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir)
    const twist = new THREE.Quaternion().setFromAxisAngle(
      dir,
      random() * Math.PI
    )
    quat.multiply(twist)
    dummy.quaternion.copy(quat)

    const s = 0.72 + random() * 0.48
    dummy.scale.setScalar(s)
    dummy.updateMatrix()
    matrices.push(dummy.matrix.clone())
  }

  return matrices
}

export function buildLeafMeshFromMatrices(
  geometry: THREE.BufferGeometry,
  matrices: Array<THREE.Matrix4>,
  material: THREE.Material
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length)

  for (let i = 0; i < matrices.length; i++) {
    mesh.setMatrixAt(i, matrices[i]!)
  }

  mesh.instanceMatrix.needsUpdate = true
  return mesh
}

export function buildLeafMesh(
  leaves: Array<LeafPoint>,
  material: THREE.Material,
  config: SpeciesConfig,
  seed: number
): THREE.InstancedMesh {
  const geometry = createLeafGeometry(config.leafSize)
  const matrices = buildLeafMatrices(leaves, seed)
  return buildLeafMeshFromMatrices(geometry, matrices, material)
}
