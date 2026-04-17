export interface DebugViewSettings {
  showChunkBounds: boolean
  showWireframe: boolean
  showWoodOnly: boolean
}

export const DEFAULT_DEBUG_VIEW_SETTINGS: DebugViewSettings = {
  showChunkBounds: false,
  showWireframe: false,
  showWoodOnly: false,
}

export function normalizeDebugViewSettings(
  settings: Partial<DebugViewSettings> = {}
): DebugViewSettings {
  return {
    ...DEFAULT_DEBUG_VIEW_SETTINGS,
    ...settings,
  }
}

export function toggleDebugViewSetting(
  settings: DebugViewSettings,
  key: keyof DebugViewSettings
): DebugViewSettings {
  return {
    ...settings,
    [key]: !settings[key],
  }
}
