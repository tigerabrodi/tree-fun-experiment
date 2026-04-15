import * as THREE from 'three/webgpu'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { TreeSegment, LeafPoint } from '@/engine/lsystem'
import type { SpeciesConfig } from '@/engine/species'

const TUBE_RADIAL_SEGMENTS = 8

function createSeededRandom(seed: number) {
  let rng = Math.abs(Math.floor(seed)) % 2147483647
  if (rng === 0) rng = 1

  return function random(): number {
    rng = (rng * 16807) % 2147483647
    return rng / 2147483647
  }
}

function buildTubeSegment(seg: TreeSegment): THREE.BufferGeometry | null {
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
  const geos: Array<THREE.BufferGeometry> = []
  for (const seg of segments) {
    const geo = buildTubeSegment(seg)
    if (geo) geos.push(geo)
  }
  if (geos.length === 0) return new THREE.BufferGeometry()
  return mergeGeometries(geos, false)
}

function createCrossGeometry(size: number): THREE.BufferGeometry {
  const plane1 = new THREE.PlaneGeometry(size, size)
  const plane2 = new THREE.PlaneGeometry(size, size)
  plane2.rotateY(Math.PI / 2)
  return mergeGeometries([plane1, plane2], false)
}

export function buildLeafMesh(
  leaves: Array<LeafPoint>,
  material: THREE.Material,
  config: SpeciesConfig,
  seed: number
): THREE.InstancedMesh {
  const crossGeo = createCrossGeometry(config.leafSize)
  const count = leaves.length
  const mesh = new THREE.InstancedMesh(crossGeo, material, count)

  const dummy = new THREE.Object3D()
  const up = new THREE.Vector3(0, 1, 0)
  const random = createSeededRandom(seed)

  for (let i = 0; i < count; i++) {
    const leaf = leaves[i]!
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
    mesh.setMatrixAt(i, dummy.matrix)
  }

  mesh.instanceMatrix.needsUpdate = true
  return mesh
}
