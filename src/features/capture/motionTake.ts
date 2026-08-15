import { clamp } from '@/features/avatar/geometry'

export type MotionSample = {
  time: number
  pitch: number
  yaw: number
  roll: number
  positionX: number
  positionY: number
  positionZ: number
  lookX: number
  lookY: number
  blink: number
}

export type MotionTake = {
  duration: number
  samples: MotionSample[]
}

export type MotionTakeSettings = {
  smoothing: number
  detailRetention: number
  amplitude: number
  speed: number
}

export const defaultMotionTakeSettings: MotionTakeSettings = {
  smoothing: 0.62,
  detailRetention: 0.32,
  amplitude: 1,
  speed: 1,
}

export const motionChannels = [
  'pitch',
  'yaw',
  'roll',
  'positionX',
  'positionY',
  'positionZ',
  'lookX',
  'lookY',
  'blink',
] as const
export type MotionChannel = (typeof motionChannels)[number]

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount

const dot = (left: readonly number[], right: readonly number[]) =>
  left.reduce((sum, value, index) => sum + value * right[index], 0)

const applyCurvatureSystem = (values: readonly number[], lambda: number) => {
  const result = [...values]
  for (let index = 0; index < values.length - 2; index += 1) {
    const secondDifference = values[index] - 2 * values[index + 1] + values[index + 2]
    result[index] += lambda * secondDifference
    result[index + 1] -= lambda * 2 * secondDifference
    result[index + 2] += lambda * secondDifference
  }
  return result
}

const curvatureDiagonal = (length: number, lambda: number) =>
  Array.from({ length }, (_, index) => {
    const penalty =
      index === 0 || index === length - 1 ? 1 : index === 1 || index === length - 2 ? 5 : 6
    return 1 + lambda * penalty
  })

const solvePenalizedCurve = (values: readonly number[], lambda: number) => {
  if (values.length < 3 || lambda <= 0) return [...values]
  let solution = [...values]
  const initialProjection = applyCurvatureSystem(solution, lambda)
  let residual = values.map((value, index) => value - initialProjection[index])
  const diagonal = curvatureDiagonal(values.length, lambda)
  let preconditioned = residual.map((value, index) => value / diagonal[index])
  let direction = [...preconditioned]
  let residualScale = dot(residual, preconditioned)
  const tolerance = Math.max(1e-10, dot(values, values) * 1e-12)

  for (let iteration = 0; iteration < Math.min(120, values.length * 2); iteration += 1) {
    const projected = applyCurvatureSystem(direction, lambda)
    const denominator = dot(direction, projected)
    if (Math.abs(denominator) < 1e-12) break
    const amount = residualScale / denominator
    solution = solution.map((value, index) => value + amount * direction[index])
    residual = residual.map((value, index) => value - amount * projected[index])
    if (dot(residual, residual) <= tolerance) break
    preconditioned = residual.map((value, index) => value / diagonal[index])
    const nextScale = dot(residual, preconditioned)
    const directionScale = nextScale / residualScale
    direction = preconditioned.map((value, index) => value + directionScale * direction[index])
    residualScale = nextScale
  }

  const startCorrection = values[0] - solution[0]
  const endCorrection = values.at(-1)! - solution.at(-1)!
  return solution.map(
    (value, index) =>
      value + mix(startCorrection, endCorrection, index / Math.max(1, solution.length - 1))
  )
}

const linearSample = (take: MotionTake, time: number): MotionSample | null => {
  if (take.samples.length === 0) return null
  const target = clamp(time, 0, take.duration)
  const exact = take.samples.findIndex(sample => sample.time >= target)
  if (exact <= 0) return take.samples[0]
  const to = take.samples[exact]
  const from = take.samples[exact - 1]
  const amount = clamp((target - from.time) / Math.max(1, to.time - from.time), 0, 1)
  const sample = { ...from, time: target }
  motionChannels.forEach(channel => {
    sample[channel] = mix(from[channel], to[channel], amount)
  })
  return sample
}

const resampleTake = (take: MotionTake): MotionTake => {
  if (take.samples.length < 2 || take.duration <= 0) return take
  const intervals = take.samples
    .slice(1)
    .map((sample, index) => sample.time - take.samples[index].time)
    .filter(interval => interval > 0)
    .sort((left, right) => left - right)
  const medianInterval = intervals[Math.floor(intervals.length / 2)] ?? 1000 / 30
  const targetInterval = clamp(medianInterval, 1000 / 60, 1000 / 24)
  const sampleCount = Math.max(2, Math.round(take.duration / targetInterval) + 1)
  const interval = take.duration / (sampleCount - 1)
  const samples = Array.from({ length: sampleCount }, (_, index) =>
    linearSample(take, index * interval)
  ).filter((sample): sample is MotionSample => sample !== null)
  return { duration: take.duration, samples }
}

export const processMotionTake = (take: MotionTake, settings: MotionTakeSettings): MotionTake => {
  if (take.samples.length === 0) return { duration: 0, samples: [] }
  const resampled = resampleTake(take)
  const smoothing = clamp(settings.smoothing, 0, 1)
  const detailRetention = clamp(settings.detailRetention, 0, 1)
  const amplitude = clamp(settings.amplitude, 0, 2)
  const speed = clamp(settings.speed, 0.25, 3)
  const lambda = (10 ** (smoothing * 3) - 1) * 0.45
  const refinedChannels = Object.fromEntries(
    motionChannels.map(channel => {
      const raw = resampled.samples.map(sample => sample[channel])
      const rounded = solvePenalizedCurve(raw, lambda)
      return [channel, rounded.map((value, index) => mix(value, raw[index], detailRetention))]
    })
  ) as Record<MotionChannel, number[]>
  const samples = resampled.samples.map((sample, index) => {
    const processed = { ...sample, time: sample.time / speed }
    motionChannels.forEach(channel => {
      const refined = refinedChannels[channel][index]
      processed[channel] =
        channel === 'blink' ? clamp(refined * amplitude, 0, 1) : refined * amplitude
    })
    return processed
  })
  return { duration: take.duration / speed, samples }
}

export const sampleMotionTake = (take: MotionTake, time: number): MotionSample | null => {
  if (take.samples.length === 0) return null
  const target = clamp(time, 0, take.duration)
  const exact = take.samples.findIndex(sample => sample.time >= target)
  if (exact <= 0) return take.samples[0]
  const to = take.samples[exact]
  const from = take.samples[exact - 1]
  const amount = clamp((target - from.time) / Math.max(1, to.time - from.time), 0, 1)
  const before = take.samples[Math.max(0, exact - 2)]
  const after = take.samples[Math.min(take.samples.length - 1, exact + 1)]
  const sample = { ...from, time: target }
  motionChannels.forEach(channel => {
    const p0 = before[channel]
    const p1 = from[channel]
    const p2 = to[channel]
    const p3 = after[channel]
    const squared = amount * amount
    const cubed = squared * amount
    sample[channel] =
      0.5 *
      (2 * p1 +
        (-p0 + p2) * amount +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * squared +
        (-p0 + 3 * p1 - 3 * p2 + p3) * cubed)
  })
  sample.blink = clamp(sample.blink, 0, 1)
  return sample
}
