import { describe, expect, it } from 'vitest'
import {
  buildForestChunks,
  getForestChunkCellSize,
  type ForestChunk,
} from './chunks'
import {
  buildForestLayout,
  GIANT_FOREST_SETTINGS,
  SINGLE_TREE_FOREST,
} from './forest'

function countTrees(chunks: Array<ForestChunk>) {
  return chunks.reduce((count, chunk) => count + chunk.instances.length, 0)
}

describe('getForestChunkCellSize', () => {
  it('keeps giant forest chunks at a reasonable spatial size', () => {
    expect(
      getForestChunkCellSize(GIANT_FOREST_SETTINGS)
    ).toBeGreaterThanOrEqual(12)
    expect(getForestChunkCellSize(GIANT_FOREST_SETTINGS)).toBeLessThanOrEqual(
      20
    )
  })

  it('keeps custom forests as a single wide chunk by default', () => {
    const cellSize = getForestChunkCellSize({
      ...SINGLE_TREE_FOREST,
      count: 12,
      radius: 20,
    })

    expect(cellSize).toBeCloseTo(40)
  })
})

describe('buildForestChunks', () => {
  it('returns one chunk for a single tree forest', () => {
    const layout = buildForestLayout({
      ...SINGLE_TREE_FOREST,
      seed: 42,
    })

    const plan = buildForestChunks(layout, SINGLE_TREE_FOREST)

    expect(plan.chunks).toHaveLength(1)
    expect(plan.chunks[0].instances).toHaveLength(1)
    expect(plan.chunks[0].id).toBe('0:0')
  })

  it('splits giant forests into several spatial chunks', () => {
    const layout = buildForestLayout({
      ...GIANT_FOREST_SETTINGS,
      seed: 42,
    })

    const plan = buildForestChunks(layout, GIANT_FOREST_SETTINGS)

    expect(plan.chunks.length).toBeGreaterThan(1)
    expect(plan.chunks.length).toBeLessThanOrEqual(25)
    expect(countTrees(plan.chunks)).toBe(layout.length)
  })

  it('is deterministic for the same layout and settings', () => {
    const layout = buildForestLayout({
      ...GIANT_FOREST_SETTINGS,
      seed: 77,
    })

    const first = buildForestChunks(layout, GIANT_FOREST_SETTINGS)
    const second = buildForestChunks(layout, GIANT_FOREST_SETTINGS)

    expect(first).toEqual(second)
  })

  it('tracks chunk bounds around the trees inside each cell', () => {
    const layout = buildForestLayout({
      ...GIANT_FOREST_SETTINGS,
      seed: 91,
    })

    const plan = buildForestChunks(layout, GIANT_FOREST_SETTINGS)

    for (const chunk of plan.chunks) {
      for (const tree of chunk.instances) {
        expect(tree.position.x).toBeGreaterThanOrEqual(chunk.bounds.min.x)
        expect(tree.position.x).toBeLessThanOrEqual(chunk.bounds.max.x)
        expect(tree.position.z).toBeGreaterThanOrEqual(chunk.bounds.min.z)
        expect(tree.position.z).toBeLessThanOrEqual(chunk.bounds.max.z)
      }
    }
  })
})
