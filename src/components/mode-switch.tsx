export type AppMode = 'lab' | 'explore'

interface ModeSwitchProps {
  mode: AppMode
  onModeChange: (mode: AppMode) => void
}

export function ModeSwitch({ mode, onModeChange }: ModeSwitchProps) {
  return (
    <div className="flex gap-3">
      <button
        className={`tree-button-secondary${mode === 'lab' ? ' is-active' : ''}`}
        onClick={() => onModeChange('lab')}
      >
        Tree Lab
      </button>
      <button
        className={`tree-button-secondary${mode === 'explore' ? ' is-active' : ''}`}
        onClick={() => onModeChange('explore')}
      >
        Explore
      </button>
    </div>
  )
}
