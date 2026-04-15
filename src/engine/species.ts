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
  leafSize: number
  barkTexture: string
  leafTexture: string
}

export const OAK: SpeciesConfig = {
  name: 'oak',
  axiom: 'T',
  rules: [
    {
      predecessor: 'T',
      successor: 'FF[+!B][-!B][//+!B][//-!B]T',
    },
    {
      predecessor: 'B',
      successor: 'F[+!B][-!B]F',
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
  leafSize: 0.8,
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
      successor: '!F[&&&BL]//[&&&BL]//[&&&BL]//[&&&BL]FA',
    },
    { predecessor: 'B', successor: 'FFL' },
  ],
  iterations: 6,
  angle: 28,
  angleVariance: 6,
  lengthScale: 0.55,
  lengthDecay: 0.9,
  initialRadius: 0.18,
  segmentTaper: 0.985,
  radiusDecay: 0.82,
  leafSize: 1.0,
  barkTexture: 'pine',
  leafTexture: 'pine',
}

export const BIRCH: SpeciesConfig = {
  name: 'birch',
  axiom: 'T',
  rules: [
    {
      predecessor: 'T',
      successor: 'FF[+!B][-!B]T',
    },
    {
      predecessor: 'B',
      successor: 'F[+!B][-!B]F',
    },
  ],
  iterations: 5,
  angle: 18,
  angleVariance: 8,
  lengthScale: 0.95,
  lengthDecay: 0.9,
  initialRadius: 0.08,
  segmentTaper: 0.989,
  radiusDecay: 0.68,
  leafSize: 0.65,
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
      successor: 'FF[+!B][-!B][//+!B][//-!B]T',
    },
    {
      predecessor: 'B',
      successor: 'F[+!B][-!B]F',
    },
  ],
  iterations: 5,
  angle: 34,
  angleVariance: 10,
  lengthScale: 0.95,
  lengthDecay: 0.9,
  initialRadius: 0.14,
  segmentTaper: 0.987,
  radiusDecay: 0.7,
  leafSize: 0.85,
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
      successor: 'F[+!B][-!B][//+!B][//-!B]FT',
    },
    {
      predecessor: 'B',
      successor: 'F[+!B][-!B]&F',
    },
  ],
  iterations: 5,
  angle: 32,
  angleVariance: 12,
  lengthScale: 0.85,
  lengthDecay: 0.9,
  initialRadius: 0.12,
  segmentTaper: 0.985,
  radiusDecay: 0.7,
  leafSize: 0.8,
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
