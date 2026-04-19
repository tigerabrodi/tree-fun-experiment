import * as THREE from 'three/webgpu'
import {
  applyExploreLookDelta,
  stepExploreJumpMovement,
  stepExplorePlanarMovement,
  type ExploreJumpState,
  type ExploreLookState,
  type ExplorePlanarMovementState,
} from './fps-camera'
import {
  EXPLORE_TERRAIN_CACHE_RADIUS,
  EXPLORE_TERRAIN_TILE_SIZE,
  getExploreTerrainCellIndex,
} from './terrain-config'
import {
  createExploreTerrainHeightSampler,
} from './terrain-height'
import {
  createExploreTerrainMaterial,
  createExploreTerrainTileGeometryFromHeightGrid,
  loadExploreTerrainTextures,
  type ExploreTerrainTextures,
} from './terrain'
import {
  buildExploreOakTileFromPlan,
  createExploreOakWorldResources,
  disposeExploreOakWorldResources,
  type ExploreOakWorldResources,
} from './oak-world'
import {
  createExploreTileWorkerClient,
  type ExploreTileWorkerClient,
} from './tile-worker-client'
import type {
  ExploreTileBuildRequest,
  ExploreTilePlan,
  ExploreOakLodLevel,
} from './tile-plan'
import { initKTX2Loader } from '@/three/textures'
import { DEFAULT_TREE_ASSET_PACK } from '@/lib/assets'

export interface ExploreWorldStats {
  activeTileCount: number
  activeTreeCount: number
  isPointerLocked: boolean
  playerX: number
  playerY: number
  playerZ: number
  seed: number
  variantCount: number
  midTileCount: number
  farTileCount: number
  ultraFarTileCount: number
  pendingTileCount: number
  drawCalls: number
  computeCalls: number
  triangles: number
  geometries: number
  textures: number
  fps: number
}

export interface ExploreSceneOptions {
  canvas: HTMLCanvasElement
  seed: number
  onStatsChange?: (stats: ExploreWorldStats) => void
}

export interface ExploreSceneHandle {
  regenerate: (seed?: number) => Promise<number>
  resetPlayer: () => void
  getStats: () => ExploreWorldStats
  dispose: () => void
}

interface ExploreTileState {
  key: string
  gridX: number
  gridZ: number
  ringDistance: number
  group: THREE.Group
  terrainMesh: THREE.Mesh
  treeCount: number
  lodLevel: ExploreOakLodLevel
}

const MAX_TILE_BUILDS_PER_FRAME = 1
const MAX_IN_FLIGHT_TILE_BATCHES = 1
const MAX_TILE_REQUESTS_PER_BATCH = 5

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.tagName === 'BUTTON'
  )
}

export async function createExploreScene(
  options: ExploreSceneOptions
): Promise<ExploreSceneHandle> {
  const renderer = new THREE.WebGPURenderer({
    canvas: options.canvas,
    antialias: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  await renderer.init()
  initKTX2Loader(renderer, DEFAULT_TREE_ASSET_PACK.transcoderPath)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xd9dfdf)
  scene.fog = new THREE.Fog(0xd9dfdf, 95, 220)

  const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 260)

  const sun = new THREE.DirectionalLight(0xfff2d8, 2.7)
  sun.position.set(18, 28, 12)
  scene.add(sun)

  const fill = new THREE.HemisphereLight(0xb3cde0, 0x5c574f, 1.8)
  scene.add(fill)

  const ambient = new THREE.AmbientLight(0xcad0c6, 0.65)
  scene.add(ambient)

  const timer = new THREE.Timer()
  const playerHeight = 2.25
  const walkSpeed = 12
  const sprintSpeed = 21
  const movementAcceleration = 12
  const movementDeceleration = 9
  const jumpSpeed = 5.2
  const gravity = 18
  const lookSensitivity = 0.0022
  const maxPitch = Math.PI * 0.46
  let currentSeed = options.seed
  let sampleHeight = createExploreTerrainHeightSampler(currentSeed)
  let currentLook: ExploreLookState = {
    pitch: -0.06,
    yaw: -Math.PI / 2,
  }
  let currentMovement: ExplorePlanarMovementState = {
    positionX: 0,
    positionZ: 18,
    velocityX: 0,
    velocityZ: 0,
  }
  let currentJump: ExploreJumpState = {
    isGrounded: true,
    positionY: sampleHeight(0, 18) + playerHeight,
    velocityY: 0,
  }
  let isPointerLocked = false
  const pressedKeys = new Set<string>()
  let terrainTextures: ExploreTerrainTextures | null = null
  let terrainMaterial: THREE.MeshStandardNodeMaterial | null = null
  let oakResources: ExploreOakWorldResources | null = null
  const tileWorker: ExploreTileWorkerClient = createExploreTileWorkerClient()
  const tiles = new Map<string, ExploreTileState>()
  let queuedTileRequests: Array<ExploreTileBuildRequest> = []
  const queuedTileRequestKeys = new Set<string>()
  let readyTilePlans: Array<ExploreTilePlan> = []
  const readyTilePlanKeys = new Set<string>()
  const inFlightTilePlanKeys = new Set<string>()
  const desiredTileKeys = new Set<string>()
  const desiredTileRingDistances = new Map<string, number>()
  let worldVersion = 0
  let inFlightTilePlanBatchCount = 0
  const queueWaiters = new Set<() => void>()
  let activeTreeCount = 0
  let isDisposed = false
  let frameCountSinceReport = 0
  let lastReportTime = performance.now()
  let currentDrawCalls = 0
  let currentComputeCalls = 0
  let currentTriangles = 0
  let currentGeometries = 0
  let currentTextures = 0
  let currentFps = 0
  let lastStats: ExploreWorldStats = {
    activeTileCount: 0,
    activeTreeCount: 0,
    isPointerLocked: false,
    playerX: currentMovement.positionX,
    playerY: currentJump.positionY,
    playerZ: currentMovement.positionZ,
    seed: currentSeed,
    variantCount: 0,
    midTileCount: 0,
    farTileCount: 0,
    ultraFarTileCount: 0,
    pendingTileCount: 0,
    drawCalls: 0,
    computeCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    fps: 0,
  }

  function updateCameraLook() {
    const pitchCosine = Math.cos(currentLook.pitch)
    const forwardX = pitchCosine * Math.cos(currentLook.yaw)
    const forwardY = Math.sin(currentLook.pitch)
    const forwardZ = pitchCosine * Math.sin(currentLook.yaw)

    camera.position.set(
      currentMovement.positionX,
      currentJump.positionY,
      currentMovement.positionZ
    )
    camera.lookAt(
      camera.position.x + forwardX * 8,
      camera.position.y + forwardY * 8,
      camera.position.z + forwardZ * 8
    )
  }

  function getStats(): ExploreWorldStats {
    let midTileCount = 0
    let farTileCount = 0
    let ultraFarTileCount = 0

    for (const tile of tiles.values()) {
      if (tile.lodLevel === 'mid') {
        midTileCount += 1
      } else if (tile.lodLevel === 'far') {
        farTileCount += 1
      } else {
        ultraFarTileCount += 1
      }
    }

    return {
      activeTileCount: tiles.size,
      activeTreeCount,
      isPointerLocked,
      playerX: currentMovement.positionX,
      playerY: currentJump.positionY,
      playerZ: currentMovement.positionZ,
      seed: currentSeed,
      variantCount: oakResources?.variants.length ?? 0,
      midTileCount,
      farTileCount,
      ultraFarTileCount,
      pendingTileCount:
        queuedTileRequests.length +
        readyTilePlans.length +
        inFlightTilePlanKeys.size,
      drawCalls: currentDrawCalls,
      computeCalls: currentComputeCalls,
      triangles: currentTriangles,
      geometries: currentGeometries,
      textures: currentTextures,
      fps: currentFps,
    }
  }

  function reportStats(force = false) {
    frameCountSinceReport += 1
    const now = performance.now()

    if (!force && frameCountSinceReport < 8 && now - lastReportTime < 180) {
      return
    }

    const elapsed = now - lastReportTime
    const fps = elapsed > 0 ? (frameCountSinceReport * 1000) / elapsed : 0
    frameCountSinceReport = 0
    lastReportTime = now
    currentDrawCalls = renderer.info.render.drawCalls
    currentComputeCalls = renderer.info.compute.frameCalls
    currentTriangles = renderer.info.render.triangles
    currentGeometries = renderer.info.memory.geometries
    currentTextures = renderer.info.memory.textures
    currentFps = Number(fps.toFixed(1))
    lastStats = getStats()

    if (options.onStatsChange) {
      options.onStatsChange(lastStats)
    }
  }

  function publishImmediateStats() {
    lastStats = getStats()

    if (options.onStatsChange) {
      options.onStatsChange(lastStats)
    }
  }

  function getTileKey(gridX: number, gridZ: number) {
    return `${gridX}:${gridZ}`
  }

  function notifyQueueWaiters() {
    for (const resolve of queueWaiters) {
      resolve()
    }
    queueWaiters.clear()
  }

  function disposeTile(tile: ExploreTileState, publish = true) {
    scene.remove(tile.group)
    tile.terrainMesh.geometry.dispose()
    tiles.delete(tile.key)
    activeTreeCount -= tile.treeCount

    if (publish) {
      publishImmediateStats()
    }
  }

  function buildTileFromPlan(plan: ExploreTilePlan): ExploreTileState | null {
    if (!terrainMaterial || !oakResources) {
      return null
    }

    const centerX = plan.gridX * EXPLORE_TERRAIN_TILE_SIZE
    const centerZ = plan.gridZ * EXPLORE_TERRAIN_TILE_SIZE
    const terrainGeometry = createExploreTerrainTileGeometryFromHeightGrid(
      plan.terrainSegments,
      plan.terrainHeights
    )
    const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial)
    terrainMesh.position.set(centerX, 0, centerZ)
    terrainMesh.receiveShadow = false
    terrainMesh.castShadow = false

    const tileTrees = buildExploreOakTileFromPlan(plan, oakResources)
    const group = new THREE.Group()
    group.add(terrainMesh)
    group.add(tileTrees.group)
    group.updateMatrixWorld(true)
    scene.add(group)

    return {
      key: plan.key,
      gridX: plan.gridX,
      gridZ: plan.gridZ,
      ringDistance: plan.ringDistance,
      group,
      terrainMesh,
      treeCount: tileTrees.treeCount,
      lodLevel: plan.lodLevel,
    }
  }

  function pruneObsoleteTiles(force = false) {
    if (
      !force &&
      (queuedTileRequests.length > 0 ||
        readyTilePlans.length > 0 ||
        inFlightTilePlanKeys.size > 0)
    ) {
      return
    }

    for (const tile of Array.from(tiles.values())) {
      if (!desiredTileKeys.has(tile.key)) {
        disposeTile(tile)
      }
    }
  }

  function scheduleVisibleTiles() {
    if (!terrainMaterial || !oakResources) {
      return
    }

    const centerGridX = getExploreTerrainCellIndex(currentMovement.positionX)
    const centerGridZ = getExploreTerrainCellIndex(currentMovement.positionZ)
    const nextDesiredKeys = new Set<string>()
    const nextDesiredRingDistances = new Map<string, number>()
    const freshRequests: Array<ExploreTileBuildRequest> = []
    let hasTileStateChange = false

    for (
      let offsetX = -EXPLORE_TERRAIN_CACHE_RADIUS;
      offsetX <= EXPLORE_TERRAIN_CACHE_RADIUS;
      offsetX += 1
    ) {
      for (
        let offsetZ = -EXPLORE_TERRAIN_CACHE_RADIUS;
        offsetZ <= EXPLORE_TERRAIN_CACHE_RADIUS;
        offsetZ += 1
      ) {
        const gridX = centerGridX + offsetX
        const gridZ = centerGridZ + offsetZ
        const key = getTileKey(gridX, gridZ)
        const ringDistance = Math.max(Math.abs(offsetX), Math.abs(offsetZ))
        nextDesiredKeys.add(key)
        nextDesiredRingDistances.set(key, ringDistance)

        const existingTile = tiles.get(key)

        if (existingTile && existingTile.ringDistance === ringDistance) {
          continue
        }

        if (
          queuedTileRequestKeys.has(key) ||
          readyTilePlanKeys.has(key) ||
          inFlightTilePlanKeys.has(key)
        ) {
          continue
        }

        freshRequests.push({
          key,
          gridX,
          gridZ,
          ringDistance,
        })
      }
    }

    desiredTileKeys.clear()
    for (const key of nextDesiredKeys) {
      desiredTileKeys.add(key)
    }
    desiredTileRingDistances.clear()
    for (const [key, ringDistance] of nextDesiredRingDistances) {
      desiredTileRingDistances.set(key, ringDistance)
    }

    queuedTileRequests = queuedTileRequests.filter(
      (request) =>
        desiredTileKeys.has(request.key) &&
        desiredTileRingDistances.get(request.key) === request.ringDistance
    )
    queuedTileRequestKeys.clear()
    for (const request of queuedTileRequests) {
      queuedTileRequestKeys.add(request.key)
    }

    readyTilePlans = readyTilePlans.filter(
      (plan) =>
        desiredTileKeys.has(plan.key) &&
        desiredTileRingDistances.get(plan.key) === plan.ringDistance
    )
    readyTilePlanKeys.clear()
    for (const plan of readyTilePlans) {
      readyTilePlanKeys.add(plan.key)
    }

    freshRequests.sort((a, b) => {
      if (a.ringDistance !== b.ringDistance) {
        return a.ringDistance - b.ringDistance
      }

      const aDistance = Math.hypot(
        a.gridX - centerGridX,
        a.gridZ - centerGridZ
      )
      const bDistance = Math.hypot(
        b.gridX - centerGridX,
        b.gridZ - centerGridZ
      )

      return aDistance - bDistance
    })

    for (const request of freshRequests) {
      queuedTileRequests.push(request)
      queuedTileRequestKeys.add(request.key)
      hasTileStateChange = true
    }

    for (const tile of tiles.values()) {
      if (!desiredTileKeys.has(tile.key)) {
        hasTileStateChange = true
        break
      }
    }

    requestPendingTilePlans()
    pruneObsoleteTiles()

    if (hasTileStateChange) {
      publishImmediateStats()
    }
  }

  function requestPendingTilePlans() {
    if (!oakResources) {
      return
    }

    while (
      inFlightTilePlanBatchCount < MAX_IN_FLIGHT_TILE_BATCHES &&
      queuedTileRequests.length > 0
    ) {
      const requestBatch = queuedTileRequests.splice(0, MAX_TILE_REQUESTS_PER_BATCH)

      for (const request of requestBatch) {
        queuedTileRequestKeys.delete(request.key)
        inFlightTilePlanKeys.add(request.key)
      }

      inFlightTilePlanBatchCount += 1
      publishImmediateStats()
      const requestVersion = worldVersion

      void tileWorker
        .buildTiles(currentSeed, oakResources.variants.length, requestBatch)
        .then((result) => {
          if (isDisposed || requestVersion !== worldVersion) {
            return
          }

          for (const plan of result.plans) {
            inFlightTilePlanKeys.delete(plan.key)

            if (
              !desiredTileKeys.has(plan.key) ||
              desiredTileRingDistances.get(plan.key) !== plan.ringDistance
            ) {
              continue
            }

            readyTilePlans.push(plan)
            readyTilePlanKeys.add(plan.key)
          }

          publishImmediateStats()
        })
        .catch(() => {
          for (const request of requestBatch) {
            inFlightTilePlanKeys.delete(request.key)
          }

          publishImmediateStats()
        })
        .finally(() => {
          inFlightTilePlanBatchCount = Math.max(
            0,
            inFlightTilePlanBatchCount - 1
          )
          notifyQueueWaiters()
          requestPendingTilePlans()
          pruneObsoleteTiles()
          publishImmediateStats()
        })
    }
  }

  function flushReadyTilePlans(buildAll = false) {
    let buildsRemaining = buildAll ? Number.POSITIVE_INFINITY : MAX_TILE_BUILDS_PER_FRAME

    while (buildsRemaining > 0 && readyTilePlans.length > 0) {
      const plan = readyTilePlans.shift()

      if (!plan) {
        break
      }

      readyTilePlanKeys.delete(plan.key)

      if (
        !desiredTileKeys.has(plan.key) ||
        desiredTileRingDistances.get(plan.key) !== plan.ringDistance
      ) {
        continue
      }

      const tile = buildTileFromPlan(plan)

      if (!tile) {
        break
      }

      const existingTile = tiles.get(tile.key)

      if (existingTile) {
        disposeTile(existingTile, false)
      }

      tiles.set(tile.key, tile)
      activeTreeCount += tile.treeCount
      buildsRemaining -= 1
      publishImmediateStats()
    }

    pruneObsoleteTiles()
  }

  function waitForTileQueueToSettle(): Promise<void> {
    requestPendingTilePlans()
    flushReadyTilePlans(true)

    if (
      queuedTileRequests.length === 0 &&
      readyTilePlans.length === 0 &&
      inFlightTilePlanKeys.size === 0
    ) {
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      queueWaiters.add(resolve)
    }).then(() => waitForTileQueueToSettle())
  }

  async function loadWorld(seed: number, resetToSpawn = false) {
    worldVersion += 1

    for (const tile of Array.from(tiles.values())) {
      disposeTile(tile, false)
    }
    activeTreeCount = 0

    terrainTextures?.basecolor.dispose()
    terrainTextures?.height.dispose()
    terrainTextures?.metalness.dispose()
    terrainTextures?.normal.dispose()
    terrainTextures?.roughness.dispose()
    terrainTextures = null

    terrainMaterial?.dispose()
    terrainMaterial = null

    if (oakResources) {
      disposeExploreOakWorldResources(oakResources)
      oakResources = null
    }

    currentSeed = seed
    sampleHeight = createExploreTerrainHeightSampler(seed)
    desiredTileKeys.clear()
    desiredTileRingDistances.clear()
    queuedTileRequests = []
    queuedTileRequestKeys.clear()
    readyTilePlans = []
    readyTilePlanKeys.clear()
    inFlightTilePlanKeys.clear()
    inFlightTilePlanBatchCount = 0

    if (resetToSpawn) {
      currentMovement = {
        positionX: 0,
        positionZ: 18,
        velocityX: 0,
        velocityZ: 0,
      }
      currentJump = {
        isGrounded: true,
        positionY: sampleHeight(0, 18) + playerHeight,
        velocityY: 0,
      }
      currentLook = {
        pitch: -0.06,
        yaw: -Math.PI / 2,
      }
      updateCameraLook()
    }

    terrainTextures = await loadExploreTerrainTextures(renderer)
    terrainMaterial = createExploreTerrainMaterial(terrainTextures)
    oakResources = await createExploreOakWorldResources()
    scheduleVisibleTiles()
    await waitForTileQueueToSettle()
    flushReadyTilePlans(true)
    reportStats(true)
  }

  function resetPlayer() {
    currentMovement = {
      positionX: 0,
      positionZ: 18,
      velocityX: 0,
      velocityZ: 0,
    }
    currentJump = {
      isGrounded: true,
      positionY: sampleHeight(0, 18) + playerHeight,
      velocityY: 0,
    }
    currentLook = {
      pitch: -0.06,
      yaw: -Math.PI / 2,
    }
    updateCameraLook()
    scheduleVisibleTiles()
    requestPendingTilePlans()
    reportStats(true)
  }

  function resize() {
    const rect = options.canvas.getBoundingClientRect()
    renderer.setSize(rect.width, rect.height)
    camera.aspect = rect.width / Math.max(1, rect.height)
    camera.updateProjectionMatrix()
  }

  function handlePointerLockChange() {
    isPointerLocked = document.pointerLockElement === options.canvas
    reportStats(true)
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isPointerLocked) {
      return
    }

    currentLook = applyExploreLookDelta(
      currentLook,
      event.movementX,
      event.movementY,
      lookSensitivity,
      maxPitch
    )
  }

  function handleBlur() {
    pressedKeys.clear()
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (isEditableTarget(event.target)) {
      return
    }

    pressedKeys.add(event.code)

    if (
      event.code === 'Space' ||
      event.code === 'ArrowUp' ||
      event.code === 'ArrowDown' ||
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowRight'
    ) {
      event.preventDefault()
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    pressedKeys.delete(event.code)
  }

  function handleCanvasClick() {
    if (document.pointerLockElement === options.canvas) {
      return
    }

    try {
      const pointerLockResult = options.canvas.requestPointerLock()

      if (
        typeof pointerLockResult === 'object' &&
        pointerLockResult !== null &&
        'catch' in pointerLockResult &&
        typeof pointerLockResult.catch === 'function'
      ) {
        pointerLockResult.catch(() => {})
      }
    } catch {
      // Ignore pointer lock failures in unsupported environments.
    }
  }

  function setPlayerPosition(positionX: number, positionZ: number) {
    currentMovement = {
      positionX,
      positionZ,
      velocityX: 0,
      velocityZ: 0,
    }
    currentJump = {
      isGrounded: true,
      positionY: sampleHeight(positionX, positionZ) + playerHeight,
      velocityY: 0,
    }
    updateCameraLook()
    scheduleVisibleTiles()
    requestPendingTilePlans()
    reportStats(true)
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(options.canvas)
  options.canvas.addEventListener('click', handleCanvasClick)
  document.addEventListener('pointerlockchange', handlePointerLockChange)
  document.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('blur', handleBlur)

  await loadWorld(currentSeed)
  updateCameraLook()
  resize()
  timer.connect(document)

  window.__treeExploreDebug = {
    getSnapshot: () => getStats(),
    resetPlayer,
    setPlayerPosition,
  }

  void renderer.setAnimationLoop(() => {
    if (isDisposed) {
      return
    }

    const deltaSeconds = timer.getDelta()
    const forward =
      (pressedKeys.has('KeyW') ? 1 : 0) - (pressedKeys.has('KeyS') ? 1 : 0)
    const strafe =
      (pressedKeys.has('KeyD') ? 1 : 0) - (pressedKeys.has('KeyA') ? 1 : 0)

    currentMovement = stepExplorePlanarMovement(currentMovement, {
      acceleration: movementAcceleration,
      deceleration: movementDeceleration,
      deltaSeconds,
      forward,
      strafe,
      isSprinting: pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight'),
      sprintSpeed,
      walkSpeed,
      yaw: currentLook.yaw,
    })

    currentJump = stepExploreJumpMovement(currentJump, {
      deltaSeconds,
      gravity,
      groundHeight:
        sampleHeight(currentMovement.positionX, currentMovement.positionZ) +
        playerHeight,
      isJumpPressed: pressedKeys.has('Space'),
      jumpSpeed,
    })

    updateCameraLook()
    scheduleVisibleTiles()
    requestPendingTilePlans()
    flushReadyTilePlans()
    renderer.render(scene, camera)
    reportStats()
  })

  return {
    async regenerate(seed = Math.floor(Math.random() * 2147483646) + 1) {
      await loadWorld(seed, true)
      return seed
    },
    resetPlayer,
    getStats,
    dispose() {
      isDisposed = true
      resizeObserver.disconnect()
      options.canvas.removeEventListener('click', handleCanvasClick)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      document.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      void renderer.setAnimationLoop(null)

      if (document.pointerLockElement === options.canvas) {
        document.exitPointerLock()
      }

      for (const tile of Array.from(tiles.values())) {
        disposeTile(tile, false)
      }

      terrainTextures?.basecolor.dispose()
      terrainTextures?.height.dispose()
      terrainTextures?.metalness.dispose()
      terrainTextures?.normal.dispose()
      terrainTextures?.roughness.dispose()
      terrainMaterial?.dispose()

      if (oakResources) {
        disposeExploreOakWorldResources(oakResources)
      }

      tileWorker.dispose()
      renderer.dispose()

      if (window.__treeExploreDebug?.getSnapshot === getStats) {
        delete window.__treeExploreDebug
      }
    },
  }
}
