import { type ExploreWorldStats } from './scene'
import { ModeSwitch, type AppMode } from '@/components/mode-switch'

interface ExplorePanelProps {
  mode: AppMode
  onModeChange: (mode: AppMode) => void
  stats: ExploreWorldStats | null
  onRegenerate: () => void
  onResetPlayer: () => void
}

function formatDecimal(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—'
  }

  return value.toFixed(1)
}

function formatInt(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—'
  }

  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

export function ExplorePanel({
  mode,
  onModeChange,
  stats,
  onRegenerate,
  onResetPlayer,
}: ExplorePanelProps) {
  return (
    <aside className="flex h-dvh w-[420px] min-w-[420px] flex-col gap-8 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] px-12 py-10">
      <h1 className="font-display text-[26px] font-normal tracking-tight text-[var(--color-text)]">
        Explore Oaks
      </h1>

      <ModeSwitch mode={mode} onModeChange={onModeChange} />

      <div className="flex flex-col gap-4">
        <div className="border-b border-[var(--color-border-light)] pb-2 text-[11px] tracking-[0.12em] text-[var(--color-text-dim)] uppercase">
          World
        </div>
        <p className="m-0 text-[13px] leading-6 text-[var(--color-text-dim)]">
          Click the world to lock the mouse. Use WASD to move. Shift to sprint.
          Space to jump. Esc to unlock.
        </p>
        <div className="flex gap-3">
          <button className="tree-button-primary" onClick={onRegenerate}>
            Regenerate world
          </button>
          <button className="tree-button-secondary" onClick={onResetPlayer}>
            Reset player
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="border-b border-[var(--color-border-light)] pb-2 text-[11px] tracking-[0.12em] text-[var(--color-text-dim)] uppercase">
          Explore Stats
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 text-[13px]">
          <span className="text-[var(--color-text-dim)]">Seed</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatInt(stats?.seed)}
          </span>
          <span className="text-[var(--color-text-dim)]">Active Tiles</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatInt(stats?.activeTileCount)}
          </span>
          <span className="text-[var(--color-text-dim)]">Active Trees</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatInt(stats?.activeTreeCount)}
          </span>
          <span className="text-[var(--color-text-dim)]">Oak Variants</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatInt(stats?.variantCount)}
          </span>
          <span className="text-[var(--color-text-dim)]">Tile LOD Mid</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatInt(stats?.midTileCount)}
          </span>
          <span className="text-[var(--color-text-dim)]">Tile LOD Far</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatInt(stats?.farTileCount)}
          </span>
          <span className="text-[var(--color-text-dim)]">Tile LOD Ultra</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatInt(stats?.ultraFarTileCount)}
          </span>
          <span className="text-[var(--color-text-dim)]">Pending Tiles</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatInt(stats?.pendingTileCount)}
          </span>
          <span className="text-[var(--color-text-dim)]">Pointer Lock</span>
          <span className="font-mono text-[var(--color-text)]">
            {stats?.isPointerLocked ? 'yes' : 'no'}
          </span>
          <span className="text-[var(--color-text-dim)]">Player X</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatDecimal(stats?.playerX)}
          </span>
          <span className="text-[var(--color-text-dim)]">Player Y</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatDecimal(stats?.playerY)}
          </span>
          <span className="text-[var(--color-text-dim)]">Player Z</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatDecimal(stats?.playerZ)}
          </span>
          <span className="text-[var(--color-text-dim)]">FPS</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatDecimal(stats?.fps)}
          </span>
          <span className="text-[var(--color-text-dim)]">Triangles</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatInt(stats?.triangles)}
          </span>
          <span className="text-[var(--color-text-dim)]">Draw Calls</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatInt(stats?.drawCalls)}
          </span>
          <span className="text-[var(--color-text-dim)]">Compute Calls</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatInt(stats?.computeCalls)}
          </span>
          <span className="text-[var(--color-text-dim)]">Geometries</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatInt(stats?.geometries)}
          </span>
          <span className="text-[var(--color-text-dim)]">Textures</span>
          <span className="font-mono text-[var(--color-text)]">
            {formatInt(stats?.textures)}
          </span>
        </div>
      </div>
    </aside>
  )
}
