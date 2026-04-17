import type { ForestSettings } from '@/engine/forest'
import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export type ViewPreset = 'front' | 'quarter' | 'side' | 'top' | 'close'

export interface SceneFrame {
  center: THREE.Vector3
  size: THREE.Vector3
  forestMode: ForestSettings['mode']
}

export function createSceneFrame(
  box: THREE.Box3,
  forestMode: ForestSettings['mode']
): SceneFrame {
  return {
    center: box.getCenter(new THREE.Vector3()),
    size: box.getSize(new THREE.Vector3()),
    forestMode,
  }
}

export function cloneSceneFrame(frame: SceneFrame): SceneFrame {
  return {
    center: frame.center.clone(),
    size: frame.size.clone(),
    forestMode: frame.forestMode,
  }
}

export function applyViewPreset(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  frame: SceneFrame,
  preset: ViewPreset
) {
  const maxDim = Math.max(frame.size.x, frame.size.y, frame.size.z)
  const fov = camera.fov * (Math.PI / 180)
  const dist = (maxDim / (2 * Math.tan(fov / 2))) * 1.4
  const target = frame.center.clone()

  if (frame.forestMode === 'giant') {
    target.y *= 0.55
  }

  let offset: THREE.Vector3

  switch (preset) {
    case 'front':
      offset = new THREE.Vector3(0, maxDim * 0.06, dist)
      break
    case 'side':
      offset = new THREE.Vector3(dist, maxDim * 0.06, 0)
      break
    case 'top':
      offset =
        frame.forestMode === 'giant'
          ? new THREE.Vector3(dist * 0.05, dist * 1.15, dist * 0.05)
          : new THREE.Vector3(dist * 0.04, dist * 1.12, dist * 0.04)
      break
    case 'close':
      offset =
        frame.forestMode === 'giant'
          ? new THREE.Vector3(dist * 0.16, maxDim * 0.04, dist * 0.42)
          : new THREE.Vector3(dist * 0.18, maxDim * 0.05, dist * 0.48)
      break
    case 'quarter':
    default:
      offset =
        frame.forestMode === 'giant'
          ? new THREE.Vector3(dist * 0.32, maxDim * 0.08, dist * 0.9)
          : new THREE.Vector3(dist * 0.4, maxDim * 0.08, dist * 0.92)
      break
  }

  controls.target.copy(target)
  camera.position.copy(target.clone().add(offset))
  controls.update()
}
