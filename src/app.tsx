import { useCallback, useRef, useState } from 'react'
import { Panel } from '@/components/panel'
import { TreeCanvas } from '@/components/canvas'
import type { ForestSettings } from '@/engine/forest'
import { OAK, type SpeciesConfig } from '@/engine/species'
import type { SceneContext } from '@/three/scene'

function createVariationSeed(): number {
  return Math.floor(Math.random() * 2147483646) + 1
}

export function App() {
  const [config, setConfig] = useState<SpeciesConfig>(OAK)
  const [forest, setForest] = useState<ForestSettings>({
    count: 1,
    radius: 18,
  })
  const [variationSeed, setVariationSeed] = useState(createVariationSeed)
  const sceneRef = useRef<SceneContext | null>(null)

  const rebuildScene = useCallback(
    (
      nextConfig: SpeciesConfig,
      nextForest: ForestSettings,
      nextVariationSeed: number
    ) => {
      void sceneRef.current?.rebuildScene(
        nextConfig,
        nextForest,
        nextVariationSeed
      )
    },
    []
  )

  const handleChange = useCallback((newConfig: SpeciesConfig) => {
    setConfig(newConfig)
    rebuildScene(newConfig, forest, variationSeed)
  }, [forest, rebuildScene, variationSeed])

  const handleForestChange = useCallback(
    (nextForest: ForestSettings) => {
      setForest(nextForest)
      rebuildScene(config, nextForest, variationSeed)
    },
    [config, rebuildScene, variationSeed]
  )

  const handleRegenerate = useCallback(() => {
    const nextSeed = createVariationSeed()
    setVariationSeed(nextSeed)
    rebuildScene(config, forest, nextSeed)
  }, [config, forest, rebuildScene])

  return (
    <div className="flex h-dvh bg-[var(--color-bg)]">
      <Panel
        config={config}
        forest={forest}
        onChange={handleChange}
        onForestChange={handleForestChange}
        onRegenerate={handleRegenerate}
      />
      <TreeCanvas
        config={config}
        forest={forest}
        variationSeed={variationSeed}
        sceneRef={sceneRef}
      />
    </div>
  )
}
