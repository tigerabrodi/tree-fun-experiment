import * as THREE from 'three/webgpu'
import type { TreeSegment } from '@/engine/lsystem'
import { buildTrunkGeometry, type BuildTrunkGeometryOptions } from './tree-mesh'

export interface PackedTrunkGeometryData {
  position: Float32Array
  normal: Float32Array
  uv: Float32Array
  windWeight: Float32Array
  windPhase: Float32Array
  index: Uint16Array | Uint32Array | null
}

function copyIndexArray(
  indexArray: THREE.BufferGeometry['index']
): Uint16Array | Uint32Array | null {
  if (!indexArray) {
    return null
  }

  if (indexArray.array instanceof Uint16Array) {
    return new Uint16Array(indexArray.array)
  }

  if (indexArray.array instanceof Uint32Array) {
    return new Uint32Array(indexArray.array)
  }

  return Uint32Array.from(indexArray.array as ArrayLike<number>)
}

export function createPackedTrunkGeometryData(
  segments: Array<TreeSegment>,
  options: BuildTrunkGeometryOptions = {}
): PackedTrunkGeometryData {
  const geometry = buildTrunkGeometry(segments, options)
  const position = new Float32Array(
    geometry.getAttribute('position').array as ArrayLike<number>
  )
  const normal = new Float32Array(
    geometry.getAttribute('normal').array as ArrayLike<number>
  )
  const uv = new Float32Array(
    geometry.getAttribute('uv').array as ArrayLike<number>
  )
  const windWeight = new Float32Array(
    geometry.getAttribute('windWeight').array as ArrayLike<number>
  )
  const windPhase = new Float32Array(
    geometry.getAttribute('windPhase').array as ArrayLike<number>
  )
  const index = copyIndexArray(geometry.getIndex())

  geometry.dispose()

  return {
    position,
    normal,
    uv,
    windWeight,
    windPhase,
    index,
  }
}

export function createTrunkGeometryFromPackedData(
  data: PackedTrunkGeometryData
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normal, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2))
  geometry.setAttribute(
    'windWeight',
    new THREE.Float32BufferAttribute(data.windWeight, 1)
  )
  geometry.setAttribute(
    'windPhase',
    new THREE.Float32BufferAttribute(data.windPhase, 1)
  )

  if (data.index) {
    geometry.setIndex(new THREE.BufferAttribute(data.index, 1))
  }

  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return geometry
}
