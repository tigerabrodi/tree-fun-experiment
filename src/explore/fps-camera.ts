function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export interface ExploreLookState {
  pitch: number
  yaw: number
}

export interface ExplorePlanarMovementState {
  positionX: number
  positionZ: number
  velocityX: number
  velocityZ: number
}

export interface ExploreJumpState {
  isGrounded: boolean
  positionY: number
  velocityY: number
}

export function applyExploreLookDelta(
  state: ExploreLookState,
  deltaX: number,
  deltaY: number,
  sensitivity: number,
  maxPitch: number
): ExploreLookState {
  return {
    pitch: clamp(state.pitch - deltaY * sensitivity, -maxPitch, maxPitch),
    yaw: state.yaw + deltaX * sensitivity,
  }
}

export function stepExplorePlanarMovement(
  state: ExplorePlanarMovementState,
  options: {
    acceleration: number
    deceleration: number
    deltaSeconds: number
    forward: number
    strafe: number
    isSprinting: boolean
    sprintSpeed: number
    walkSpeed: number
    yaw: number
  }
): ExplorePlanarMovementState {
  const safeDeltaSeconds = Math.min(Math.max(options.deltaSeconds, 1 / 240), 0.2)
  const forwardX = Math.cos(options.yaw)
  const forwardZ = Math.sin(options.yaw)
  const rightX = -forwardZ
  const rightZ = forwardX

  let moveX = forwardX * options.forward + rightX * options.strafe
  let moveZ = forwardZ * options.forward + rightZ * options.strafe

  const moveLength = Math.hypot(moveX, moveZ)
  if (moveLength > 0) {
    moveX /= moveLength
    moveZ /= moveLength
  }

  const targetSpeed = options.isSprinting
    ? options.sprintSpeed
    : options.walkSpeed
  const targetVelocityX = moveX * targetSpeed
  const targetVelocityZ = moveZ * targetSpeed
  const sharpness = moveLength > 0 ? options.acceleration : options.deceleration
  const blend = 1 - Math.exp(-sharpness * safeDeltaSeconds)
  const velocityX =
    state.velocityX + (targetVelocityX - state.velocityX) * blend
  const velocityZ =
    state.velocityZ + (targetVelocityZ - state.velocityZ) * blend

  return {
    positionX: state.positionX + velocityX * safeDeltaSeconds,
    positionZ: state.positionZ + velocityZ * safeDeltaSeconds,
    velocityX,
    velocityZ,
  }
}

export function stepExploreJumpMovement(
  state: ExploreJumpState,
  options: {
    deltaSeconds: number
    gravity: number
    groundHeight: number
    isJumpPressed: boolean
    jumpSpeed: number
  }
): ExploreJumpState {
  const safeDeltaSeconds = Math.min(Math.max(options.deltaSeconds, 1 / 240), 0.2)
  const shouldStartJump = state.isGrounded && options.isJumpPressed
  let velocityY = shouldStartJump ? options.jumpSpeed : state.velocityY
  let positionY = state.positionY
  let isGrounded = state.isGrounded

  if (shouldStartJump) {
    isGrounded = false
  }

  if (!isGrounded) {
    velocityY -= options.gravity * safeDeltaSeconds
    positionY += velocityY * safeDeltaSeconds
  }

  if (positionY <= options.groundHeight) {
    return {
      isGrounded: true,
      positionY: options.groundHeight,
      velocityY: 0,
    }
  }

  return {
    isGrounded: false,
    positionY,
    velocityY,
  }
}
