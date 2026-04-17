import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DEBUG_VIEW_SETTINGS,
  normalizeDebugViewSettings,
  toggleDebugViewSetting,
} from './debug'

describe('normalizeDebugViewSettings', () => {
  it('fills missing flags with defaults', () => {
    expect(normalizeDebugViewSettings({ showWireframe: true })).toEqual({
      ...DEFAULT_DEBUG_VIEW_SETTINGS,
      showWireframe: true,
    })
  })
})

describe('toggleDebugViewSetting', () => {
  it('toggles one flag without touching the others', () => {
    expect(
      toggleDebugViewSetting(DEFAULT_DEBUG_VIEW_SETTINGS, 'showChunkBounds')
    ).toEqual({
      ...DEFAULT_DEBUG_VIEW_SETTINGS,
      showChunkBounds: true,
    })
  })
})
