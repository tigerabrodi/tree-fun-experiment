export interface LSystemRule {
  predecessor: string
  successor: string
  probability?: number
}

export interface SpeciesConfig {
  name: string
  axiom: string
  rules: Array<LSystemRule>
  iterations: number
  angle: number
  angleVariance: number
  lengthScale: number
  lengthDecay: number
  shortStepJitter: number
  initialRadius: number
  segmentTaper: number
  radiusDecay: number
  branchSpin: number
  branchSpinJitter: number
  leafSize: number
  leafDensity: number
  leafDepthMin: number
  leafTextureType: 'single' | 'cluster'
  leafClusterStyle: 'classic' | 'broad' | 'tuft' | 'airy' | 'blossom'
  leafClusterCount: number
  leafClusterSpread: number
  barkTexture: string
  leafTexture: string
}

export const OAK: SpeciesConfig = {
  name: 'oak',
  axiom: 'T',
  rules: [
    {
      predecessor: 'T',
      successor: 'FF[+!B]S[-!B]S[+!B]S[-!B]',
    },
    {
      predecessor: 'B',
      successor: 'F[+!B]S[-!B]F',
    },
  ],
  iterations: 5,
  angle: 30,
  angleVariance: 10,
  lengthScale: 1.0,
  lengthDecay: 0.9,
  shortStepJitter: 0,
  initialRadius: 0.16,
  segmentTaper: 0.987,
  radiusDecay: 0.7,
  branchSpin: 90,
  branchSpinJitter: 10,
  leafSize: 0.86,
  leafDensity: 0.96,
  leafDepthMin: 1,
  leafTextureType: 'cluster',
  leafClusterStyle: 'classic',
  leafClusterCount: 4,
  leafClusterSpread: 0.26,
  barkTexture: 'oak',
  leafTexture: 'oak',
}

// Pine: central trunk keeps growing. Whorled branches at each level.
export const PINE: SpeciesConfig = {
  name: 'pine',
  axiom: 'FA',
  rules: [
    {
      predecessor: 'A',
      successor: '!F[&&&&B][&&&&B][&&&&B][&&&&B][&&&&B]SA',
    },
    {
      predecessor: 'B',
      successor: 'F[+C][-C]&&S[+C][-C]&F',
    },
    {
      predecessor: 'C',
      successor: 'F[+F]S[-F]F',
    },
  ],
  iterations: 8,
  angle: 15,
  angleVariance: 3,
  lengthScale: 0.69,
  lengthDecay: 0.9,
  shortStepJitter: 0.18,
  initialRadius: 0.22,
  segmentTaper: 0.988,
  radiusDecay: 0.76,
  branchSpin: 67,
  branchSpinJitter: 20,
  leafSize: 0.78,
  leafDensity: 1.0,
  leafDepthMin: 1,
  leafTextureType: 'cluster',
  leafClusterStyle: 'tuft',
  leafClusterCount: 11,
  leafClusterSpread: 0.12,
  barkTexture: 'pine',
  leafTexture: 'pine',
}

export const BIRCH: SpeciesConfig = {
  name: 'birch',
  axiom: 'T',
  rules: [
    {
      predecessor: 'T',
      successor: 'F[+!B]S[-!B]&S[+!B]',
    },
    {
      predecessor: 'B',
      successor: 'F[+!B]S[-!B]&F',
    },
  ],
  iterations: 6,
  angle: 24,
  angleVariance: 10,
  lengthScale: 0.82,
  lengthDecay: 0.92,
  shortStepJitter: 0,
  initialRadius: 0.08,
  segmentTaper: 0.989,
  radiusDecay: 0.68,
  branchSpin: 141,
  branchSpinJitter: 18,
  leafSize: 0.62,
  leafDensity: 0.92,
  leafDepthMin: 2,
  leafTextureType: 'cluster',
  leafClusterStyle: 'airy',
  leafClusterCount: 3,
  leafClusterSpread: 0.22,
  barkTexture: 'birch',
  leafTexture: 'birch',
}

// Maple: wide spreading crown, autumn colors.
// Similar branching to oak but with wider angles.
export const MAPLE: SpeciesConfig = {
  name: 'maple',
  axiom: 'T',
  rules: [
    {
      predecessor: 'T',
      successor: 'F[+!B]S[-!B]S[+!B]S[-!B]S[+!B]',
    },
    {
      predecessor: 'B',
      successor: 'F[+!B]S[-!B]F',
    },
  ],
  iterations: 5,
  angle: 38,
  angleVariance: 12,
  lengthScale: 0.95,
  lengthDecay: 0.9,
  shortStepJitter: 0,
  initialRadius: 0.14,
  segmentTaper: 0.987,
  radiusDecay: 0.7,
  branchSpin: 90,
  branchSpinJitter: 12,
  leafSize: 0.82,
  leafDensity: 0.98,
  leafDepthMin: 2,
  leafTextureType: 'cluster',
  leafClusterStyle: 'classic',
  leafClusterCount: 4,
  leafClusterSpread: 0.3,
  barkTexture: 'maple',
  leafTexture: 'maple',
}

// Sakura: graceful spreading branches, cherry blossoms.
// Lower branching angle, more horizontal spread.
export const SAKURA: SpeciesConfig = {
  name: 'sakura',
  axiom: 'T',
  rules: [
    {
      predecessor: 'T',
      successor: 'F[+!B]S[-!B]S[+!B]',
    },
    {
      predecessor: 'B',
      successor: 'F[+!B]S[-!B]&F',
    },
  ],
  iterations: 5,
  angle: 36,
  angleVariance: 12,
  lengthScale: 0.85,
  lengthDecay: 0.9,
  shortStepJitter: 0,
  initialRadius: 0.12,
  segmentTaper: 0.985,
  radiusDecay: 0.7,
  branchSpin: 90,
  branchSpinJitter: 10,
  leafSize: 0.74,
  leafDensity: 0.9,
  leafDepthMin: 2,
  leafTextureType: 'cluster',
  leafClusterStyle: 'blossom',
  leafClusterCount: 4,
  leafClusterSpread: 0.28,
  barkTexture: 'sakura',
  leafTexture: 'sakura',
}

export const ALL_SPECIES: Record<string, SpeciesConfig> = {
  oak: OAK,
  pine: PINE,
  birch: BIRCH,
  maple: MAPLE,
  sakura: SAKURA,
}

function createSeededRandom(seed: number) {
  let rng = Math.abs(Math.floor(seed)) % 2147483647
  if (rng === 0) rng = 1

  return function random(): number {
    rng = (rng * 16807) % 2147483647
    return rng / 2147483647
  }
}

function jitterRange(
  value: number,
  random: () => number,
  delta: number,
  min: number,
  max: number
) {
  const next = value + (random() - 0.5) * 2 * delta
  return Math.min(max, Math.max(min, next))
}

function jitterScale(
  value: number,
  random: () => number,
  amount: number,
  min: number,
  max: number
) {
  const next = value * (1 + (random() - 0.5) * 2 * amount)
  return Math.min(max, Math.max(min, next))
}

function jitterInteger(
  value: number,
  random: () => number,
  delta: number,
  min: number,
  max: number
) {
  return Math.round(jitterRange(value, random, delta, min, max))
}

export function createForestVariantConfig(
  config: SpeciesConfig,
  seed: number,
  strength = 1
): SpeciesConfig {
  const random = createSeededRandom(seed)
  const scaledStrength = Math.max(0.35, strength)

  return {
    ...config,
    angle: jitterScale(config.angle, random, 0.08 * scaledStrength, 5, 60),
    angleVariance: jitterRange(
      config.angleVariance,
      random,
      2.5 * scaledStrength,
      0,
      20
    ),
    lengthScale: jitterScale(
      config.lengthScale,
      random,
      0.07 * scaledStrength,
      0.2,
      3
    ),
    lengthDecay: jitterRange(
      config.lengthDecay,
      random,
      0.018 * scaledStrength,
      0.5,
      0.98
    ),
    shortStepJitter: jitterRange(
      config.shortStepJitter,
      random,
      0.06 * scaledStrength,
      0,
      0.5
    ),
    initialRadius: jitterScale(
      config.initialRadius,
      random,
      0.08 * scaledStrength,
      0.03,
      0.3
    ),
    segmentTaper: jitterRange(
      config.segmentTaper,
      random,
      0.003 * scaledStrength,
      0.9,
      0.995
    ),
    radiusDecay: jitterRange(
      config.radiusDecay,
      random,
      0.035 * scaledStrength,
      0.4,
      0.95
    ),
    branchSpin:
      config.branchSpin === 0
        ? 0
        : jitterRange(config.branchSpin, random, 6 * scaledStrength, 0, 180),
    branchSpinJitter: jitterRange(
      config.branchSpinJitter,
      random,
      Math.max(4, config.branchSpinJitter * 0.18) * scaledStrength,
      0,
      45
    ),
    leafDensity: jitterRange(
      config.leafDensity,
      random,
      0.04 * scaledStrength,
      0,
      1
    ),
    leafClusterCount: jitterInteger(
      config.leafClusterCount,
      random,
      0.6 * scaledStrength,
      1,
      8
    ),
    leafClusterSpread: jitterScale(
      config.leafClusterSpread,
      random,
      0.12 * scaledStrength,
      0.05,
      0.6
    ),
  }
}
