import { poseFromExpression, renderAvatar, type Expression } from '../geometry'
import { DEFAULT_CAN_SPRAY, GRAFFITI_COLOR_TOKENS, canLocalOverlays, parseCanSpray } from '../index'
import { surfacePresets } from '../surfaces'

const canExpression: Expression = {
  id: 'expression-neutral',
  headX: 0,
  headY: 0,
  headZ: 0,
  widthLeft: 32,
  widthRight: 32,
  heightLeft: 40,
  heightRight: 40,
  spacing: 44,
  positionXLeft: 0,
  positionXRight: 0,
  positionYLeft: -10,
  positionYRight: -10,
  leftAngle: 0,
  rightAngle: 0,
  perspective: 1,
  eyeMotion: 'none',
  bodyMotion: 'none',
}

describe('RMP rubber-hose can', () => {
  it('locks the can preset to session orange and a visible spray puff', () => {
    expect(DEFAULT_CAN_SPRAY).toBe(true)
    expect(parseCanSpray(undefined)).toBe(true)
    expect(surfacePresets.can.type).toBe('can')
    expect(surfacePresets.can.canSpray).toBe(true)
    expect(GRAFFITI_COLOR_TOKENS.session).toBe('#ee682a')
  })

  it('builds a recognizable can with hose arms, gloves, shoes and a puff', () => {
    const overlays = canLocalOverlays(true)
    const fills = overlays.map(overlay => overlay.fill)
    expect(overlays.length).toBeGreaterThan(12)
    expect(fills.filter(fill => fill === 'paper').length).toBeGreaterThanOrEqual(4)
    expect(fills).toContain('body')
    expect(fills).toContain('ink')
    expect(fills).toContain('paper')
    expect(fills).toContain('metal')
    expect(fills).toContain('shadow')
    expect(overlays.some(overlay => overlay.d.includes('M'))).toBe(true)
    expect(canLocalOverlays(false).length).toBeLessThan(overlays.length)
  })

  it('renders the lock SVG without extra primitives once the can is ready', () => {
    const geometry = renderAvatar(
      poseFromExpression(canExpression),
      { ...surfacePresets.can, canSpray: true },
      1
    )

    expect(geometry.backPaths).toEqual([])
    expect(geometry.frontPaths).toEqual([])
    expect(geometry.overlays).toEqual([])
    expect(geometry.canonicalCan).not.toBeNull()
    expect(geometry.canonicalCan?.innerMarkup).toContain('data-rmp-part="body"')
    expect(geometry.leftVisible).toBe(false)
    expect(geometry.rightVisible).toBe(false)
  })

  it('hides the spray puff when canSpray is off', () => {
    const withSpray = renderAvatar(poseFromExpression(canExpression), surfacePresets.can, 1)
    const withoutSpray = renderAvatar(
      poseFromExpression(canExpression),
      { ...surfacePresets.can, canSpray: false },
      1
    )
    expect(withSpray.canonicalCan?.innerMarkup).toContain('data-rmp-part="spray"')
    expect(withoutSpray.canonicalCan?.innerMarkup).not.toContain('data-rmp-part="spray"')
  })
})
