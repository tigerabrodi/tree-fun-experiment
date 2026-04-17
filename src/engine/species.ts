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
  initialRadius: number
  segmentTaper: number
  radiusDecay: number
  branchSpin: number
  branchSpinJitter: number
  leafSize: number
  leafDensity: number
  leafDepthMin: number
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
  initialRadius: 0.16,
  segmentTaper: 0.987,
  radiusDecay: 0.7,
  branchSpin: 90,
  branchSpinJitter: 10,
  leafSize: 0.78,
  leafDensity: 0.96,
  leafDepthMin: 1,
  leafClusterCount: 4,
  leafClusterSpread: 0.26,
  barkTexture: 'oak',
  leafTexture: 'oak',
}

// Pine: central trunk keeps growing. Whorled branches at each level.
export const PINE: SpeciesConfig = {
  name: 'pine',
  axiom: 'FFA',
  rules: [
    {
      predecessor: 'A',
      successor: '!F[&&&B]//[&&&B]S//[&&&B]S//[&&&B]SA',
    },
    { predecessor: 'B', successor: 'FF[+F][/+F][-F][\\-F]F' },
  ],
  iterations: 6,
  angle: 20,
  angleVariance: 3,
  lengthScale: 0.68,
  lengthDecay: 0.9,
  initialRadius: 0.18,
  segmentTaper: 0.985,
  radiusDecay: 0.82,
  branchSpin: 0,
  branchSpinJitter: 0,
  leafSize: 0.58,
  leafDensity: 1.0,
  leafDepthMin: 2,
  leafClusterCount: 3,
  leafClusterSpread: 0.18,
  barkTexture: 'pine',
  leafTexture: 'pine',
}

export const BIRCH: SpeciesConfig = {
  name: 'birch',
  axiom: 'T',
  rules: [
    {
      predecessor: 'T',
      successor: 'F[+!B]S[-!B]S[+!B]',
    },
    {
      predecessor: 'B',
      successor: 'F[+!B]S[-!B]F',
    },
  ],
  iterations: 6,
  angle: 24,
  angleVariance: 10,
  lengthScale: 0.82,
  lengthDecay: 0.92,
  initialRadius: 0.08,
  segmentTaper: 0.989,
  radiusDecay: 0.68,
  branchSpin: 141,
  branchSpinJitter: 18,
  leafSize: 0.62,
  leafDensity: 0.92,
  leafDepthMin: 2,
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
  initialRadius: 0.14,
  segmentTaper: 0.987,
  radiusDecay: 0.7,
  branchSpin: 90,
  branchSpinJitter: 12,
  leafSize: 0.82,
  leafDensity: 0.98,
  leafDepthMin: 2,
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
  initialRadius: 0.12,
  segmentTaper: 0.985,
  radiusDecay: 0.7,
  branchSpin: 90,
  branchSpinJitter: 10,
  leafSize: 0.74,
  leafDensity: 0.9,
  leafDepthMin: 2,
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
