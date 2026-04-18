import {
  GIANT_FOREST_SETTINGS,
  SINGLE_TREE_FOREST,
  type ForestSettings,
} from '@/engine/forest'
import { OAK, type SpeciesConfig } from '@/engine/species'
import {
  normalizeDebugViewSettings,
  type DebugViewSettings,
} from '@/three/debug'
import {
  createScene,
  type SceneContext,
  type ViewPreset,
} from '@/three/scene'
import type {
  SceneDebugSnapshot,
  ScenePerformanceStats,
} from '@/three/performance'
import { DEFAULT_WIND_SETTINGS, type WindSettings } from '@/three/wind'
import {
  createTreeAssetPack,
  DEFAULT_TREE_ASSET_PACK,
  type TreeAssetPack,
} from './assets'

export interface TreeRendererState {
  species: SpeciesConfig
  forest: ForestSettings
  wind: WindSettings
  debugView: DebugViewSettings
  variationSeed: number
}

export interface TreeRendererOptions {
  canvas: HTMLCanvasElement
  species?: SpeciesConfig
  forest?: ForestSettings
  wind?: WindSettings
  debugView?: Partial<DebugViewSettings>
  variationSeed?: number
  assets?: TreeAssetPack
  onPerformanceStatsChange?: (stats: ScenePerformanceStats) => void
}

export interface TreeRenderer {
  readonly three: Pick<SceneContext, 'renderer' | 'scene' | 'camera' | 'controls'>
  readonly assets: TreeAssetPack
  getState: () => TreeRendererState
  rebuild: (nextState: Partial<TreeRendererState>) => Promise<void>
  setSpecies: (species: SpeciesConfig) => Promise<void>
  setForest: (forest: ForestSettings) => Promise<void>
  setWind: (wind: WindSettings) => Promise<void>
  setDebugView: (debugView: Partial<DebugViewSettings>) => void
  regenerate: (variationSeed?: number) => Promise<number>
  setViewPreset: (preset: ViewPreset) => void
  getPerformanceSnapshot: () => SceneDebugSnapshot
  dispose: () => void
}

export function createVariationSeed(): number {
  return Math.floor(Math.random() * 2147483646) + 1
}

export function defineSpecies(species: SpeciesConfig): SpeciesConfig {
  return species
}

export function defineForestSettings(
  forest: ForestSettings
): ForestSettings {
  return forest
}

function cloneRendererState(state: TreeRendererState): TreeRendererState {
  return {
    species: { ...state.species },
    forest: { ...state.forest },
    wind: { ...state.wind },
    debugView: { ...state.debugView },
    variationSeed: state.variationSeed,
  }
}

export async function createTreeRenderer(
  options: TreeRendererOptions
): Promise<TreeRenderer> {
  const assets = options.assets ?? DEFAULT_TREE_ASSET_PACK
  const initialState: TreeRendererState = {
    species: options.species ?? OAK,
    forest: options.forest ?? SINGLE_TREE_FOREST,
    wind: options.wind ?? DEFAULT_WIND_SETTINGS,
    debugView: normalizeDebugViewSettings(options.debugView),
    variationSeed: options.variationSeed ?? createVariationSeed(),
  }

  const scene = await createScene(
    options.canvas,
    initialState.species,
    initialState.forest,
    initialState.wind,
    initialState.variationSeed,
    initialState.debugView,
    options.onPerformanceStatsChange,
    assets
  )
  let currentState = cloneRendererState(initialState)

  async function rebuild(nextState: Partial<TreeRendererState>) {
    const mergedState: TreeRendererState = {
      species: nextState.species ?? currentState.species,
      forest: nextState.forest ?? currentState.forest,
      wind: nextState.wind ?? currentState.wind,
      debugView: nextState.debugView
        ? normalizeDebugViewSettings(nextState.debugView)
        : currentState.debugView,
      variationSeed: nextState.variationSeed ?? currentState.variationSeed,
    }

    if (nextState.debugView) {
      scene.setDebugView(mergedState.debugView)
    }

    const shouldRebuild =
      nextState.species !== undefined ||
      nextState.forest !== undefined ||
      nextState.wind !== undefined ||
      nextState.variationSeed !== undefined

    currentState = cloneRendererState(mergedState)

    if (!shouldRebuild) {
      return
    }

    await scene.rebuildScene(
      currentState.species,
      currentState.forest,
      currentState.wind,
      currentState.variationSeed
    )
  }

  return {
    three: {
      renderer: scene.renderer,
      scene: scene.scene,
      camera: scene.camera,
      controls: scene.controls,
    },
    assets,
    getState() {
      return cloneRendererState(currentState)
    },
    rebuild,
    setSpecies(species) {
      return rebuild({ species })
    },
    setForest(forest) {
      return rebuild({ forest })
    },
    setWind(wind) {
      return rebuild({ wind })
    },
    setDebugView(debugView) {
      void rebuild({
        debugView: {
          ...currentState.debugView,
          ...debugView,
        },
      })
    },
    async regenerate(variationSeed = createVariationSeed()) {
      await rebuild({ variationSeed })
      return variationSeed
    },
    setViewPreset(preset) {
      scene.setViewPreset(preset)
    },
    getPerformanceSnapshot() {
      return scene.getDebugSnapshot()
    },
    dispose() {
      scene.dispose()
    },
  }
}

export const DEFAULT_SINGLE_TREE_FOREST = SINGLE_TREE_FOREST
export const DEFAULT_GIANT_FOREST = GIANT_FOREST_SETTINGS

export function createDefaultTreeAssetPack(): TreeAssetPack {
  return createTreeAssetPack()
}
