import { useCallback, useRef, useState } from 'react'
import { Panel } from '@/components/panel'
import { TreeCanvas } from '@/components/canvas'
import { OAK, type SpeciesConfig } from '@/engine/species'
import type { SceneContext } from '@/three/scene'

export function App() {
  const [config, setConfig] = useState<SpeciesConfig>(OAK)
  const sceneRef = useRef<SceneContext | null>(null)

  const handleChange = useCallback((newConfig: SpeciesConfig) => {
    setConfig(newConfig)
    void sceneRef.current?.rebuildTree(newConfig)
  }, [])

  const handleRegenerate = useCallback(() => {
    void sceneRef.current?.rebuildTree(config)
  }, [config])

  return (
    <div className="flex h-dvh bg-[var(--color-bg)]">
      <Panel
        config={config}
        onChange={handleChange}
        onRegenerate={handleRegenerate}
      />
      <TreeCanvas config={config} sceneRef={sceneRef} />
    </div>
  )
}
