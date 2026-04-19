import { useEffect, useRef } from 'react'
import { createExploreScene, type ExploreSceneHandle, type ExploreWorldStats } from './scene'

interface ExploreCanvasProps {
  seed: number
  sceneRef: React.RefObject<ExploreSceneHandle | null>
  onStatsChange?: (stats: ExploreWorldStats) => void
}

export function ExploreCanvas({
  seed,
  sceneRef,
  onStatsChange,
}: ExploreCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    let isStale = false
    let scene: ExploreSceneHandle | null = null

    void createExploreScene({
      canvas,
      seed,
      onStatsChange,
    }).then((nextScene) => {
      if (isStale) {
        nextScene.dispose()
        return
      }

      scene = nextScene
      sceneRef.current = nextScene
    })

    return () => {
      isStale = true
      scene?.dispose()
      sceneRef.current = null
    }
  }, [seed, sceneRef, onStatsChange])

  return (
    <div className="relative min-h-0 flex-1">
      <canvas ref={canvasRef} className="block h-full min-h-0 w-full" />
      <div className="pointer-events-none absolute inset-0">
        <div className="explore-hud-crosshair" />
        <div className="explore-hud-hint">
          Click to lock. WASD move. Shift sprint. Space jump. Esc unlock.
        </div>
      </div>
    </div>
  )
}
