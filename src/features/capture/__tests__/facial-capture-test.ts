import { defaultExpression } from '@/features/avatar/presets'
import {
  captureFrameFromMediaPipe,
  createFacialCaptureSmoother,
  headCaptureFromMatrix,
  mirrorCaptureFrame,
  observeExpression,
  positionCaptureFromMatrix,
  retargetCaptureFrame,
} from '@/features/capture/facialCapture'

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

describe('facial capture adapter', () => {
  it('extracts a neutral orientation from an identity transform', () => {
    expect(headCaptureFromMatrix(identity)).toEqual({ pitch: 0, yaw: -0, roll: 0 })
  })

  it('extracts metric translation from the facial transform', () => {
    const translated = [...identity]
    translated[12] = 2.5
    translated[13] = -1.25
    translated[14] = -42

    expect(positionCaptureFromMatrix(translated)).toEqual({ x: 2.5, y: -1.25, z: -42 })
  })

  it('keeps eye and future mouth signals from MediaPipe', () => {
    const frame = captureFrameFromMediaPipe(
      {
        eyeBlinkLeft: 0.8,
        eyeWideRight: 0.35,
        eyeLookOutLeft: 0.6,
        eyeLookInRight: 0.6,
        jawOpen: 0.7,
        mouthSmileLeft: 0.4,
      },
      identity,
      42
    )

    expect(frame.eyes.left.blink).toBe(0.8)
    expect(frame.eyes.right.wide).toBe(0.35)
    expect(frame.eyes.lookX).toBe(0.6)
    expect(frame.mouth.jawOpen).toBe(0.7)
    expect(frame.mouth.smileLeft).toBe(0.4)
    expect(frame.brows.downLeft).toBe(0)
  })

  it('observes expressive facial patterns without changing retargeting', () => {
    const smiling = captureFrameFromMediaPipe(
      {
        mouthSmileLeft: 0.92,
        mouthSmileRight: 0.88,
        eyeSquintLeft: 0.5,
        eyeSquintRight: 0.46,
        jawOpen: 0.04,
      },
      identity,
      16
    )
    const angry = captureFrameFromMediaPipe(
      {
        browDownLeft: 0.9,
        browDownRight: 0.84,
        mouthPressLeft: 0.72,
        mouthPressRight: 0.68,
      },
      identity,
      32
    )

    expect(observeExpression(smiling).id).toBe('smile')
    expect(observeExpression(angry).id).toBe('angry')
  })

  it('retargets rotation, gaze and blink relative to calibration', () => {
    const neutral = captureFrameFromMediaPipe({}, identity, 0)
    const performance = captureFrameFromMediaPipe(
      { eyeBlinkLeft: 0.9, eyeBlinkRight: 0.85, eyeLookUpLeft: 0.5, eyeLookUpRight: 0.5 },
      identity,
      16
    )
    performance.head.yaw = 20
    performance.position = { x: 2, y: -3, z: 4 }
    const retargeted = retargetCaptureFrame(performance, neutral, defaultExpression)

    expect(retargeted.expression.headY).toBe(-20)
    expect(retargeted.expression.positionYLeft).toBeLessThan(defaultExpression.positionYLeft)
    expect(retargeted.blinkAmount).toBeCloseTo(0.035)
    expect(retargeted.signals.positionX).toBe(10)
    expect(retargeted.signals.positionY).toBe(15)
    expect(retargeted.signals.positionZ).toBeCloseTo(0.14)
  })

  it('mirrors horizontal movement without double-inverting renderer roll or blink channels', () => {
    const frame = captureFrameFromMediaPipe(
      { eyeBlinkLeft: 0.8, eyeBlinkRight: 0.2, eyeLookOutLeft: 0.6, eyeLookInRight: 0.6 },
      identity,
      16
    )
    frame.head = { pitch: 8, yaw: 21, roll: -12 }
    frame.position = { x: 4, y: -2, z: -40 }

    const mirrored = mirrorCaptureFrame(frame)

    expect(mirrored.head).toEqual({ pitch: 8, yaw: -21, roll: -12 })
    expect(mirrored.eyes.lookX).toBe(-0.6)
    expect(mirrored.eyes.left.blink).toBe(0.8)
    expect(mirrored.eyes.right.blink).toBe(0.2)
    expect(mirrored.position).toEqual({ x: -4, y: -2, z: -40 })
  })

  it('smooths discontinuities while converging toward the latest frame', () => {
    const smoother = createFacialCaptureSmoother()
    const first = captureFrameFromMediaPipe({}, identity, 0)
    const next = captureFrameFromMediaPipe({ eyeBlinkLeft: 1 }, identity, 16)
    next.head.pitch = 30

    smoother.next(first)
    const smoothed = smoother.next(next)

    expect(smoothed.head.pitch).toBeGreaterThan(0)
    expect(smoothed.head.pitch).toBeLessThan(30)
    expect(smoothed.eyes.left.blink).toBeGreaterThan(0)
    expect(smoothed.eyes.left.blink).toBeLessThan(1)
  })

  it('makes movement more inertial as smoothing increases', () => {
    const responsive = createFacialCaptureSmoother(0)
    const fluid = createFacialCaptureSmoother(1)
    const first = captureFrameFromMediaPipe({}, identity, 0)
    const next = captureFrameFromMediaPipe({}, identity, 16)
    next.head.yaw = 30

    responsive.next(first)
    fluid.next(first)

    expect(responsive.next(next).head.yaw).toBeGreaterThan(fluid.next(next).head.yaw)
  })
})
