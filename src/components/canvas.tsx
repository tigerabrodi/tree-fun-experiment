import { useEffect, useRef } from 'react'
import type { ForestSettings } from '@/engine/forest'
import { createTreeRenderer, type TreeRenderer } from '@/lib'
import type { SpeciesConfig } from '@/engine/species'
import type { WindSettings } from '@/three/wind'
import type { ScenePerformanceStats } from '@/three/performance'
import type { DebugViewSettings } from '@/three/debug'

interface CanvasProps {
  config: SpeciesConfig
  forest: ForestSettings
  wind: WindSettings
  debugView: DebugViewSettings
  variationSeed: number
  sceneRef: React.RefObject<TreeRenderer | null>
  onPerformanceStatsChange?: (stats: ScenePerformanceStats) => void
}

export function TreeCanvas({
  config,
  forest,
  wind,
  debugView,
  variationSeed,
  sceneRef,
  onPerformanceStatsChange,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const latestStateRef = useRef({
    config,
    forest,
    wind,
    debugView,
    variationSeed,
  })

  latestStateRef.current = {
    config,
    forest,
    wind,
    debugView,
    variationSeed,
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let isStale = false
    let ctx: TreeRenderer | null = null

    void createTreeRenderer({
      canvas,
      species: config,
      forest,
      wind,
      variationSeed,
      debugView,
      onPerformanceStatsChange,
    }).then((scene) => {
      if (isStale) {
        scene.dispose()
        return
      }
      ctx = scene
      scene.setDebugView(debugView)
      sceneRef.current = scene

      const latestState = latestStateRef.current
      const hasStateChangedWhileMounting =
        latestState.config !== config ||
        latestState.forest !== forest ||
        latestState.wind !== wind ||
        latestState.variationSeed !== variationSeed
      const hasDebugViewChangedWhileMounting =
        latestState.debugView !== debugView

      if (hasStateChangedWhileMounting) {
        void scene.rebuild({
          species: latestState.config,
          forest: latestState.forest,
          wind: latestState.wind,
          variationSeed: latestState.variationSeed,
        })
      }

      if (hasDebugViewChangedWhileMounting) {
        scene.setDebugView(latestState.debugView)
      }
    })

    return () => {
      isStale = true
      ctx?.dispose()
      sceneRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sceneRef.current?.setDebugView(debugView)
  }, [debugView, sceneRef])

  return <canvas ref={canvasRef} className="block h-full min-h-0 flex-1" />
}
