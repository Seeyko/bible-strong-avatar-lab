import { clamp, type Expression } from '@/features/avatar/geometry'

export type HeadCapture = {
  pitch: number
  yaw: number
  roll: number
}

export type PositionCapture = {
  x: number
  y: number
  z: number
}

export type EyeCapture = {
  blink: number
  wide: number
  squint: number
}

export type MouthCapture = {
  jawOpen: number
  smileLeft: number
  smileRight: number
  frownLeft: number
  frownRight: number
  pucker: number
  funnel: number
  left: number
  right: number
  pressLeft: number
  pressRight: number
}

export type BrowCapture = {
  downLeft: number
  downRight: number
  innerUp: number
  outerUpLeft: number
  outerUpRight: number
}

export type FacialCaptureFrame = {
  timestamp: number
  head: HeadCapture
  position: PositionCapture
  eyes: {
    left: EyeCapture
    right: EyeCapture
    lookX: number
    lookY: number
  }
  brows: BrowCapture
  mouth: MouthCapture
}

export type ObservedExpression = {
  id: 'neutral' | 'smile' | 'laugh' | 'angry' | 'surprised' | 'sad'
  label: string
  confidence: number
  scores: {
    smile: number
    laugh: number
    angry: number
    surprised: number
    sad: number
  }
}

export type RetargetedCapture = {
  expression: Expression
  blinkAmount: number
  signals: {
    lookX: number
    lookY: number
    blinkLeft: number
    blinkRight: number
    positionX: number
    positionY: number
    positionZ: number
  }
}

const degrees = (radians: number) => (radians * 180) / Math.PI
const score = (scores: Readonly<Record<string, number>>, name: string) => scores[name] ?? 0

export const headCaptureFromMatrix = (matrix: readonly number[]): HeadCapture => {
  if (matrix.length < 11) return { pitch: 0, yaw: 0, roll: 0 }
  const horizontalScale = Math.hypot(matrix[0], matrix[4])
  const singular = horizontalScale < 0.000001
  const pitch = singular ? Math.atan2(-matrix[6], matrix[5]) : Math.atan2(matrix[9], matrix[10])
  const yaw = Math.atan2(-matrix[8], horizontalScale)
  const roll = singular ? 0 : Math.atan2(matrix[4], matrix[0])
  return { pitch: degrees(pitch), yaw: degrees(yaw), roll: degrees(roll) }
}

export const positionCaptureFromMatrix = (matrix: readonly number[]): PositionCapture => ({
  x: matrix[12] ?? 0,
  y: matrix[13] ?? 0,
  z: matrix[14] ?? 0,
})

export const captureFrameFromMediaPipe = (
  scores: Readonly<Record<string, number>>,
  matrix: readonly number[],
  timestamp: number
): FacialCaptureFrame => {
  const lookRight = (score(scores, 'eyeLookOutLeft') + score(scores, 'eyeLookInRight')) / 2
  const lookLeft = (score(scores, 'eyeLookInLeft') + score(scores, 'eyeLookOutRight')) / 2
  const lookUp = (score(scores, 'eyeLookUpLeft') + score(scores, 'eyeLookUpRight')) / 2
  const lookDown = (score(scores, 'eyeLookDownLeft') + score(scores, 'eyeLookDownRight')) / 2
  return {
    timestamp,
    head: headCaptureFromMatrix(matrix),
    position: positionCaptureFromMatrix(matrix),
    eyes: {
      left: {
        blink: score(scores, 'eyeBlinkLeft'),
        wide: score(scores, 'eyeWideLeft'),
        squint: score(scores, 'eyeSquintLeft'),
      },
      right: {
        blink: score(scores, 'eyeBlinkRight'),
        wide: score(scores, 'eyeWideRight'),
        squint: score(scores, 'eyeSquintRight'),
      },
      lookX: clamp(lookRight - lookLeft, -1, 1),
      lookY: clamp(lookUp - lookDown, -1, 1),
    },
    brows: {
      downLeft: score(scores, 'browDownLeft'),
      downRight: score(scores, 'browDownRight'),
      innerUp: score(scores, 'browInnerUp'),
      outerUpLeft: score(scores, 'browOuterUpLeft'),
      outerUpRight: score(scores, 'browOuterUpRight'),
    },
    mouth: {
      jawOpen: score(scores, 'jawOpen'),
      smileLeft: score(scores, 'mouthSmileLeft'),
      smileRight: score(scores, 'mouthSmileRight'),
      frownLeft: score(scores, 'mouthFrownLeft'),
      frownRight: score(scores, 'mouthFrownRight'),
      pucker: score(scores, 'mouthPucker'),
      funnel: score(scores, 'mouthFunnel'),
      left: score(scores, 'mouthLeft'),
      right: score(scores, 'mouthRight'),
      pressLeft: score(scores, 'mouthPressLeft'),
      pressRight: score(scores, 'mouthPressRight'),
    },
  }
}

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount
const mixEye = (from: EyeCapture, to: EyeCapture, amount: number): EyeCapture => ({
  blink: mix(from.blink, to.blink, amount),
  wide: mix(from.wide, to.wide, amount),
  squint: mix(from.squint, to.squint, amount),
})
const mixBrows = (from: BrowCapture, to: BrowCapture, amount: number): BrowCapture => ({
  downLeft: mix(from.downLeft, to.downLeft, amount),
  downRight: mix(from.downRight, to.downRight, amount),
  innerUp: mix(from.innerUp, to.innerUp, amount),
  outerUpLeft: mix(from.outerUpLeft, to.outerUpLeft, amount),
  outerUpRight: mix(from.outerUpRight, to.outerUpRight, amount),
})
const mixMouth = (from: MouthCapture, to: MouthCapture, amount: number): MouthCapture => ({
  jawOpen: mix(from.jawOpen, to.jawOpen, amount),
  smileLeft: mix(from.smileLeft, to.smileLeft, amount),
  smileRight: mix(from.smileRight, to.smileRight, amount),
  frownLeft: mix(from.frownLeft, to.frownLeft, amount),
  frownRight: mix(from.frownRight, to.frownRight, amount),
  pucker: mix(from.pucker, to.pucker, amount),
  funnel: mix(from.funnel, to.funnel, amount),
  left: mix(from.left, to.left, amount),
  right: mix(from.right, to.right, amount),
  pressLeft: mix(from.pressLeft, to.pressLeft, amount),
  pressRight: mix(from.pressRight, to.pressRight, amount),
})

const average = (left: number, right: number) => (left + right) / 2

export const observeExpression = (frame: FacialCaptureFrame): ObservedExpression => {
  const smile = average(frame.mouth.smileLeft, frame.mouth.smileRight)
  const frown = average(frame.mouth.frownLeft, frame.mouth.frownRight)
  const mouthPress = average(frame.mouth.pressLeft, frame.mouth.pressRight)
  const eyeSquint = average(frame.eyes.left.squint, frame.eyes.right.squint)
  const eyeWide = average(frame.eyes.left.wide, frame.eyes.right.wide)
  const browDown = average(frame.brows.downLeft, frame.brows.downRight)
  const browOuterUp = average(frame.brows.outerUpLeft, frame.brows.outerUpRight)
  const jawOpen = frame.mouth.jawOpen

  const scores = {
    smile: clamp(smile * 0.78 + eyeSquint * 0.22, 0, 1),
    laugh: clamp(smile * 0.5 + jawOpen * 0.35 + eyeSquint * 0.15, 0, 1),
    angry: clamp(browDown * 0.5 + eyeSquint * 0.2 + mouthPress * 0.3, 0, 1),
    surprised: clamp(
      browOuterUp * 0.3 + frame.brows.innerUp * 0.2 + eyeWide * 0.25 + jawOpen * 0.25,
      0,
      1
    ),
    sad: clamp(frame.brows.innerUp * 0.45 + frown * 0.55, 0, 1),
  }
  const candidates = [
    { id: 'smile' as const, label: 'Smile', confidence: scores.smile },
    { id: 'laugh' as const, label: 'Laugh-like', confidence: scores.laugh },
    { id: 'angry' as const, label: 'Angry-like', confidence: scores.angry },
    { id: 'surprised' as const, label: 'Surprised-like', confidence: scores.surprised },
    { id: 'sad' as const, label: 'Sad-like', confidence: scores.sad },
  ].sort((left, right) => right.confidence - left.confidence)
  const strongest = candidates[0]

  if (!strongest || strongest.confidence < 0.3) {
    return {
      id: 'neutral',
      label: 'Neutral / unclear',
      confidence: 1 - (strongest?.confidence ?? 0),
      scores,
    }
  }
  return { ...strongest, scores }
}

export const mirrorCaptureFrame = (frame: FacialCaptureFrame): FacialCaptureFrame => ({
  ...frame,
  head: {
    pitch: frame.head.pitch,
    yaw: -frame.head.yaw,
    // The renderer's Z axis already compensates for SVG's downward Y axis.
    // Keeping MediaPipe's roll here avoids mirroring that rotation twice.
    roll: frame.head.roll,
  },
  position: {
    x: -frame.position.x,
    y: frame.position.y,
    z: frame.position.z,
  },
  eyes: {
    ...frame.eyes,
    lookX: -frame.eyes.lookX,
  },
})

export const createFacialCaptureSmoother = (initialSmoothing = 0.58) => {
  let previous: FacialCaptureFrame | null = null
  let smoothing = clamp(initialSmoothing, 0, 1)
  return {
    next(frame: FacialCaptureFrame) {
      if (!previous) {
        previous = frame
        return frame
      }
      const elapsed = clamp(frame.timestamp - previous.timestamp, 1, 100)
      const smoothingCurve = smoothing ** 2
      const headResponse = mix(18, 298, smoothingCurve)
      const featureResponse = mix(12, 122, smoothingCurve)
      const headAmount = 1 - Math.exp(-elapsed / headResponse)
      const featureAmount = 1 - Math.exp(-elapsed / featureResponse)
      const next: FacialCaptureFrame = {
        timestamp: frame.timestamp,
        head: {
          pitch: mix(previous.head.pitch, frame.head.pitch, headAmount),
          yaw: mix(previous.head.yaw, frame.head.yaw, headAmount),
          roll: mix(previous.head.roll, frame.head.roll, headAmount),
        },
        position: {
          x: mix(previous.position.x, frame.position.x, headAmount),
          y: mix(previous.position.y, frame.position.y, headAmount),
          z: mix(previous.position.z, frame.position.z, headAmount),
        },
        eyes: {
          left: mixEye(previous.eyes.left, frame.eyes.left, featureAmount),
          right: mixEye(previous.eyes.right, frame.eyes.right, featureAmount),
          lookX: mix(previous.eyes.lookX, frame.eyes.lookX, featureAmount),
          lookY: mix(previous.eyes.lookY, frame.eyes.lookY, featureAmount),
        },
        brows: mixBrows(previous.brows, frame.brows, featureAmount),
        mouth: mixMouth(previous.mouth, frame.mouth, featureAmount),
      }
      previous = next
      return next
    },
    reset() {
      previous = null
    },
    setSmoothing(nextSmoothing: number) {
      smoothing = clamp(nextSmoothing, 0, 1)
    },
  }
}

export const retargetCaptureFrame = (
  frame: FacialCaptureFrame,
  neutral: FacialCaptureFrame,
  base: Expression
): RetargetedCapture => {
  const blinkLeft = clamp((frame.eyes.left.blink - neutral.eyes.left.blink) * 1.65, 0, 1)
  const blinkRight = clamp((frame.eyes.right.blink - neutral.eyes.right.blink) * 1.65, 0, 1)
  const leftWide = frame.eyes.left.wide - neutral.eyes.left.wide
  const rightWide = frame.eyes.right.wide - neutral.eyes.right.wide
  const leftSquint = frame.eyes.left.squint - neutral.eyes.left.squint
  const rightSquint = frame.eyes.right.squint - neutral.eyes.right.squint
  const lookX = clamp((frame.eyes.lookX - neutral.eyes.lookX) * 1.35, -1, 1)
  const lookY = clamp((frame.eyes.lookY - neutral.eyes.lookY) * 1.35, -1, 1)
  const positionX = clamp((frame.position.x - neutral.position.x) * 5, -55, 55)
  const positionY = clamp((frame.position.y - neutral.position.y) * -5, -55, 55)
  const positionZ = clamp((frame.position.z - neutral.position.z) * 0.035, -0.38, 0.48)
  const expression: Expression = {
    ...base,
    headX: base.headX + clamp(frame.head.pitch - neutral.head.pitch, -38, 38),
    headY: base.headY - clamp(frame.head.yaw - neutral.head.yaw, -52, 52),
    headZ: base.headZ - clamp(frame.head.roll - neutral.head.roll, -42, 42),
    widthLeft: clamp(base.widthLeft * (1 - leftSquint * 0.16), 10, 100),
    widthRight: clamp(base.widthRight * (1 - rightSquint * 0.16), 10, 100),
    heightLeft: clamp(base.heightLeft * (1 + leftWide * 0.72 - leftSquint * 0.32), 10, 100),
    heightRight: clamp(base.heightRight * (1 + rightWide * 0.72 - rightSquint * 0.32), 10, 100),
    positionXLeft: base.positionXLeft + lookX * 7.5,
    positionXRight: base.positionXRight + lookX * 7.5,
    positionYLeft: base.positionYLeft - lookY * 6,
    positionYRight: base.positionYRight - lookY * 6,
  }
  return {
    expression,
    blinkAmount: clamp(1 - Math.max(blinkLeft, blinkRight), 0.035, 1),
    signals: { lookX, lookY, blinkLeft, blinkRight, positionX, positionY, positionZ },
  }
}
