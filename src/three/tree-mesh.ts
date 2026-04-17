import * as THREE from 'three/webgpu'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { TreeSegment, LeafPoint } from '@/engine/lsystem'
import type { SpeciesConfig } from '@/engine/species'

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

function createSeededRandom(seed: number) {
  let rng = Math.abs(Math.floor(seed)) % 2147483647
  if (rng === 0) rng = 1

  return function random(): number {
    rng = (rng * 16807) % 2147483647
    return rng / 2147483647
  }
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
    const outgoingFromStart = outgoing.get(pointKey(segment.start)) ?? []
    const hasMergeablePrevious =
      previousCandidates.length === 1 &&
      outgoingFromStart.length === 1 &&
      canMergeSegments(segments[previousCandidates[0]], segment)

    if (hasMergeablePrevious) {
      continue
    }

    let lastSegment = segment
    visited.add(i)

    while (true) {
      const nextCandidates = outgoing.get(pointKey(lastSegment.end)) ?? []
      if (nextCandidates.length !== 1) break

      const nextIndex = nextCandidates[0]
      if (visited.has(nextIndex)) break

      const nextSegment = segments[nextIndex]
      if (!canMergeSegments(lastSegment, nextSegment)) break

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
    length * 0.28,
    Math.max(seg.startRadius, seg.endRadius) * 0.75 +
      Math.min(seg.startRadius, seg.endRadius) * 0.18
  )
  const endOverlap = Math.min(
    length * 0.18,
    seg.endRadius * 0.55 + seg.startRadius * 0.08
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
          up: (random() - 0.24) * clusterSpread * 0.68,
          forward: (random() - 0.08) * clusterSpread * 1.15,
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
        return index === 0 ? 0.94 + random() * 0.16 : 0.62 + random() * 0.3
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
        return dir.clone().lerp(basisUp, 0.06).normalize()
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
        return (random() - 0.5) * 0.2
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

      const s = getLeafScale(i)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      matrices.push(dummy.matrix.clone())
    }
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
    mesh.setMatrixAt(i, matrices[i])
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
  const geometry = createLeafGeometry(config.leafSize, config.leafTextureType)
  const matrices = buildLeafMatrices(leaves, seed, config)
  return buildLeafMeshFromMatrices(geometry, matrices, material)
}
