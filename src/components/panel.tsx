import {
  GIANT_FOREST_SETTINGS,
  SINGLE_TREE_FOREST,
  type ForestSettings,
} from '@/engine/forest'
import { ALL_SPECIES, type SpeciesConfig } from '@/engine/species'
import type { ViewPreset } from '@/three/scene'
import { type WindSettings } from '@/three/wind'
import type { ScenePerformanceStats } from '@/three/performance'
import { toggleDebugViewSetting, type DebugViewSettings } from '@/three/debug'

interface PanelProps {
  config: SpeciesConfig
  forest: ForestSettings
  wind: WindSettings
  debugView: DebugViewSettings
  performanceStats: ScenePerformanceStats | null
  onChange: (config: SpeciesConfig) => void
  onForestChange: (forest: ForestSettings) => void
  onWindChange: (wind: WindSettings) => void
  onDebugViewChange: (debugView: DebugViewSettings) => void
  onRegenerate: () => void
  onViewPreset: (preset: ViewPreset) => void
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-[var(--color-text-dim)]">
          {label}
        </span>
        <span className="font-mono text-[12px] text-[var(--color-accent)]">
          {value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="tree-slider"
      />
    </div>
  )
}

export function Panel({
  config,
  forest,
  wind,
  debugView,
  performanceStats,
  onChange,
  onForestChange,
  onWindChange,
  onDebugViewChange,
  onRegenerate,
  onViewPreset,
}: PanelProps) {
  function update(partial: Partial<SpeciesConfig>) {
    onChange({ ...config, ...partial })
  }

  function updateForest(partial: Partial<ForestSettings>) {
    onForestChange({ ...forest, ...partial })
  }

  function applyForestPreset(nextForest: ForestSettings) {
    onForestChange(nextForest)
  }

  function updateWind(partial: Partial<WindSettings>) {
    onWindChange({ ...wind, ...partial })
  }

  function toggleDebugView(key: keyof DebugViewSettings) {
    onDebugViewChange(toggleDebugViewSetting(debugView, key))
  }

  function formatInt(value: number | null | undefined) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '—'
    }

    return new Intl.NumberFormat('en-US').format(Math.round(value))
  }

  function formatDecimal(value: number | null | undefined) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '—'
    }

    return value.toFixed(1)
  }

  async function copyPerformanceJson() {
    const snapshot = window.__treeDebug?.getSnapshot() ?? {
      performance: performanceStats,
    }
    await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
  }

  return (
    <aside className="flex h-dvh w-[420px] min-w-[420px] flex-col gap-8 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] px-12 py-10">
      <h1 className="font-display text-[26px] font-normal tracking-tight text-[var(--color-text)]">
        L-System Trees
      </h1>

      {/* Species */}
      <div className="flex flex-col gap-4">
        <div className="border-b border-[var(--color-border-light)] pb-2 text-[11px] tracking-[0.12em] text-[var(--color-text-dim)] uppercase">
          Species
        </div>
        <select
          value={config.name}
          onChange={(e) => {
            const species = ALL_SPECIES[e.target.value]
            if (species) onChange(species)
          }}
          className="tree-select"
        >
          {Object.entries(ALL_SPECIES).map(([key, sp]) => (
            <option key={key} value={key}>
              {sp.name.charAt(0).toUpperCase() + sp.name.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Structure */}
      <div className="flex flex-col gap-5">
        <div className="border-b border-[var(--color-border-light)] pb-2 text-[11px] tracking-[0.12em] text-[var(--color-text-dim)] uppercase">
          Structure
        </div>
        <Slider
          label="Iterations"
          value={config.iterations}
          min={1}
          max={6}
          step={1}
          onChange={(v) => update({ iterations: v })}
        />
        <Slider
          label="Branch Angle"
          value={config.angle}
          min={5}
          max={60}
          step={1}
          onChange={(v) => update({ angle: v })}
        />
        <Slider
          label="Angle Variance"
          value={config.angleVariance}
          min={0}
          max={20}
          step={1}
          onChange={(v) => update({ angleVariance: v })}
        />
        <Slider
          label="Branch Length"
          value={config.lengthScale}
          min={0.2}
          max={3.0}
          step={0.1}
          onChange={(v) => update({ lengthScale: v })}
        />
        <Slider
          label="Length Decay"
          value={config.lengthDecay}
          min={0.5}
          max={0.98}
          step={0.01}
          onChange={(v) => update({ lengthDecay: v })}
        />
        <Slider
          label="Radius Decay"
          value={config.radiusDecay}
          min={0.4}
          max={0.95}
          step={0.01}
          onChange={(v) => update({ radiusDecay: v })}
        />
        <Slider
          label="Trunk Taper"
          value={config.segmentTaper}
          min={0.9}
          max={0.995}
          step={0.005}
          onChange={(v) => update({ segmentTaper: v })}
        />
      </div>

      {/* Foliage */}
      <div className="flex flex-col gap-5">
        <div className="border-b border-[var(--color-border-light)] pb-2 text-[11px] tracking-[0.12em] text-[var(--color-text-dim)] uppercase">
          Foliage
        </div>
        <Slider
          label="Leaf Size"
          value={config.leafSize}
          min={0.2}
          max={3.0}
          step={0.1}
          onChange={(v) => update({ leafSize: v })}
        />
        <Slider
          label="Leaf Density"
          value={config.leafDensity}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => update({ leafDensity: v })}
        />
      </div>

      <div className="flex flex-col gap-5">
        <div className="border-b border-[var(--color-border-light)] pb-2 text-[11px] tracking-[0.12em] text-[var(--color-text-dim)] uppercase">
          Forest
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => applyForestPreset(SINGLE_TREE_FOREST)}
            className={`tree-button-secondary ${forest.mode === 'custom' && forest.count === 1 ? 'is-active' : ''}`}
          >
            Single Tree
          </button>
          <button
            onClick={() => applyForestPreset(GIANT_FOREST_SETTINGS)}
            className={`tree-button-secondary ${forest.mode === 'giant' ? 'is-active' : ''}`}
          >
            Giant Forest
          </button>
        </div>
        <Slider
          label="Tree Count"
          value={forest.count}
          min={1}
          max={forest.mode === 'giant' ? 180 : 40}
          step={1}
          onChange={(v) => updateForest({ count: v })}
        />
        <Slider
          label="Forest Radius"
          value={forest.radius}
          min={8}
          max={forest.mode === 'giant' ? 120 : 50}
          step={1}
          onChange={(v) => updateForest({ radius: v })}
        />
      </div>

      <div className="flex flex-col gap-5">
        <div className="border-b border-[var(--color-border-light)] pb-2 text-[11px] tracking-[0.12em] text-[var(--color-text-dim)] uppercase">
          Wind
        </div>
        <Slider
          label="Wind Strength"
          value={wind.strength}
          min={0}
          max={1.2}
          step={0.01}
          onChange={(v) => updateWind({ strength: v })}
        />
        <Slider
          label="Wind Speed"
          value={wind.speed}
          min={0}
          max={4}
          step={0.05}
          onChange={(v) => updateWind({ speed: v })}
        />
        <Slider
          label="Wind Direction"
          value={wind.direction}
          min={0}
          max={360}
          step={1}
          onChange={(v) => updateWind({ direction: v })}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="border-b border-[var(--color-border-light)] pb-2 text-[11px] tracking-[0.12em] text-[var(--color-text-dim)] uppercase">
          Performance
        </div>
        {performanceStats ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] text-[var(--color-text-dim)]">
            <span>FPS</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatDecimal(performanceStats.fps)}
            </span>

            <span>Draw Calls</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.drawCalls)}
            </span>

            <span>Compute Passes</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.computeCalls)}
            </span>

            <span>Triangles</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.triangles)}
            </span>

            <span>Worker ms</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatDecimal(performanceStats.workerMs)}
            </span>

            <span>Main Thread ms</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatDecimal(performanceStats.mainThreadBuildMs)}
            </span>

            <span>Rebuild ms</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatDecimal(performanceStats.rebuildMs)}
            </span>

            <span>Trees</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.treeCount)}
            </span>

            <span>Chunks</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.chunkCount)}
            </span>

            <span>Visible Chunks</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.visibleChunkCount)}
            </span>

            <span>Culled Chunks</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.culledChunkCount)}
            </span>

            <span>LOD Near</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.nearLodChunkCount)}
            </span>

            <span>LOD Mid</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.midLodChunkCount)}
            </span>

            <span>LOD Far</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.farLodChunkCount)}
            </span>

            <span>LOD Ultra Far</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.ultraFarChunkCount)}
            </span>

            <span>Wind Animated</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.windAnimatedChunkCount)}
            </span>

            <span>Wind Static</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.windStaticChunkCount)}
            </span>

            <span>Chunk Size</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatDecimal(performanceStats.chunkCellSize)}
            </span>

            <span>Trees per Chunk</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {`${formatDecimal(performanceStats.chunkTreeAverage)} avg`}
            </span>

            <span>Chunk Range</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {`${formatInt(performanceStats.chunkTreeMin)}-${formatInt(performanceStats.chunkTreeMax)}`}
            </span>

            <span>Base Variants</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.uniqueBlueprintCount)}
            </span>

            <span>Wood Batches</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.woodDrawBatches)}
            </span>

            <span>Wood Instances</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.woodInstanceCount)}
            </span>

            <span>Leaf Batches</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.leafDrawBatches)}
            </span>

            <span>Leaf Anchors</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.leafAnchorCount)}
            </span>

            <span>Leaf Instances</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.leafInstanceCount)}
            </span>

            <span>Branch Segments</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.branchSegmentCount)}
            </span>

            <span>Geometries</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.geometries)}
            </span>

            <span>Textures</span>
            <span className="text-right font-mono text-[var(--color-accent)]">
              {formatInt(performanceStats.textures)}
            </span>

            <button
              onClick={() => {
                void copyPerformanceJson()
              }}
              className="tree-button-secondary col-span-2 mt-2"
            >
              Copy JSON
            </button>
          </div>
        ) : (
          <div className="text-[13px] text-[var(--color-text-dim)]">
            Waiting for first frame.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className="border-b border-[var(--color-border-light)] pb-2 text-[11px] tracking-[0.12em] text-[var(--color-text-dim)] uppercase">
          Camera
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onViewPreset('front')}
            className="tree-button-secondary"
          >
            Front
          </button>
          <button
            onClick={() => onViewPreset('quarter')}
            className="tree-button-secondary"
          >
            Quarter
          </button>
          <button
            onClick={() => onViewPreset('side')}
            className="tree-button-secondary"
          >
            Side
          </button>
          <button
            onClick={() => onViewPreset('top')}
            className="tree-button-secondary"
          >
            Top
          </button>
          <button
            onClick={() => onViewPreset('close')}
            className="tree-button-secondary"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="border-b border-[var(--color-border-light)] pb-2 text-[11px] tracking-[0.12em] text-[var(--color-text-dim)] uppercase">
          Debug
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => toggleDebugView('showChunkBounds')}
            className={`tree-button-secondary ${debugView.showChunkBounds ? 'is-active' : ''}`}
          >
            Chunk Bounds
          </button>
          <button
            onClick={() => toggleDebugView('showWireframe')}
            className={`tree-button-secondary ${debugView.showWireframe ? 'is-active' : ''}`}
          >
            Wireframe
          </button>
          <button
            onClick={() => toggleDebugView('showWoodOnly')}
            className={`tree-button-secondary ${debugView.showWoodOnly ? 'is-active' : ''}`}
          >
            Wood Only
          </button>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <button onClick={onRegenerate} className="tree-button-primary w-full">
          Regenerate
        </button>
      </div>
    </aside>
  )
}
