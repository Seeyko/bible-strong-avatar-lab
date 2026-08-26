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
  it('locks the can preset to session orange with spray as a body capability', () => {
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

  it('hides the spray until a paint clip turns the jet on', () => {
    const idle = renderAvatar(poseFromExpression(canExpression), surfacePresets.can, 1)
    const painting = renderAvatar(
      poseFromExpression({ ...canExpression, spray: 1, badge: 1 }),
      surfacePresets.can,
      1
    )
    const withoutCapability = renderAvatar(
      poseFromExpression({ ...canExpression, spray: 1, badge: 1 }),
      { ...surfacePresets.can, canSpray: false },
      1
    )
    expect(idle.canonicalCan?.innerMarkup).not.toContain('data-rmp-part="spray"')
    expect(painting.canonicalCan?.innerMarkup).toContain('data-rmp-part="spray"')
    expect(painting.canonicalCan?.innerMarkup).toContain('succès')
    expect(withoutCapability.canonicalCan?.innerMarkup).not.toContain('data-rmp-part="spray"')
  })
})
