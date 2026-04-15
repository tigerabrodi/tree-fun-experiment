import type { Vec3 } from './lsystem'

export interface ForestSettings {
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
  const spreadFactor = Math.min(0.8, 0.58 + count * 0.015)
  const clusterRadius = radius * spreadFactor

  for (let i = 1; i < count; i++) {
    const t = i / (count - 1)
    const baseDistance = Math.pow(t, 1.35) * clusterRadius
    const jitteredDistance = Math.min(
      clusterRadius,
      Math.max(0, baseDistance + (random() - 0.5) * clusterRadius * 0.12)
    )
    const angle = i * goldenAngle + (random() - 0.5) * 0.45

    layout.push({
      position: {
        x: Math.cos(angle) * jitteredDistance,
        y: 0,
        z: Math.sin(angle) * jitteredDistance,
      },
      rotationY: random() * Math.PI * 2,
      scale: 0.78 + random() * 0.38,
      seed: Math.floor(random() * 2147483646) + 1,
    })
  }

  return layout
}
