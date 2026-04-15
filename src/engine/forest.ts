import type { Vec3 } from './lsystem'

export type ForestMode = 'custom' | 'giant'

export interface ForestSettings {
  mode: ForestMode
  count: number
  radius: number
}

export interface ForestLayoutOptions extends ForestSettings {
  seed: number
}

export interface ForestInstance {
  position: Vec3
  rotationY: number
  scale: number
  seed: number
}

export const SINGLE_TREE_FOREST: ForestSettings = {
  mode: 'custom',
  count: 1,
  radius: 18,
}

export const GIANT_FOREST_SETTINGS: ForestSettings = {
  mode: 'giant',
  count: 120,
  radius: 48,
}

function createSeededRandom(seed: number) {
  let rng = Math.abs(Math.floor(seed)) % 2147483647
  if (rng === 0) rng = 1

  return function random(): number {
    rng = (rng * 16807) % 2147483647
    return rng / 2147483647
  }
}

export function buildForestLayout(
  options: ForestLayoutOptions
): Array<ForestInstance> {
  const count = Math.max(0, Math.floor(options.count))
  if (count === 0) return []

  const radius = Math.max(0, options.radius)
  const random = createSeededRandom(options.seed)

  const layout: Array<ForestInstance> = [
    {
      position: { x: 0, y: 0, z: 0 },
      rotationY: 0,
      scale: 1,
      seed: Math.floor(random() * 2147483646) + 1,
    },
  ]

  if (count === 1) {
    return layout
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const spreadFactor =
    options.mode === 'giant'
      ? Math.min(0.72, 0.46 + count * 0.003)
      : Math.min(0.8, 0.58 + count * 0.015)
  const clusterRadius = radius * spreadFactor
  const scaleMin = options.mode === 'giant' ? 0.92 : 0.78
  const scaleRange = options.mode === 'giant' ? 0.16 : 0.38
  const angleJitter = options.mode === 'giant' ? 0.28 : 0.45

  for (let i = 1; i < count; i++) {
    const t = i / (count - 1)
    const baseDistance = Math.pow(t, 1.35) * clusterRadius
    const jitteredDistance = Math.min(
      clusterRadius,
      Math.max(0, baseDistance + (random() - 0.5) * clusterRadius * 0.12)
    )
    const angle = i * goldenAngle + (random() - 0.5) * angleJitter

    layout.push({
      position: {
        x: Math.cos(angle) * jitteredDistance,
        y: 0,
        z: Math.sin(angle) * jitteredDistance,
      },
      rotationY: random() * Math.PI * 2,
      scale: scaleMin + random() * scaleRange,
      seed: Math.floor(random() * 2147483646) + 1,
    })
  }

  return layout
}
