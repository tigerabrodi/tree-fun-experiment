import { useCallback, useRef, useState } from 'react'
import { Panel } from '@/components/panel'
import { TreeCanvas } from '@/components/canvas'
import { SINGLE_TREE_FOREST, type ForestSettings } from '@/engine/forest'
import { OAK, type SpeciesConfig } from '@/engine/species'
import type { SceneContext } from '@/three/scene'
import { DEFAULT_WIND_SETTINGS, type WindSettings } from '@/three/wind'

function createVariationSeed(): number {
  return Math.floor(Math.random() * 2147483646) + 1
}

export function App() {
  const [config, setConfig] = useState<SpeciesConfig>(OAK)
  const [forest, setForest] = useState<ForestSettings>(SINGLE_TREE_FOREST)
  const [wind, setWind] = useState<WindSettings>(DEFAULT_WIND_SETTINGS)
  const [variationSeed, setVariationSeed] = useState(createVariationSeed)
  const sceneRef = useRef<SceneContext | null>(null)

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

  const handleChange = useCallback((newConfig: SpeciesConfig) => {
    setConfig(newConfig)
    rebuildScene(newConfig, forest, wind, variationSeed)
  }, [forest, rebuildScene, variationSeed, wind])

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

  return (
    <div className="flex h-dvh bg-[var(--color-bg)]">
      <Panel
        config={config}
        forest={forest}
        wind={wind}
        onChange={handleChange}
        onForestChange={handleForestChange}
        onWindChange={handleWindChange}
        onRegenerate={handleRegenerate}
      />
      <TreeCanvas
        config={config}
        forest={forest}
        wind={wind}
        variationSeed={variationSeed}
        sceneRef={sceneRef}
      />
    </div>
  )
}
