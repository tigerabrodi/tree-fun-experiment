import { type ForestSettings } from '@/engine/forest'
import {
  TREE_LOD_LEVELS,
  type TreeLodLevel,
} from '@/engine/lod'
import {
  flattenNearVariants,
  type PlannedChunkLodStateMap,
} from '@/engine/rebuild-plan'
import { createRebuildWorkerClient } from '@/engine/rebuild-worker-client'
import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { initKTX2Loader } from './textures'
import { createBarkMaterial, createLeafMaterial } from './materials'
import {
  buildInstancedMeshFromMatrixElements,
  createLeafGeometry,
} from './tree-mesh'
import { createChunkDebugOverlay, type ChunkDebugBounds } from './debug-overlay'
import {
  buildChunkLodRenderState,
  buildChunkSummary,
  finalizeInstancedBounds,
  type ChunkLodRenderState,
} from './forest-render'
import { type SpeciesConfig } from '@/engine/species'
import {
  createLeafWindRuntimeFromMatrixElements,
  type LeafWindRuntime,
  type WindSettings,
} from './wind'
import { applyChunkFrustumCulling } from './culling'
import { applyChunkLod, getChunkLodLevel } from './lod'
import {
  type ChunkPerformanceSummary,
  type SceneDebugSnapshot,
  mergeScenePerformanceStats,
  summarizeGiantForestPerformance,
  summarizeSingleForestPerformance,
  type ScenePerformanceStats,
  type StaticScenePerformanceStats,
} from './performance'
import { normalizeDebugViewSettings, type DebugViewSettings } from './debug'
import {
  disposeGroupResources,
  getBarkTextures,
  getLeafTexture,
  setMaterialWireframe,
} from './scene-support'
import { summarizeLiveChunks } from './scene-chunk-summary'
import {
  applyViewPreset,
  cloneSceneFrame,
  createSceneFrame,
  type SceneFrame,
  type ViewPreset,
} from './view-frame'
import { getChunkLeafTexture, getFallbackChunkLodLevel, getInitialChunkLodLevel } from './scene-lod-support'
import { createTrunkGeometryFromPackedData } from './trunk-geometry-data'
import { getWorkerPerformanceStats } from './worker-performance'

export type { ViewPreset } from './view-frame'
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
  setDebugView: (debugView: DebugViewSettings) => void
  getDebugSnapshot: () => SceneDebugSnapshot
  dispose: () => void
}
interface ChunkRenderState {
  id: string
  group: THREE.Group
  bounds: THREE.Box3
  cellSize: number
  treeCount: number
  centerX: number
  centerZ: number
  variantCount: number
  woodDrawBatches: number
  leafAnchorCount: number
  branchSegmentCount: number
  lodLevel: TreeLodLevel
  lodStates: Partial<Record<TreeLodLevel, ChunkLodRenderState>>
  plannedLodStates?: PlannedChunkLodStateMap
  visible: boolean
}

interface ChunkBuildResources {
  barkMat: THREE.Material
  clusterLeafTex: THREE.Texture
  singleLeafTex: THREE.Texture
  wind: WindSettings
}
export async function createScene(
  canvas: HTMLCanvasElement,
  initialConfig: SpeciesConfig,
  initialForest: ForestSettings,
  initialWind: WindSettings,
  initialVariationSeed: number,
  initialDebugView: DebugViewSettings,
  onPerformanceStatsChange?: (stats: ScenePerformanceStats) => void
): Promise<SceneContext> {
  // Renderer
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true })
  const rebuildWorker = createRebuildWorkerClient()
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
  let debugOverlayGroup: THREE.Group | null = null
  let leafWindRuntimes: Array<LeafWindRuntime> = []
  let chunkRenderStates: Array<ChunkRenderState> = []
  let rebuildVersion = 0
  let currentFrame: SceneFrame | null = null
  let staticPerformanceStats: StaticScenePerformanceStats | null = null
  let currentChunkCulling = {
    visibleChunkCount: 0,
    culledChunkCount: 0,
  }
  let currentChunkLod = {
    nearChunkCount: 0,
    midChunkCount: 0,
    farChunkCount: 0,
    ultraFarChunkCount: 0,
  }
  let currentWindLod = {
    animatedChunkCount: 0,
    staticChunkCount: 0,
  }
  let currentDebugView = normalizeDebugViewSettings(initialDebugView)
  let currentDebugSnapshot: SceneDebugSnapshot = {
    performance: null,
    chunks: [],
    debugView: currentDebugView,
  }
  let frameCountSinceReport = 0
  let lastPerformanceReportTime = performance.now()
  let currentChunkBuildResources: ChunkBuildResources | null = null

  function ensureChunkLodState(
    chunk: ChunkRenderState,
    level: TreeLodLevel
  ): ChunkLodRenderState | null {
    const existing = chunk.lodStates[level]
    if (existing) {
      return existing
    }

    if (!chunk.plannedLodStates || !currentChunkBuildResources) {
      return null
    }

    const plannedLodState = chunk.plannedLodStates[level]
    const leafTexture = getChunkLeafTexture(
      plannedLodState,
      currentChunkBuildResources
    )

    if (!leafTexture) {
      return null
    }

    const builtState = buildChunkLodRenderState(
      level,
      plannedLodState,
      currentChunkBuildResources.barkMat,
      leafTexture,
      currentChunkBuildResources.wind
    )
    builtState.group.visible = false
    chunk.lodStates[level] = builtState
    chunk.group.add(builtState.group)
    chunk.group.updateMatrixWorld(true)
    chunk.bounds.union(new THREE.Box3().setFromObject(builtState.group))

    if (builtState.leafWindRuntime) {
      leafWindRuntimes.push(builtState.leafWindRuntime)
    }

    return builtState
  }

  function updateChunkVisibilityAndLod() {
    if (chunkRenderStates.length === 0) {
      currentChunkCulling = {
        visibleChunkCount: 0,
        culledChunkCount: 0,
      }
      currentChunkLod = {
        nearChunkCount: 0,
        midChunkCount: 0,
        farChunkCount: 0,
        ultraFarChunkCount: 0,
      }
      currentWindLod = {
        animatedChunkCount: 0,
        staticChunkCount: 0,
      }
      return
    }

    currentChunkCulling = applyChunkFrustumCulling(camera, chunkRenderStates)
    applyChunkLod(camera, chunkRenderStates)
    currentChunkLod = {
      nearChunkCount: 0,
      midChunkCount: 0,
      farChunkCount: 0,
      ultraFarChunkCount: 0,
    }
    currentWindLod = {
      animatedChunkCount: 0,
      staticChunkCount: 0,
    }

    for (const chunk of chunkRenderStates) {
      const builtLodState = chunk.visible
        ? ensureChunkLodState(chunk, chunk.lodLevel)
        : null
      const effectiveLodLevel = builtLodState
        ? chunk.lodLevel
        : getFallbackChunkLodLevel(chunk)

      chunk.lodLevel = effectiveLodLevel
      chunk.group.visible = chunk.visible

      for (const level of TREE_LOD_LEVELS) {
        const lodState = chunk.lodStates[level]
        if (!lodState) continue

        const isActive = chunk.visible && chunk.lodLevel === level
        lodState.group.visible = isActive
      }

      if (!chunk.visible) {
        continue
      }

      switch (chunk.lodLevel) {
        case 'near':
          currentChunkLod.nearChunkCount += 1
          break
        case 'mid':
          currentChunkLod.midChunkCount += 1
          break
        case 'far':
          currentChunkLod.farChunkCount += 1
          break
        case 'ultraFar':
          currentChunkLod.ultraFarChunkCount += 1
          break
      }

      const activeLodState = chunk.lodStates[chunk.lodLevel]
      if (activeLodState?.windMode === 'animated') {
        currentWindLod.animatedChunkCount += 1
      } else {
        currentWindLod.staticChunkCount += 1
      }
    }
  }

  function applyDebugView(nextDebugView: DebugViewSettings) {
    currentDebugView = normalizeDebugViewSettings(nextDebugView)

    if (treeGroup) {
      treeGroup.traverse((obj) => {
        if (obj.userData.treeRole === 'leaf') {
          obj.visible = !currentDebugView.showWoodOnly
        }

        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          const materials = (
            Array.isArray(obj.material) ? obj.material : [obj.material]
          ) as Array<THREE.Material>

          for (const material of materials) {
            setMaterialWireframe(material, currentDebugView.showWireframe)
          }
        }
      })
    }

    if (debugOverlayGroup) {
      debugOverlayGroup.visible = currentDebugView.showChunkBounds
    }

    currentDebugSnapshot = {
      ...currentDebugSnapshot,
      debugView: currentDebugView,
    }
    publishDebugSnapshot()
  }

  function publishDebugSnapshot() {
    if (typeof window === 'undefined') return

    window.__treeDebug = {
      snapshot: currentDebugSnapshot,
      getSnapshot: () => currentDebugSnapshot,
      async copySnapshotJson() {
        await navigator.clipboard.writeText(
          JSON.stringify(currentDebugSnapshot, null, 2)
        )
      },
      setDebugView(settings) {
        applyDebugView({ ...currentDebugView, ...settings })
      },
      setViewPreset(preset) {
        if (!currentFrame) return
        applyViewPreset(camera, controls, currentFrame, preset)
      },
    }
  }

  function reportPerformanceStats(force = false) {
    if (!staticPerformanceStats) return

    frameCountSinceReport += 1
    const now = performance.now()
    const elapsed = now - lastPerformanceReportTime

    if (!force && elapsed < 250) {
      return
    }

    const fps = elapsed > 0 ? (frameCountSinceReport * 1000) / elapsed : 0
    frameCountSinceReport = 0
    lastPerformanceReportTime = now

    const liveChunkSummaries = summarizeLiveChunks(chunkRenderStates)
    const liveLeafInstanceCount = liveChunkSummaries.reduce(
      (count, chunk) => count + chunk.leafInstanceCount,
      0
    )
    const nextStats = mergeScenePerformanceStats(staticPerformanceStats, {
      drawCalls: renderer.info.render.drawCalls,
      computeCalls: renderer.info.compute.frameCalls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      fps: Number(fps.toFixed(1)),
      visibleChunkCount: currentChunkCulling.visibleChunkCount,
      culledChunkCount: currentChunkCulling.culledChunkCount,
      nearLodChunkCount: currentChunkLod.nearChunkCount,
      midLodChunkCount: currentChunkLod.midChunkCount,
      farLodChunkCount: currentChunkLod.farChunkCount,
      ultraFarChunkCount: currentChunkLod.ultraFarChunkCount,
      windAnimatedChunkCount: currentWindLod.animatedChunkCount,
      windStaticChunkCount: currentWindLod.staticChunkCount,
    })
    nextStats.woodDrawBatches = liveChunkSummaries.reduce(
      (count, chunk) => count + chunk.woodDrawBatches,
      0
    )
    nextStats.leafDrawBatches = liveChunkSummaries.reduce(
      (count, chunk) => count + (chunk.leafInstanceCount > 0 ? 1 : 0),
      0
    )
    nextStats.leafAnchorCount = liveChunkSummaries.reduce(
      (count, chunk) => count + chunk.leafAnchorCount,
      0
    )
    nextStats.leafInstanceCount = liveLeafInstanceCount
    nextStats.branchSegmentCount = liveChunkSummaries.reduce(
      (count, chunk) => count + chunk.branchSegmentCount,
      0
    )

    currentDebugSnapshot = {
      ...currentDebugSnapshot,
      performance: nextStats,
      chunks: liveChunkSummaries,
    }
    publishDebugSnapshot()
    onPerformanceStatsChange?.(nextStats)
  }

  async function rebuildScene(
    config: SpeciesConfig,
    forest: ForestSettings,
    wind: WindSettings,
    variationSeed: number
  ) {
    const rebuildStart = performance.now()
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

    if (debugOverlayGroup) {
      scene.remove(debugOverlayGroup)
      disposeGroupResources(debugOverlayGroup)
      debugOverlayGroup = null
    }

    for (const runtime of leafWindRuntimes) {
      runtime.dispose()
    }
    leafWindRuntimes = []
    chunkRenderStates = []
    currentChunkBuildResources = null
    currentChunkCulling = {
      visibleChunkCount: 0,
      culledChunkCount: 0,
    }
    currentChunkLod = {
      nearChunkCount: 0,
      midChunkCount: 0,
      farChunkCount: 0,
      ultraFarChunkCount: 0,
    }
    currentWindLod = {
      animatedChunkCount: 0,
      staticChunkCount: 0,
    }

    const group = new THREE.Group()
    const nextLeafWindRuntimes: Array<LeafWindRuntime> = []
    const nextChunkRenderStates: Array<ChunkRenderState> = []
    const [barkTextures, clusterLeafTex, singleLeafTex, workerBuild] =
      await Promise.all([
      getBarkTextures(config.barkTexture),
      getLeafTexture(config.leafTexture, 'cluster'),
      getLeafTexture(config.leafTexture, 'single'),
      rebuildWorker.build(config, forest, variationSeed),
    ])

    if (version !== rebuildVersion) {
      return
    }

    const mainThreadBuildStart = performance.now()
    const rebuildPlan = workerBuild.plan
    const barkMat = createBarkMaterial(barkTextures, wind)
    currentChunkBuildResources = {
      barkMat,
      clusterLeafTex,
      singleLeafTex,
      wind,
    }
    const layout = rebuildPlan.layout
    const chunkPlan = rebuildPlan.chunkPlan
    const nextChunkBounds: Array<ChunkDebugBounds> = []
    let nextStaticPerformanceStats: StaticScenePerformanceStats
    let nextDebugChunks: Array<ChunkPerformanceSummary> = []

    if (rebuildPlan.kind === 'giant') {
      const allVariants = flattenNearVariants(rebuildPlan.chunks)

      for (const chunk of rebuildPlan.chunks) {
        const chunkGroup = new THREE.Group()
        const lodStates: Partial<Record<TreeLodLevel, ChunkLodRenderState>> = {}
        const initialLevel = getInitialChunkLodLevel(
          camera.position,
          new THREE.Vector3(chunk.center.x, 0, chunk.center.z),
          chunk.cellSize,
          getChunkLodLevel
        )
        const initialPlannedState = chunk.lodStates[initialLevel]
        const initialLeafTexture =
          initialPlannedState.variants[0].renderConfig.leafTextureType === 'single'
            ? singleLeafTex
            : clusterLeafTex
        const initialLodState = buildChunkLodRenderState(
          initialLevel,
          initialPlannedState,
          barkMat,
          initialLeafTexture,
          wind
        )

        initialLodState.group.visible = true
        lodStates[initialLevel] = initialLodState
        chunkGroup.add(initialLodState.group)

        if (initialLodState.leafWindRuntime) {
          nextLeafWindRuntimes.push(initialLodState.leafWindRuntime)
        }

        chunkGroup.updateMatrixWorld(true)
        const chunkBounds = new THREE.Box3().setFromObject(chunkGroup)
        nextChunkBounds.push({
          id: chunk.id,
          box: chunkBounds.clone(),
        })
        nextChunkRenderStates.push({
          id: chunk.id,
          group: chunkGroup,
          bounds: chunkBounds,
          cellSize: chunk.cellSize,
          treeCount: chunk.instances.length,
          centerX: chunk.center.x,
          centerZ: chunk.center.z,
          variantCount: chunk.lodStates.near.variants.length,
          woodDrawBatches: chunk.lodStates.near.variants.length,
          leafAnchorCount: chunk.lodStates.near.variants.reduce(
            (count, variant) =>
              count + variant.blueprint.leaves.length * variant.instances.length,
            0
          ),
          branchSegmentCount: chunk.lodStates.near.variants.reduce(
            (count, variant) =>
              count + variant.blueprint.segments.length * variant.instances.length,
            0
          ),
          lodLevel: initialLevel,
          lodStates,
          plannedLodStates: chunk.lodStates,
          visible: true,
        })

        nextDebugChunks.push(
          buildChunkSummary(
            chunk,
            chunk.lodStates.near.variants,
            lodStates.near?.leafInstanceCount ?? 0
          )
        )
        group.add(chunkGroup)
      }

      const rebuildMs = performance.now() - rebuildStart
      nextStaticPerformanceStats = summarizeGiantForestPerformance({
        forestMode: forest.mode,
        layout,
        variants: allVariants,
        chunks: nextDebugChunks,
        leafInstanceCount: nextDebugChunks.reduce(
          (count, chunk) => count + chunk.leafInstanceCount,
          0
        ),
        ...getWorkerPerformanceStats(workerBuild),
        mainThreadBuildMs: performance.now() - mainThreadBuildStart,
        rebuildMs,
        chunkCellSize: chunkPlan.cellSize,
      })
    } else {
      const blueprints = rebuildPlan.blueprints
      const leafMatrixElements = rebuildPlan.leafMatrixElements
      const trunkGeometryData = rebuildPlan.trunkGeometryData

      for (let i = 0; i < layout.length; i++) {
        const item = layout[i]
        const tree = new THREE.Group()
        tree.position.set(item.position.x, item.position.y, item.position.z)
        tree.rotation.y = item.rotationY
        tree.scale.setScalar(item.scale)

        const trunkGeo = createTrunkGeometryFromPackedData(trunkGeometryData[i])
        const trunkMesh = new THREE.Mesh(trunkGeo, barkMat)
        trunkMesh.userData.treeRole = 'wood'
        tree.add(trunkMesh)

        group.add(tree)
      }

      const nextLeafWindRuntime = createLeafWindRuntimeFromMatrixElements(
        leafMatrixElements,
        wind
      )

      if (nextLeafWindRuntime && leafMatrixElements.length > 0) {
        const leafMat = createLeafMaterial(
          clusterLeafTex,
          nextLeafWindRuntime.renderOffsetBuffer
        )
        const leafGeo = createLeafGeometry(
          config.leafSize,
          config.leafTextureType
        )
        const leafMesh = buildInstancedMeshFromMatrixElements(
          leafGeo,
          leafMatrixElements,
          leafMat
        )
        leafMesh.userData.treeRole = 'leaf'
        leafMesh.frustumCulled = false
        finalizeInstancedBounds(
          leafMesh,
          config.leafSize * (wind.strength + 0.5)
        )
        group.add(leafMesh)
        nextLeafWindRuntimes.push(nextLeafWindRuntime)
      } else {
        nextLeafWindRuntime?.dispose()
      }

      const rebuildMs = performance.now() - rebuildStart
      group.updateMatrixWorld(true)
      const chunkBounds = new THREE.Box3().setFromObject(group)
      nextChunkBounds.push({
        id: '0:0',
        box: chunkBounds.clone(),
      })
      nextChunkRenderStates.push({
        id: '0:0',
        group,
        bounds: chunkBounds,
        cellSize: chunkPlan.cellSize,
        treeCount: layout.length,
        centerX: 0,
        centerZ: 0,
        variantCount: blueprints.length,
        woodDrawBatches: blueprints.length,
        leafAnchorCount: blueprints.reduce(
          (count, blueprint) => count + blueprint.leaves.length,
          0
        ),
        branchSegmentCount: blueprints.reduce(
          (count, blueprint) => count + blueprint.segments.length,
          0
        ),
        lodLevel: 'near',
        lodStates: {
          near: {
            group,
            leafWindRuntime: nextLeafWindRuntime ?? null,
            leafInstanceCount: leafMatrixElements.length / 16,
            windMode: nextLeafWindRuntime?.windMode ?? 'static',
          },
        },
        visible: true,
      })
      nextDebugChunks = [
        {
          id: '0:0',
          treeCount: layout.length,
          variantCount: blueprints.length,
          woodDrawBatches: blueprints.length,
          woodInstanceCount: layout.length,
          leafAnchorCount: blueprints.reduce(
            (count, blueprint) => count + blueprint.leaves.length,
            0
          ),
          leafInstanceCount: leafMatrixElements.length / 16,
          branchSegmentCount: blueprints.reduce(
            (count, blueprint) => count + blueprint.segments.length,
            0
          ),
          cellSize: chunkPlan.cellSize,
          centerX: 0,
          centerZ: 0,
          visible: true,
          lodLevel: 'near',
        },
      ]

      nextStaticPerformanceStats = summarizeSingleForestPerformance({
        forestMode: forest.mode,
        layout,
        blueprints,
        leafInstanceCount: leafMatrixElements.length / 16,
        ...getWorkerPerformanceStats(workerBuild),
        mainThreadBuildMs: performance.now() - mainThreadBuildStart,
        rebuildMs,
        chunkCellSize: chunkPlan.cellSize,
      })
    }

    group.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(group)
    const nextFrame = createSceneFrame(box, forest.mode)
    const nextDebugOverlayGroup = createChunkDebugOverlay(nextChunkBounds)

    if (version !== rebuildVersion) {
      for (const runtime of nextLeafWindRuntimes) {
        runtime.dispose()
      }
      disposeGroupResources(group)
      disposeGroupResources(nextDebugOverlayGroup)
      return
    }

    leafWindRuntimes = nextLeafWindRuntimes
    chunkRenderStates = nextChunkRenderStates
    treeGroup = group
    debugOverlayGroup = nextDebugOverlayGroup
    currentFrame = nextFrame
    staticPerformanceStats = nextStaticPerformanceStats
    currentDebugSnapshot = {
      performance: currentDebugSnapshot.performance,
      chunks: nextDebugChunks,
      debugView: currentDebugView,
    }
    publishDebugSnapshot()
    scene.add(treeGroup)
    scene.add(debugOverlayGroup)
    applyDebugView(currentDebugView)
    updateChunkVisibilityAndLod()

    if (previousFrame && targetOffset) {
      const nextTarget = nextFrame.center.clone().add(targetOffset)
      controls.target.copy(nextTarget)
      camera.position.copy(nextTarget.clone().add(cameraOffset))
      controls.update()
    } else {
      applyViewPreset(camera, controls, nextFrame, 'quarter')
    }

    reportPerformanceStats(true)
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
    controls.update()
    updateChunkVisibilityAndLod()

    for (const chunk of chunkRenderStates) {
      const activeLodState = chunk.lodStates[chunk.lodLevel]

      if (
        !chunk.visible ||
        !activeLodState?.leafWindRuntime ||
        !activeLodState.leafWindRuntime.computeNode
      ) {
        continue
      }

      void renderer.compute(
        activeLodState.leafWindRuntime.computeNode as THREE.ComputeNode
      )
    }
    renderer.render(scene, camera)
    reportPerformanceStats()
  })

  function dispose() {
    resizeObserver.disconnect()
    void renderer.setAnimationLoop(null)
    rebuildWorker.dispose()
    for (const runtime of leafWindRuntimes) {
      runtime.dispose()
    }
    leafWindRuntimes = []
    chunkRenderStates = []
    currentChunkCulling = {
      visibleChunkCount: 0,
      culledChunkCount: 0,
    }
    currentChunkLod = {
      nearChunkCount: 0,
      midChunkCount: 0,
      farChunkCount: 0,
      ultraFarChunkCount: 0,
    }
    currentWindLod = {
      animatedChunkCount: 0,
      staticChunkCount: 0,
    }
    if (treeGroup) {
      scene.remove(treeGroup)
      disposeGroupResources(treeGroup)
      treeGroup = null
    }
    if (debugOverlayGroup) {
      scene.remove(debugOverlayGroup)
      disposeGroupResources(debugOverlayGroup)
      debugOverlayGroup = null
    }
    currentDebugSnapshot = {
      performance: null,
      chunks: [],
      debugView: currentDebugView,
    }
    publishDebugSnapshot()
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
    setDebugView(debugView) {
      applyDebugView(debugView)
    },
    getDebugSnapshot() {
      return currentDebugSnapshot
    },
    dispose,
  }
}
