import {
  defaultMotionTakeSettings,
  processMotionTake,
  sampleMotionTake,
  type MotionTake,
} from '@/features/capture/motionTake'

const take: MotionTake = {
  duration: 40,
  samples: [
    {
      time: 0,
      pitch: 0,
      yaw: 0,
      roll: 0,
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      lookX: 0,
      lookY: 0,
      blink: 0,
    },
    {
      time: 20,
      pitch: 30,
      yaw: -20,
      roll: 10,
      positionX: 24,
      positionY: -12,
      positionZ: 0.25,
      lookX: 1,
      lookY: -1,
      blink: 1,
    },
    {
      time: 40,
      pitch: 0,
      yaw: 0,
      roll: 0,
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      lookX: 0,
      lookY: 0,
      blink: 0,
    },
  ],
}

describe('recorded motion take processing', () => {
  it('uses future and past samples to soften a captured spike', () => {
    const processed = processMotionTake(take, {
      ...defaultMotionTakeSettings,
      smoothing: 1,
      detailRetention: 0,
    })

    expect(processed.samples[1].pitch).toBeGreaterThan(0)
    expect(processed.samples[1].pitch).toBeLessThan(30)
    expect(processed.samples[0].pitch).toBe(0)
  })

  it('preserves raw movement at full detail while applying amplitude and speed', () => {
    const processed = processMotionTake(take, {
      smoothing: 1,
      detailRetention: 1,
      amplitude: 1.5,
      speed: 2,
    })

    expect(processed.samples[1].pitch).toBe(45)
    expect(processed.samples[1].blink).toBe(1)
    expect(processed.samples[1].positionX).toBe(36)
    expect(processed.duration).toBe(20)
  })

  it('interpolates processed channels at an arbitrary playhead time', () => {
    const sample = sampleMotionTake(take, 10)

    expect(sample?.pitch).toBeGreaterThan(14)
    expect(sample?.pitch).toBeLessThan(18)
    expect(sample?.yaw).toBeLessThan(-9)
    expect(sample?.blink).toBeGreaterThan(0.45)
  })
})
