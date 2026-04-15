import type { ForestSettings } from '@/engine/forest'
import { ALL_SPECIES, type SpeciesConfig } from '@/engine/species'

interface PanelProps {
  config: SpeciesConfig
  forest: ForestSettings
  onChange: (config: SpeciesConfig) => void
  onForestChange: (forest: ForestSettings) => void
  onRegenerate: () => void
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
  onChange,
  onForestChange,
  onRegenerate,
}: PanelProps) {
  function update(partial: Partial<SpeciesConfig>) {
    onChange({ ...config, ...partial })
  }

  function updateForest(partial: Partial<ForestSettings>) {
    onForestChange({ ...forest, ...partial })
  }

  return (
    <aside className="flex h-dvh w-[420px] min-w-[420px] flex-col gap-8 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] px-12 py-10">
      <h1 className="font-display text-[26px] font-normal tracking-tight text-[var(--color-text)]">
        L-System Trees
      </h1>

      {/* Species */}
      <div className="flex flex-col gap-4">
        <div className="border-b border-[var(--color-border-light)] pb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
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
        <div className="border-b border-[var(--color-border-light)] pb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
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
        <div className="border-b border-[var(--color-border-light)] pb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
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
      </div>

      <div className="flex flex-col gap-5">
        <div className="border-b border-[var(--color-border-light)] pb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
          Forest
        </div>
        <Slider
          label="Tree Count"
          value={forest.count}
          min={1}
          max={25}
          step={1}
          onChange={(v) => updateForest({ count: v })}
        />
        <Slider
          label="Forest Radius"
          value={forest.radius}
          min={8}
          max={42}
          step={1}
          onChange={(v) => updateForest({ radius: v })}
        />
      </div>

      <div className="mt-auto pt-4">
        <button onClick={onRegenerate} className="tree-button-primary w-full">
          Regenerate
        </button>
      </div>
    </aside>
  )
}
