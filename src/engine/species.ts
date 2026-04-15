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
  radiusDecay: number
  leafSize: number
  barkTexture: string
  leafTexture: string
}

export const OAK: SpeciesConfig = {
  name: 'oak',
  axiom: 'FA',
  rules: [
    { predecessor: 'A', successor: '[&FL!A]////[&FL!A]////[&FL!A]' },
    { predecessor: 'F', successor: 'S//F' },
    { predecessor: 'S', successor: 'F' },
    { predecessor: 'L', successor: '[^^-F+F+F-|-F+F+F]' },
  ],
  iterations: 4,
  angle: 28,
  angleVariance: 8,
  lengthScale: 1.2,
  lengthDecay: 0.82,
  initialRadius: 0.15,
  radiusDecay: 0.72,
  leafSize: 1.4,
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
  radiusDecay: 0.82,
  leafSize: 1.0,
  barkTexture: 'pine',
  leafTexture: 'pine',
}

export const BIRCH: SpeciesConfig = {
  name: 'birch',
  axiom: 'FA',
  rules: [
    { predecessor: 'A', successor: '[&FL!A]/////[&FL!A]///////[&FL!A]' },
    { predecessor: 'F', successor: 'S/F' },
    { predecessor: 'S', successor: 'F' },
    { predecessor: 'L', successor: '[^^F-F+F]' },
  ],
  iterations: 4,
  angle: 24,
  angleVariance: 10,
  lengthScale: 1.1,
  lengthDecay: 0.85,
  initialRadius: 0.08,
  radiusDecay: 0.68,
  leafSize: 0.9,
  barkTexture: 'birch',
  leafTexture: 'birch',
}

// Maple: wide spreading crown, autumn colors.
// Similar branching to oak but with wider angles.
export const MAPLE: SpeciesConfig = {
  name: 'maple',
  axiom: 'FA',
  rules: [
    { predecessor: 'A', successor: '[&FL!A]///[&FL!A]///[&FL!A]' },
    { predecessor: 'F', successor: 'S/F' },
    { predecessor: 'S', successor: 'F' },
    { predecessor: 'L', successor: '[^^-F+F-|-F+F]' },
  ],
  iterations: 4,
  angle: 32,
  angleVariance: 10,
  lengthScale: 1.1,
  lengthDecay: 0.84,
  initialRadius: 0.14,
  radiusDecay: 0.7,
  leafSize: 1.3,
  barkTexture: 'maple',
  leafTexture: 'maple',
}

// Sakura: graceful spreading branches, cherry blossoms.
// Lower branching angle, more horizontal spread.
export const SAKURA: SpeciesConfig = {
  name: 'sakura',
  axiom: 'FFA',
  rules: [
    { predecessor: 'A', successor: '[&&FL!A]////[&&FL!A]////[&&FL!A]' },
    { predecessor: 'F', successor: 'S//F' },
    { predecessor: 'S', successor: 'F' },
    { predecessor: 'L', successor: '[^^-F+F+F]' },
  ],
  iterations: 4,
  angle: 35,
  angleVariance: 12,
  lengthScale: 0.9,
  lengthDecay: 0.83,
  initialRadius: 0.12,
  radiusDecay: 0.7,
  leafSize: 1.1,
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
