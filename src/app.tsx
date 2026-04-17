import { useCallback, useRef, useState } from 'react'
import { Panel } from '@/components/panel'
import { TreeCanvas } from '@/components/canvas'
import { SINGLE_TREE_FOREST, type ForestSettings } from '@/engine/forest'
import { OAK, type SpeciesConfig } from '@/engine/species'
import type { SceneContext, ViewPreset } from '@/three/scene'
import { DEFAULT_WIND_SETTINGS, type WindSettings } from '@/three/wind'
import type { ScenePerformanceStats } from '@/three/performance'
import {
  DEFAULT_DEBUG_VIEW_SETTINGS,
  type DebugViewSettings,
} from '@/three/debug'

function createVariationSeed(): number {
  return Math.floor(Math.random() * 2147483646) + 1
}

export function App() {
  const [config, setConfig] = useState<SpeciesConfig>(OAK)
  const [forest, setForest] = useState<ForestSettings>(SINGLE_TREE_FOREST)
  const [wind, setWind] = useState<WindSettings>(DEFAULT_WIND_SETTINGS)
  const [debugView, setDebugView] = useState<DebugViewSettings>(
    DEFAULT_DEBUG_VIEW_SETTINGS
  )
  const [variationSeed, setVariationSeed] = useState(createVariationSeed)
  const [canvasKey, setCanvasKey] = useState(0)
  const [performanceStats, setPerformanceStats] =
    useState<ScenePerformanceStats | null>(null)
  const sceneRef = useRef<SceneContext | null>(null)
  const perfRecoveryTriggeredRef = useRef(false)

  const handlePerformanceStatsChange = useCallback(
    (stats: ScenePerformanceStats) => {
      const hasLodStats =
        Number.isFinite(stats.nearLodChunkCount) &&
        Number.isFinite(stats.midLodChunkCount) &&
        Number.isFinite(stats.farLodChunkCount) &&
        Number.isFinite(stats.ultraFarChunkCount) &&
        Number.isFinite(stats.windAnimatedChunkCount) &&
        Number.isFinite(stats.windStaticChunkCount)

      if (!hasLodStats) {
        if (!perfRecoveryTriggeredRef.current) {
          perfRecoveryTriggeredRef.current = true
          setPerformanceStats(null)
          setCanvasKey((current) => current + 1)
        }
        return
      }

      perfRecoveryTriggeredRef.current = false
      setPerformanceStats(stats)
    },
    []
  )

  const rebuildScene = useCallback(
    (
      nextConfig: SpeciesConfig,
      nextForest: ForestSettings,
      nextWind: WindSettings,
      nextVariationSeed: number
    ) => {
      void sceneRef.current?.rebuildScene(
        nextConfig,
        nextForest,
        nextWind,
        nextVariationSeed
      )
    },
    []
  )

  const handleChange = useCallback(
    (newConfig: SpeciesConfig) => {
      setConfig(newConfig)
      rebuildScene(newConfig, forest, wind, variationSeed)
    },
    [forest, rebuildScene, variationSeed, wind]
  )

  const handleForestChange = useCallback(
    (nextForest: ForestSettings) => {
      setForest(nextForest)
      rebuildScene(config, nextForest, wind, variationSeed)
    },
    [config, rebuildScene, variationSeed, wind]
  )

  const handleWindChange = useCallback(
    (nextWind: WindSettings) => {
      setWind(nextWind)
      rebuildScene(config, forest, nextWind, variationSeed)
    },
    [config, forest, rebuildScene, variationSeed]
  )

  const handleRegenerate = useCallback(() => {
    const nextSeed = createVariationSeed()
    setVariationSeed(nextSeed)
    rebuildScene(config, forest, wind, nextSeed)
  }, [config, forest, rebuildScene, wind])

  const handleViewPreset = useCallback((preset: ViewPreset) => {
    sceneRef.current?.setViewPreset(preset)
  }, [])

  const handleDebugViewChange = useCallback(
    (nextDebugView: DebugViewSettings) => {
      setDebugView(nextDebugView)
      sceneRef.current?.setDebugView(nextDebugView)
    },
    []
  )

  return (
    <div className="flex h-dvh bg-[var(--color-bg)]">
      <Panel
        config={config}
        forest={forest}
        wind={wind}
        debugView={debugView}
        performanceStats={performanceStats}
        onChange={handleChange}
        onForestChange={handleForestChange}
        onWindChange={handleWindChange}
        onDebugViewChange={handleDebugViewChange}
        onRegenerate={handleRegenerate}
        onViewPreset={handleViewPreset}
      />
      <TreeCanvas
        key={canvasKey}
        config={config}
        forest={forest}
        wind={wind}
        debugView={debugView}
        variationSeed={variationSeed}
        sceneRef={sceneRef}
        onPerformanceStatsChange={handlePerformanceStatsChange}
      />
    </div>
  )
}
