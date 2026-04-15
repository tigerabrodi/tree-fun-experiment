import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { initKTX2Loader, loadBarkTextures, loadLeafTexture } from './textures'
import { createBarkMaterial, createLeafMaterial } from './materials'
import { buildTrunkGeometry, buildLeafMesh } from './tree-mesh'
import { generateLString, interpretLString } from '@/engine/lsystem'
import type { SpeciesConfig } from '@/engine/species'

export interface SceneContext {
  renderer: THREE.WebGPURenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  rebuildTree: (config: SpeciesConfig) => Promise<void>
  dispose: () => void
}

const barkCache = new Map<
  string,
  Awaited<ReturnType<typeof loadBarkTextures>>
>()
const leafCache = new Map<string, THREE.Texture>()

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

export async function createScene(
  canvas: HTMLCanvasElement,
  initialConfig: SpeciesConfig
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
  controls.maxDistance = 100

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
  const groundGeo = new THREE.CircleGeometry(30, 64)
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

  async function rebuildTree(config: SpeciesConfig) {
    if (treeGroup) {
      scene.remove(treeGroup)
      treeGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry.dispose()
        }
      })
    }

    const group = new THREE.Group()
    const lstring = generateLString(config)
    const { segments, leaves } = interpretLString(lstring, config)

    const [barkTextures, leafTex] = await Promise.all([
      getBarkTextures(config.barkTexture),
      getLeafTexture(config.leafTexture),
    ])

    const trunkGeo = buildTrunkGeometry(segments)
    const barkMat = createBarkMaterial(barkTextures)
    group.add(new THREE.Mesh(trunkGeo, barkMat))

    if (leaves.length > 0) {
      const leafMat = createLeafMaterial(leafTex)
      group.add(buildLeafMesh(leaves, leafMat, config))
    }

    treeGroup = group
    scene.add(treeGroup)

    // Auto fit camera to tree bounds
    const box = new THREE.Box3().setFromObject(group)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = camera.fov * (Math.PI / 180)
    const dist = maxDim / (2 * Math.tan(fov / 2)) * 1.4

    controls.target.set(0, center.y, 0)
    camera.position.set(0, center.y, dist)
    controls.update()
  }

  // Build initial tree
  await rebuildTree(initialConfig)

  // Resize handler: use setViewOffset to center tree in visible area
  const PANEL_WIDTH = 380

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
  renderer.setAnimationLoop(() => {
    controls.update()
    renderer.render(scene, camera)
  })

  function dispose() {
    resizeObserver.disconnect()
    renderer.setAnimationLoop(null)
    renderer.dispose()
  }

  return { renderer, scene, camera, controls, rebuildTree, dispose }
}
