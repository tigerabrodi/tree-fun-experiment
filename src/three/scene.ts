import {
  buildForestLayout,
  type ForestInstance,
  type ForestSettings,
} from '@/engine/forest'
import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { initKTX2Loader, loadBarkTextures, loadLeafTexture } from './textures'
import { createBarkMaterial, createLeafMaterial } from './materials'
import {
  buildLeafMatrices,
  buildLeafMeshFromMatrices,
  buildTrunkGeometry,
  createLeafGeometry,
} from './tree-mesh'
import { generateLString, interpretLString } from '@/engine/lsystem'
import type { SpeciesConfig } from '@/engine/species'
import {
  createLeafWindRuntime,
  type LeafWindRuntime,
  type WindSettings,
} from './wind'

export type ViewPreset = 'front' | 'quarter' | 'side' | 'top' | 'close'

export interface SceneContext {
  renderer: THREE.WebGPURenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  rebuildScene: (
    config: SpeciesConfig,
    forest: ForestSettings,
    wind: WindSettings,
    variationSeed: number
  ) => Promise<void>
  setViewPreset: (preset: ViewPreset) => void
  dispose: () => void
}

const barkCache = new Map<
  string,
  Awaited<ReturnType<typeof loadBarkTextures>>
>()
const leafCache = new Map<string, THREE.Texture>()

interface SceneFrame {
  center: THREE.Vector3
  size: THREE.Vector3
  forestMode: ForestSettings['mode']
}

function disposeGroupResources(group: THREE.Group) {
  const materials = new Set<THREE.Material>()

  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
      const geometry = obj.geometry as THREE.BufferGeometry
      const material = obj.material as THREE.Material | Array<THREE.Material>

      geometry.dispose()
      if (Array.isArray(material)) {
        for (const materialItem of material) {
          materials.add(materialItem)
        }
      } else {
        materials.add(material)
      }
    }
  })

  for (const material of materials) {
    material.dispose()
  }
}

async function getBarkTextures(species: string) {
  if (!barkCache.has(species)) {
    barkCache.set(species, await loadBarkTextures(species))
  }
  return barkCache.get(species)!
}

async function getLeafTexture(species: string) {
  const key = `${species}_cluster`
  if (!leafCache.has(key)) {
    leafCache.set(key, await loadLeafTexture(species, 'cluster'))
  }
  return leafCache.get(key)!
}

function createTreeMatrix(instance: ForestInstance): THREE.Matrix4 {
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

function createSceneFrame(
  box: THREE.Box3,
  forestMode: ForestSettings['mode']
): SceneFrame {
  return {
    center: box.getCenter(new THREE.Vector3()),
    size: box.getSize(new THREE.Vector3()),
    forestMode,
  }
}

function cloneSceneFrame(frame: SceneFrame): SceneFrame {
  return {
    center: frame.center.clone(),
    size: frame.size.clone(),
    forestMode: frame.forestMode,
  }
}

function applyViewPreset(
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

function buildSharedForestGroup(
  config: SpeciesConfig,
  layout: Array<ForestInstance>,
  barkMaterial: THREE.Material,
  variationSeed: number
): { group: THREE.Group; leafMatrices: Array<THREE.Matrix4> } {
  const group = new THREE.Group()
  const lstring = generateLString(config)
  const baseTree = interpretLString(lstring, config, variationSeed)
  const trunkGeometry = buildTrunkGeometry(baseTree.segments)
  const trunkMesh = new THREE.InstancedMesh(
    trunkGeometry,
    barkMaterial,
    layout.length
  )
  const treeMatrices = layout.map((item) => createTreeMatrix(item))

  for (let i = 0; i < treeMatrices.length; i++) {
    trunkMesh.setMatrixAt(i, treeMatrices[i])
  }
  trunkMesh.instanceMatrix.needsUpdate = true
  trunkMesh.computeBoundingBox()
  group.add(trunkMesh)

  const baseLeafMatrices = buildLeafMatrices(
    baseTree.leaves,
    variationSeed,
    config
  )
  const leafMatrices: Array<THREE.Matrix4> = []

  for (const treeMatrix of treeMatrices) {
    for (const baseLeafMatrix of baseLeafMatrices) {
      leafMatrices.push(treeMatrix.clone().multiply(baseLeafMatrix))
    }
  }

  return { group, leafMatrices }
}

export async function createScene(
  canvas: HTMLCanvasElement,
  initialConfig: SpeciesConfig,
  initialForest: ForestSettings,
  initialWind: WindSettings,
  initialVariationSeed: number
): Promise<SceneContext> {
  // Renderer
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  await renderer.init()

  // KTX2
  initKTX2Loader(renderer)

  // Scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0ece6)

  // Camera: zoomed out, centered on tree
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200)
  camera.position.set(0, 5, 14)

  // Controls
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.target.set(0, 3, 0)
  controls.minDistance = 2
  controls.maxDistance = 400

  // Lights: bright, natural
  const sun = new THREE.DirectionalLight(0xfff5e6, 4)
  sun.position.set(6, 14, 8)
  scene.add(sun)

  const fill = new THREE.DirectionalLight(0xddeeff, 1.5)
  fill.position.set(-6, 8, -4)
  scene.add(fill)

  const ambient = new THREE.AmbientLight(0xf5f0eb, 2.5)
  scene.add(ambient)

  const rim = new THREE.DirectionalLight(0xffeac8, 1.0)
  rim.position.set(-4, 10, -6)
  scene.add(rim)

  // Ground: soft light surface
  const groundGeo = new THREE.CircleGeometry(220, 128)
  groundGeo.rotateX(-Math.PI / 2)
  const groundMat = new THREE.MeshStandardNodeMaterial({
    color: 0xe8e2d8,
    roughness: 0.95,
    metalness: 0.0,
  })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.position.y = -0.01
  scene.add(ground)

  // Tree group
  let treeGroup: THREE.Group | null = null
  let leafWindRuntime: LeafWindRuntime | null = null
  let rebuildVersion = 0
  let currentFrame: SceneFrame | null = null

  async function rebuildScene(
    config: SpeciesConfig,
    forest: ForestSettings,
    wind: WindSettings,
    variationSeed: number
  ) {
    const version = ++rebuildVersion
    const previousFrame = currentFrame ? cloneSceneFrame(currentFrame) : null
    const cameraOffset = camera.position.clone().sub(controls.target)
    const targetOffset = previousFrame
      ? controls.target.clone().sub(previousFrame.center)
      : null

    if (treeGroup) {
      scene.remove(treeGroup)
      disposeGroupResources(treeGroup)
      treeGroup = null
    }

    if (leafWindRuntime) {
      leafWindRuntime.dispose()
      leafWindRuntime = null
    }

    const group = new THREE.Group()
    const [barkTextures, leafTex] = await Promise.all([
      getBarkTextures(config.barkTexture),
      getLeafTexture(config.leafTexture),
    ])
    const barkMat = createBarkMaterial(barkTextures, wind)
    const layout = buildForestLayout({
      mode: forest.mode,
      count: forest.count,
      radius: forest.radius,
      seed: variationSeed,
    })
    let leafMatrices: Array<THREE.Matrix4> = []

    if (forest.mode === 'giant') {
      const sharedForest = buildSharedForestGroup(
        config,
        layout,
        barkMat,
        variationSeed
      )
      group.add(sharedForest.group)
      leafMatrices = sharedForest.leafMatrices
    } else {
      const lstring = generateLString(config)

      for (const item of layout) {
        const { segments, leaves } = interpretLString(
          lstring,
          config,
          item.seed
        )
        const tree = new THREE.Group()
        tree.position.set(item.position.x, item.position.y, item.position.z)
        tree.rotation.y = item.rotationY
        tree.scale.setScalar(item.scale)

        const trunkGeo = buildTrunkGeometry(segments)
        tree.add(new THREE.Mesh(trunkGeo, barkMat))

        group.add(tree)

        if (leaves.length > 0) {
          const treeMatrix = createTreeMatrix(item)
          const baseLeafMatrices = buildLeafMatrices(leaves, item.seed, config)

          for (const baseLeafMatrix of baseLeafMatrices) {
            leafMatrices.push(treeMatrix.clone().multiply(baseLeafMatrix))
          }
        }
      }
    }

    const nextLeafWindRuntime = createLeafWindRuntime(leafMatrices, wind)

    if (nextLeafWindRuntime && leafMatrices.length > 0) {
      const leafMat = createLeafMaterial(
        leafTex,
        nextLeafWindRuntime.renderOffsetBuffer
      )
      const leafGeo = createLeafGeometry(config.leafSize)
      const leafMesh = buildLeafMeshFromMatrices(leafGeo, leafMatrices, leafMat)
      leafMesh.frustumCulled = false
      leafMesh.computeBoundingBox()
      group.add(leafMesh)
    }

    group.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(group)
    const nextFrame = createSceneFrame(box, forest.mode)

    if (version !== rebuildVersion) {
      nextLeafWindRuntime?.dispose()
      disposeGroupResources(group)
      return
    }

    leafWindRuntime = nextLeafWindRuntime
    treeGroup = group
    currentFrame = nextFrame
    scene.add(treeGroup)

    if (previousFrame && targetOffset) {
      const nextTarget = nextFrame.center.clone().add(targetOffset)
      controls.target.copy(nextTarget)
      camera.position.copy(nextTarget.clone().add(cameraOffset))
      controls.update()
    } else {
      applyViewPreset(camera, controls, nextFrame, 'quarter')
    }
  }

  // Build initial tree
  await rebuildScene(
    initialConfig,
    initialForest,
    initialWind,
    initialVariationSeed
  )

  // Resize handler: use setViewOffset to center tree in visible area
  const PANEL_WIDTH = 420

  function resize() {
    const rect = canvas.getBoundingClientRect()
    const canvasWidth = rect.width
    const canvasHeight = rect.height
    renderer.setSize(canvasWidth, canvasHeight)

    // Treat the full window as the virtual viewport.
    // The canvas only shows the right portion (after the panel).
    // By setting a view offset, the camera frustum shifts so that
    // world center appears at the visual center of the canvas.
    const fullWidth = canvasWidth + PANEL_WIDTH
    camera.aspect = fullWidth / canvasHeight
    camera.setViewOffset(
      fullWidth,
      canvasHeight,
      PANEL_WIDTH,
      0,
      canvasWidth,
      canvasHeight
    )
    camera.updateProjectionMatrix()
  }
  resize()

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)

  // Animation loop
  void renderer.setAnimationLoop(() => {
    if (leafWindRuntime) {
      // Three TSL compute nodes are weakly typed, but this is the supported path.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      void renderer.compute(leafWindRuntime.computeNode)
    }
    controls.update()
    renderer.render(scene, camera)
  })

  function dispose() {
    resizeObserver.disconnect()
    void renderer.setAnimationLoop(null)
    if (leafWindRuntime) {
      leafWindRuntime.dispose()
      leafWindRuntime = null
    }
    if (treeGroup) {
      scene.remove(treeGroup)
      disposeGroupResources(treeGroup)
      treeGroup = null
    }
    renderer.dispose()
  }

  return {
    renderer,
    scene,
    camera,
    controls,
    rebuildScene,
    setViewPreset(preset) {
      if (!currentFrame) return
      applyViewPreset(camera, controls, currentFrame, preset)
    },
    dispose,
  }
}
