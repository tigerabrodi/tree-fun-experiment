declare global {
  interface Window {
    __treeDebug?: {
      snapshot: import('./three/performance').SceneDebugSnapshot
      getSnapshot: () => import('./three/performance').SceneDebugSnapshot
      copySnapshotJson: () => Promise<void>
      setDebugView: (
        settings: Partial<import('./three/debug').DebugViewSettings>
      ) => void
      setViewPreset: (preset: import('./three/scene').ViewPreset) => void
    }
    __treeExploreDebug?: {
      getSnapshot: () => import('./explore/scene').ExploreWorldStats
      resetPlayer: () => void
      setPlayerPosition: (x: number, z: number) => void
    }
  }
}

export {}
