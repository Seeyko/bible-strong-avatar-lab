import type { LegacyGrokExpression } from '@/features/comparison/legacyGrok'

export type LegacyGrokSpring = {
  morph: number
  velocity: number
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

export const interpolateLegacyGrokExpression = (
  from: LegacyGrokExpression,
  to: LegacyGrokExpression,
  progress: number
): LegacyGrokExpression => {
  const boundedProgress = clamp01(progress)
  return from.map((ring, eyeIndex) =>
    ring.map((point, pointIndex) => {
      const target = to[eyeIndex][pointIndex]
      return [
        point[0] + (target[0] - point[0]) * boundedProgress,
        point[1] + (target[1] - point[1]) * boundedProgress,
      ] as const
    })
  ) as unknown as LegacyGrokExpression
}

export const advanceLegacyGrokSpring = (
  spring: LegacyGrokSpring,
  deltaSeconds: number,
  frequency = 7
): LegacyGrokSpring => {
  const delta = Math.min(Math.max(deltaSeconds, 0), 0.1)
  const velocity =
    spring.velocity +
    (-2 * frequency * spring.velocity - frequency * frequency * (spring.morph - 1)) * delta
  const morph = spring.morph + velocity * delta

  if (!Number.isFinite(morph) || !Number.isFinite(velocity)) return { morph: 1, velocity: 0 }
  return { morph, velocity }
}

export const legacyGrokSpringIsSettled = ({ morph, velocity }: LegacyGrokSpring) =>
  Math.abs(1 - morph) < 0.001 && Math.abs(velocity) < 0.001

export const comparisonBlinkDelay = (random = Math.random) => 2400 + random() * 2800
