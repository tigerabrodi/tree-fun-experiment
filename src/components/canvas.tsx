import { useEffect, useRef } from 'react'
import type { ForestSettings } from '@/engine/forest'
import { createScene, type SceneContext } from '@/three/scene'
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
  sceneRef: React.RefObject<SceneContext | null>
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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let isStale = false
    let ctx: SceneContext | null = null

    void createScene(
      canvas,
      config,
      forest,
      wind,
      variationSeed,
      debugView,
      onPerformanceStatsChange
    ).then((scene) => {
      if (isStale) {
        scene.dispose()
        return
      }
      ctx = scene
      scene.setDebugView(debugView)
      sceneRef.current = scene
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
