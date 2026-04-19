import * as THREE from 'three/webgpu'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { TreeSegment, LeafPoint } from '@/engine/lsystem'
import type { SpeciesConfig } from '@/engine/species'
import { buildLeafMatrices } from './matrices'

export { buildLeafMatrices } from './matrices'

const BRANCH_CONTINUATION_DOT_MIN = 0.985
const TUBE_RADIAL_SEGMENTS = 8

export interface BuildTrunkGeometryOptions {
  radialSegments?: number
}

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
  const hashed =
    Math.sin(
      midX * 12.9898 + midY * 78.233 + midZ * 45.164 + segment.depth * 19.19
    ) * 43758.5453

  return hashed - Math.floor(hashed)
}

function pointKey(point: TreeSegment['start']): string {
  return `${point.x.toFixed(4)},${point.y.toFixed(4)},${point.z.toFixed(4)}`
}

function getSegmentDirection(segment: TreeSegment): THREE.Vector3 {
  return new THREE.Vector3(
    segment.end.x - segment.start.x,
    segment.end.y - segment.start.y,
    segment.end.z - segment.start.z
  ).normalize()
}

function canMergeSegments(a: TreeSegment, b: TreeSegment): boolean {
  if (a.depth !== b.depth) return false
  if (pointKey(a.end) !== pointKey(b.start)) return false
  if (Math.abs(a.endRadius - b.startRadius) > 1e-4) return false

  const directionDot = getSegmentDirection(a).dot(getSegmentDirection(b))
  return directionDot >= BRANCH_CONTINUATION_DOT_MIN
}

export function collapseTrunkSegments(
  segments: Array<TreeSegment>
): Array<TreeSegment> {
  if (segments.length <= 1) {
    return segments
  }

  const incoming = new Map<string, Array<number>>()
  const outgoing = new Map<string, Array<number>>()

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const startKey = pointKey(segment.start)
    const endKey = pointKey(segment.end)

    const startList = outgoing.get(startKey) ?? []
    startList.push(i)
    outgoing.set(startKey, startList)

    const endList = incoming.get(endKey) ?? []
    endList.push(i)
    incoming.set(endKey, endList)
  }

  const visited = new Set<number>()
  const collapsed: Array<TreeSegment> = []

  for (let i = 0; i < segments.length; i++) {
    if (visited.has(i)) continue

    const segment = segments[i]
    const previousCandidates = incoming.get(pointKey(segment.start)) ?? []
    const mergeablePrevious = previousCandidates.filter((candidateIndex) =>
      canMergeSegments(segments[candidateIndex], segment)
    )
    const hasMergeablePrevious = mergeablePrevious.length === 1

    if (hasMergeablePrevious) {
      continue
    }

    let lastSegment = segment
    visited.add(i)

    while (true) {
      const nextCandidates = outgoing.get(pointKey(lastSegment.end)) ?? []
      const mergeableNext = nextCandidates.filter((candidateIndex) => {
        if (visited.has(candidateIndex)) return false
        return canMergeSegments(lastSegment, segments[candidateIndex])
      })
      if (mergeableNext.length !== 1) break

      const nextIndex = mergeableNext[0]
      const nextSegment = segments[nextIndex]

      visited.add(nextIndex)
      lastSegment = nextSegment
    }

    collapsed.push({
      start: segment.start,
      end: lastSegment.end,
      startRadius: segment.startRadius,
      endRadius: lastSegment.endRadius,
      depth: segment.depth,
    })
  }

  return collapsed
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
      Math.pow(endHeight, 1.1) * 0.72 + flexibility * 0.38 + depthFactor * 0.24
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
  windProfile: TrunkWindProfile,
  radialSegments: number
): THREE.BufferGeometry | null {
  const dx = seg.end.x - seg.start.x
  const dy = seg.end.y - seg.start.y
  const dz = seg.end.z - seg.start.z
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (length < 0.001) return null

  const dir = new THREE.Vector3(dx / length, dy / length, dz / length)
  const startOverlap = Math.min(
    length * 0.32,
    Math.max(seg.startRadius, seg.endRadius) * 0.9 +
      Math.min(seg.startRadius, seg.endRadius) * 0.22
  )
  const endOverlap = Math.min(
    length * 0.26,
    seg.endRadius * 1.05 + seg.startRadius * 0.22
  )
  const joinedStart = new THREE.Vector3(
    seg.start.x - dir.x * startOverlap,
    seg.start.y - dir.y * startOverlap,
    seg.start.z - dir.z * startOverlap
  )
  const joinedEnd = new THREE.Vector3(
    seg.end.x + dir.x * endOverlap,
    seg.end.y + dir.y * endOverlap,
    seg.end.z + dir.z * endOverlap
  )
  const joinedLength = joinedStart.distanceTo(joinedEnd)
  const up = new THREE.Vector3(0, 1, 0)
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir)

  const geo = new THREE.CylinderGeometry(
    seg.endRadius,
    seg.startRadius,
    joinedLength,
    radialSegments,
    1,
    false
  )

  // Scale V so bark tiles proportionally
  const uvAttr = geo.attributes.uv
  for (let i = 0; i < uvAttr.count; i++) {
    uvAttr.setY(i, uvAttr.getY(i) * joinedLength * 2)
  }

  const posAttr = geo.attributes.position
  const windWeights = new Float32Array(posAttr.count)
  const windPhases = new Float32Array(posAttr.count)
  for (let i = 0; i < posAttr.count; i++) {
    const tipFactor = clamp01(posAttr.getY(i) / joinedLength + 0.5)
    windWeights[i] = THREE.MathUtils.lerp(
      windProfile.baseWeight,
      windProfile.tipWeight,
      tipFactor
    )
    windPhases[i] = windProfile.phase
  }
  geo.setAttribute(
    'windWeight',
    new THREE.Float32BufferAttribute(windWeights, 1)
  )
  geo.setAttribute('windPhase', new THREE.Float32BufferAttribute(windPhases, 1))

  const midX = (joinedStart.x + joinedEnd.x) / 2
  const midY = (joinedStart.y + joinedEnd.y) / 2
  const midZ = (joinedStart.z + joinedEnd.z) / 2
  geo.applyQuaternion(quat)
  geo.translate(midX, midY, midZ)

  return geo
}

export function buildTrunkGeometry(
  segments: Array<TreeSegment>,
  options: BuildTrunkGeometryOptions = {}
): THREE.BufferGeometry {
  const radialSegments = options.radialSegments ?? TUBE_RADIAL_SEGMENTS
  const collapsedSegments = collapseTrunkSegments(segments)
  const windProfiles = buildTrunkWindProfiles(collapsedSegments)
  const geos: Array<THREE.BufferGeometry> = []
  for (let i = 0; i < collapsedSegments.length; i++) {
    const geo = buildTubeSegment(
      collapsedSegments[i],
      windProfiles[i],
      radialSegments
    )
    if (geo) geos.push(geo)
  }
  if (geos.length === 0) return new THREE.BufferGeometry()
  return mergeGeometries(geos, false)
}

export function createLeafGeometry(
  size: number,
  textureType: SpeciesConfig['leafTextureType'] = 'cluster'
): THREE.BufferGeometry {
  const plane1 = new THREE.PlaneGeometry(size, size)
  if (textureType === 'single') {
    return plane1
  }
  const plane2 = new THREE.PlaneGeometry(size, size)
  plane2.rotateY(Math.PI / 2)
  return mergeGeometries([plane1, plane2], false)
}

export function buildLeafMeshFromMatrices(
  geometry: THREE.BufferGeometry,
  matrices: Array<THREE.Matrix4>,
  material: THREE.Material
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length)

  for (let i = 0; i < matrices.length; i++) {
    mesh.setMatrixAt(i, matrices[i])
  }

  mesh.instanceMatrix.needsUpdate = true
  return mesh
}

export function buildInstancedMeshFromMatrixElements(
  geometry: THREE.BufferGeometry,
  matrixElements: Float32Array,
  material: THREE.Material
): THREE.InstancedMesh {
  const instanceCount = matrixElements.length / 16
  const mesh = new THREE.InstancedMesh(geometry, material, instanceCount)

  if (instanceCount > 0) {
    mesh.instanceMatrix.array.set(matrixElements)
    mesh.instanceMatrix.needsUpdate = true
  }

  return mesh
}

export function buildLeafMesh(
  leaves: Array<LeafPoint>,
  material: THREE.Material,
  config: SpeciesConfig,
  seed: number
): THREE.InstancedMesh {
  const geometry = createLeafGeometry(config.leafSize, config.leafTextureType)
  const matrices = buildLeafMatrices(leaves, seed, config)
  return buildLeafMeshFromMatrices(geometry, matrices, material)
}
