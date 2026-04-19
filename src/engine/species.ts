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
      successor: 'F[+!B]S[-!B]S[+!B]S[-!B]S[+!B]S[-!B]',
    },
    {
      predecessor: 'B',
      successor: 'F[+!B]S[-!B]S[+!B]S[-!B]F',
    },
  ],
  iterations: 6,
  angle: 23,
  angleVariance: 9,
  lengthScale: 1.02,
  lengthDecay: 0.91,
  shortStepJitter: 0,
  initialRadius: 0.34,
  segmentTaper: 0.987,
  radiusDecay: 0.84,
  branchSpin: 88,
  branchSpinJitter: 24,
  leafSize: 1.45,
  leafDensity: 1.0,
  leafDepthMin: 1,
  leafTextureType: 'cluster',
  leafClusterStyle: 'classic',
  leafClusterCount: 7,
  leafClusterSpread: 0.24,
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
  leafSize: 0.9,
  leafDensity: 1.0,
  leafDepthMin: 1,
  leafTextureType: 'cluster',
  leafClusterStyle: 'tuft',
  leafClusterCount: 14,
  leafClusterSpread: 0.14,
  barkTexture: 'pine',
  leafTexture: 'pine',
}

export const BIRCH: SpeciesConfig = {
  name: 'birch',
  axiom: 'U',
  rules: [
    {
      predecessor: 'U',
      successor: 'FFFV',
    },
    {
      predecessor: 'V',
      successor: 'F[+!B]S[-!B]FW',
    },
    {
      predecessor: 'W',
      successor: 'F[-!B]S[+!B]FX',
    },
    {
      predecessor: 'X',
      successor: 'F[+!B]S[-!B]S[+!B]X',
    },
    {
      predecessor: 'B',
      successor: 'F[+!B]S[-!B]&F&&S',
    },
  ],
  iterations: 8,
  angle: 24,
  angleVariance: 14,
  lengthScale: 0.94,
  lengthDecay: 0.95,
  shortStepJitter: 0,
  initialRadius: 0.053,
  segmentTaper: 0.993,
  radiusDecay: 0.76,
  branchSpin: 92,
  branchSpinJitter: 78,
  leafSize: 0.96,
  leafDensity: 0.95,
  leafDepthMin: 2,
  leafTextureType: 'cluster',
  leafClusterStyle: 'airy',
  leafClusterCount: 5,
  leafClusterSpread: 0.35,
  barkTexture: 'birch',
  leafTexture: 'birch',
}

// Maple: wide spreading crown, autumn colors.
// Similar branching to oak but with wider angles.
export const MAPLE: SpeciesConfig = {
  name: 'maple',
  axiom: 'U',
  rules: [
    {
      predecessor: 'U',
      successor: 'FFV',
    },
    {
      predecessor: 'V',
      successor: 'F[+!B]S[-!B]S[+!B]S[-!B]S[+!B]W',
    },
    {
      predecessor: 'W',
      successor: 'F[+!B]S[-!B]S[+!B]S[-!B]W',
    },
    {
      predecessor: 'B',
      successor: 'F[+!B]S[-!B]S[+!B]S[-!B]F',
    },
  ],
  iterations: 6,
  angle: 30,
  angleVariance: 10,
  lengthScale: 1.0,
  lengthDecay: 0.92,
  shortStepJitter: 0,
  initialRadius: 0.25,
  segmentTaper: 0.988,
  radiusDecay: 0.83,
  branchSpin: 90,
  branchSpinJitter: 34,
  leafSize: 1.62,
  leafDensity: 1.05,
  leafDepthMin: 1,
  leafTextureType: 'cluster',
  leafClusterStyle: 'classic',
  leafClusterCount: 8,
  leafClusterSpread: 0.22,
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
      successor: 'F[+!B]S[-!B]S[+!B]S[-!B]S[+!B]S[-!B]',
    },
    {
      predecessor: 'B',
      successor: 'F[+!B]S[-!B]S[+!B]S[-!B]F',
    },
  ],
  iterations: 5,
  angle: 32,
  angleVariance: 10,
  lengthScale: 0.92,
  lengthDecay: 0.9,
  shortStepJitter: 0,
  initialRadius: 0.17,
  segmentTaper: 0.986,
  radiusDecay: 0.78,
  branchSpin: 90,
  branchSpinJitter: 34,
  leafSize: 0.98,
  leafDensity: 0.98,
  leafDepthMin: 1,
  leafTextureType: 'cluster',
  leafClusterStyle: 'blossom',
  leafClusterCount: 6,
  leafClusterSpread: 0.34,
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
