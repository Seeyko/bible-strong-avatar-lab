import { legacyGrokExpressions, legacyGrokPath } from '@/features/comparison/legacyGrok'
import {
  advanceLegacyGrokSpring,
  comparisonBlinkDelay,
  interpolateLegacyGrokExpression,
  legacyGrokSpringIsSettled,
} from '@/features/comparison/comparisonTransition'

describe('legacy Grok source', () => {
  it('extracts every official expression from the legacy prototype', () => {
    expect(legacyGrokExpressions).toHaveLength(25)
    legacyGrokExpressions.forEach(expression => {
      expect(expression).toHaveLength(2)
      expect(expression[0].length).toBeGreaterThan(40)
      expect(expression[1].length).toBeGreaterThan(40)
    })
  })

  it('turns a legacy ring into a closed SVG path', () => {
    const path = legacyGrokPath(legacyGrokExpressions[0][0])

    expect(path).toMatch(/^M/)
    expect(path).toMatch(/Z$/)
  })
})

describe('legacy Grok interpolation', () => {
  it('morphs every historic point between two expressions', () => {
    const from = legacyGrokExpressions[0]
    const to = legacyGrokExpressions[1]
    const halfway = interpolateLegacyGrokExpression(from, to, 0.5)

    expect(halfway[0][0][0]).toBeCloseTo((from[0][0][0] + to[0][0][0]) / 2)
    expect(halfway[1][20][1]).toBeCloseTo((from[1][20][1] + to[1][20][1]) / 2)
  })

  it('reproduces the legacy critically damped spring until it settles', () => {
    let spring = { morph: 0, velocity: 0 }
    for (let frame = 0; frame < 240; frame += 1) {
      spring = advanceLegacyGrokSpring(spring, 1 / 60)
    }

    expect(spring.morph).toBeCloseTo(1, 3)
    expect(legacyGrokSpringIsSettled(spring)).toBe(true)
  })

  it('schedules automatic blinks inside the shared random interval', () => {
    expect(comparisonBlinkDelay(() => 0)).toBe(2400)
    expect(comparisonBlinkDelay(() => 0.5)).toBe(3800)
    expect(comparisonBlinkDelay(() => 1)).toBe(5200)
  })
})
