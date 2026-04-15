import { useEffect, useRef } from 'react'
import { createScene, type SceneContext } from '@/three/scene'
import type { SpeciesConfig } from '@/engine/species'

interface CanvasProps {
  config: SpeciesConfig
  sceneRef: React.RefObject<SceneContext | null>
}

export function TreeCanvas({ config, sceneRef }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let isStale = false
    let ctx: SceneContext | null = null

    void createScene(canvas, config).then((scene) => {
      if (isStale) {
        scene.dispose()
        return
      }
      ctx = scene
      sceneRef.current = scene
    })

    return () => {
      isStale = true
      ctx?.dispose()
      sceneRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <canvas ref={canvasRef} className="block h-full min-h-0 flex-1" />
  )
}
