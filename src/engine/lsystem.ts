import type { LSystemRule, SpeciesConfig } from './species'

// Pure L-system string generation. No Three.js dependency.

export function applyRules(input: string, rules: Array<LSystemRule>): string {
  let result = ''
  for (const char of input) {
    const rule = rules.find((r) => r.predecessor === char)
    if (!rule) {
      result += char
      continue
    }
    if (rule.probability !== undefined && Math.random() >= rule.probability) {
      result += char
      continue
    }
    result += rule.successor
  }
  return result
}

export function generateLString(config: SpeciesConfig): string {
  let current = config.axiom
  for (let i = 0; i < config.iterations; i++) {
    current = applyRules(current, config.rules)
  }
  return current
}

// Turtle state as plain arrays for testability without Three.js
export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface TreeSegment {
  start: Vec3
  end: Vec3
  startRadius: number
  endRadius: number
  depth: number
}

export interface LeafPoint {
  position: Vec3
  direction: Vec3
  up: Vec3
}

interface TurtleState {
  position: Vec3
  heading: Vec3
  left: Vec3
  up: Vec3
  length: number
  radius: number
  depth: number
}

function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z }
}

function cloneVec3(v: Vec3): Vec3 {
  return { x: v.x, y: v.y, z: v.z }
}

function addScaled(a: Vec3, b: Vec3, s: number): Vec3 {
  return { x: a.x + b.x * s, y: a.y + b.y * s, z: a.z + b.z * s }
}

function rotateAroundAxis(v: Vec3, axis: Vec3, angle: number): Vec3 {
  // Rodrigues rotation formula
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  const dot = v.x * axis.x + v.y * axis.y + v.z * axis.z

  // cross = axis x v
  const crossX = axis.y * v.z - axis.z * v.y
  const crossY = axis.z * v.x - axis.x * v.z
  const crossZ = axis.x * v.y - axis.y * v.x

  return {
    x: v.x * cosA + crossX * sinA + axis.x * dot * (1 - cosA),
    y: v.y * cosA + crossY * sinA + axis.y * dot * (1 - cosA),
    z: v.z * cosA + crossZ * sinA + axis.z * dot * (1 - cosA),
  }
}

function cloneState(s: TurtleState): TurtleState {
  return {
    position: cloneVec3(s.position),
    heading: cloneVec3(s.heading),
    left: cloneVec3(s.left),
    up: cloneVec3(s.up),
    length: s.length,
    radius: s.radius,
    depth: s.depth,
  }
}

function rotateFrameAroundHeading(state: TurtleState, angle: number) {
  state.left = rotateAroundAxis(state.left, state.heading, angle)
  state.up = rotateAroundAxis(state.up, state.heading, angle)
}

export function interpretLString(
  lstring: string,
  config: SpeciesConfig,
  seed?: number
): { segments: Array<TreeSegment>; leaves: Array<LeafPoint> } {
  const segments: Array<TreeSegment> = []
  const leaves: Array<LeafPoint> = []
  const stack: Array<TurtleState> = []

  const baseAngle = (config.angle * Math.PI) / 180
  const variance = (config.angleVariance * Math.PI) / 180
  const branchSpin = (config.branchSpin * Math.PI) / 180
  const branchSpinJitter = (config.branchSpinJitter * Math.PI) / 180

  // Simple seeded random for reproducibility in tests
  let rng = seed ?? Math.random() * 99999
  let branchCount = 0
  function random(): number {
    rng = (rng * 16807 + 0) % 2147483647
    return rng / 2147483647
  }

  function jitterAngle(): number {
    return baseAngle + (random() - 0.5) * 2 * variance
  }

  function addLeafPoint(position: Vec3 = state.position) {
    leaves.push({
      position: cloneVec3(position),
      direction: cloneVec3(state.heading),
      up: cloneVec3(state.up),
    })
  }

  function addTerminalCrownCluster() {
    const tip = cloneVec3(state.position)
    const sideOffset = state.length * 0.18
    const upOffset = state.length * 0.12

    addLeafPoint(tip)
    addLeafPoint(addScaled(tip, state.left, sideOffset))
    addLeafPoint(addScaled(tip, state.left, -sideOffset))
    addLeafPoint(addScaled(tip, state.up, upOffset))
    addLeafPoint(addScaled(tip, state.up, -upOffset * 0.4))
    addLeafPoint(
      addScaled(
        addScaled(tip, state.left, sideOffset * 0.7),
        state.up,
        upOffset * 0.6
      )
    )
    addLeafPoint(
      addScaled(
        addScaled(tip, state.left, -sideOffset * 0.7),
        state.up,
        upOffset * 0.6
      )
    )
  }

  const state: TurtleState = {
    position: vec3(0, 0, 0),
    heading: vec3(0, 1, 0),
    left: vec3(-1, 0, 0),
    up: vec3(0, 0, 1),
    length: config.lengthScale,
    radius: config.initialRadius,
    depth: 0,
  }

  for (const char of lstring) {
    switch (char) {
      case 'S': {
        const stepLength = char === 'S' ? state.length * 0.55 : state.length
        const start = cloneVec3(state.position)
        const end = addScaled(state.position, state.heading, stepLength)
        const nextRadius = state.radius * config.segmentTaper
        segments.push({
          start,
          end,
          startRadius: state.radius,
          endRadius: nextRadius,
          depth: state.depth,
        })
        state.position = end
        state.length *= config.lengthDecay
        state.radius = nextRadius
        break
      }
      case 'F': {
        const start = cloneVec3(state.position)
        const end = addScaled(state.position, state.heading, state.length)
        const nextRadius = state.radius * config.segmentTaper
        segments.push({
          start,
          end,
          startRadius: state.radius,
          endRadius: nextRadius,
          depth: state.depth,
        })
        state.position = end
        state.length *= config.lengthDecay
        state.radius = nextRadius
        break
      }
      case '+': {
        const a = jitterAngle()
        state.heading = rotateAroundAxis(state.heading, state.up, a)
        state.left = rotateAroundAxis(state.left, state.up, a)
        break
      }
      case '-': {
        const a = jitterAngle()
        state.heading = rotateAroundAxis(state.heading, state.up, -a)
        state.left = rotateAroundAxis(state.left, state.up, -a)
        break
      }
      case '&': {
        const a = jitterAngle()
        state.heading = rotateAroundAxis(state.heading, state.left, a)
        state.up = rotateAroundAxis(state.up, state.left, a)
        break
      }
      case '^': {
        const a = jitterAngle()
        state.heading = rotateAroundAxis(state.heading, state.left, -a)
        state.up = rotateAroundAxis(state.up, state.left, -a)
        break
      }
      case '/': {
        const a = jitterAngle()
        state.left = rotateAroundAxis(state.left, state.heading, a)
        state.up = rotateAroundAxis(state.up, state.heading, a)
        break
      }
      case '\\': {
        const a = jitterAngle()
        state.left = rotateAroundAxis(state.left, state.heading, -a)
        state.up = rotateAroundAxis(state.up, state.heading, -a)
        break
      }
      case '|': {
        state.heading = rotateAroundAxis(state.heading, state.up, Math.PI)
        state.left = rotateAroundAxis(state.left, state.up, Math.PI)
        break
      }
      case '!': {
        state.radius *= config.radiusDecay
        break
      }
      case '[': {
        stack.push(cloneState(state))
        state.depth++
        if (branchSpin !== 0) {
          branchCount++
          const spinJitter = (random() - 0.5) * 2 * branchSpinJitter
          rotateFrameAroundHeading(state, branchCount * branchSpin + spinJitter)
        }
        break
      }
      case ']': {
        if (
          state.depth >= config.leafDepthMin &&
          random() <= config.leafDensity
        ) {
          addLeafPoint()
        }
        const popped = stack.pop()
        if (popped) {
          state.position = popped.position
          state.heading = popped.heading
          state.left = popped.left
          state.up = popped.up
          state.length = popped.length
          state.radius = popped.radius
          state.depth = popped.depth
        }
        break
      }
      case 'T':
      case 'A': {
        if (config.leafDensity > 0) {
          addTerminalCrownCluster()
        }
        break
      }
      default:
        break
    }
  }

  return { segments, leaves }
}
