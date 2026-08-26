import { poseFromExpression, renderAvatar, type Expression } from '../geometry'
import {
  CANONICAL_CAN_SESSION_FILL,
  applyCanonicalCanOptions,
  canonicalCanFitTransform,
  isCanonicalCanReady,
  parseCanonicalCanSource,
  poseCanonicalCanMarkup,
  resolveCanonicalCan,
  tintCanonicalCanMarkup,
} from '../canonicalCan'
import { surfacePresets } from '../surfaces'

const pendingAsset = `<svg viewBox="-150 -150 300 300" data-rmp-canonical="pending"></svg>`

const readyAsset = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" data-rmp-canonical="ready">
  <rect data-rmp-fill="body" x="20" y="20" width="80" height="120" fill="${CANONICAL_CAN_SESSION_FILL}"/>
  <circle data-rmp-fill="puff" cx="150" cy="40" r="24" fill="${CANONICAL_CAN_SESSION_FILL}"/>
</svg>`

const idle: Expression = {
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

describe('canonical Can Kid SVG hook', () => {
  it('treats a pending placeholder as not ready', () => {
    expect(isCanonicalCanReady(pendingAsset)).toBe(false)
    expect(parseCanonicalCanSource(pendingAsset)).toBeNull()
  })

  it('loads the locked Can Kid SVG as the bundled default', () => {
    expect(isCanonicalCanReady()).toBe(true)
    const parsed = resolveCanonicalCan()
    expect(parsed).not.toBeNull()
    if (!parsed) return
    expect(parsed.innerMarkup).toContain('data-rmp-part="body"')
    expect(parsed.innerMarkup).toContain('data-rmp-part="eyes"')
    expect(parsed.innerMarkup).toContain('data-rmp-part="spray"')
    expect(parsed.innerMarkup).toContain('data-rmp-part="arm-hip"')
    expect(parsed.innerMarkup).toContain('data-rmp-part="arm-point"')
    expect(parsed.innerMarkup).toContain('data-rmp-part="leg-back"')
    expect(parsed.innerMarkup).toContain('data-rmp-part="leg-front"')
    expect(parsed.transform).toContain('scale(')
  })

  it('parses a ready SVG and tints body and puff from RMP tokens', () => {
    const parsed = parseCanonicalCanSource(readyAsset)
    expect(parsed).not.toBeNull()
    if (!parsed) return
    expect(parsed.viewBox).toEqual({ x: 0, y: 0, width: 200, height: 200 })
    expect(parsed.innerMarkup).toContain('data-rmp-fill="body"')
    const tinted = tintCanonicalCanMarkup(parsed.innerMarkup, { body: '#289bd2' })
    expect(tinted).toContain('fill="#289bd2"')
    expect(tinted).not.toContain(CANONICAL_CAN_SESSION_FILL)
    const split = applyCanonicalCanOptions(parsed.innerMarkup, {
      body: '#289bd2',
      puff: '#b132ce',
      spray: true,
    })
    expect(split).toContain('#289bd2')
    expect(split).toContain('#b132ce')
    const hidden = applyCanonicalCanOptions(parsed.innerMarkup, {
      body: '#289bd2',
      spray: false,
    })
    expect(hidden).not.toContain('data-rmp-fill="puff"')
    expect(canonicalCanFitTransform(parsed.viewBox)).toContain('scale(')
  })

  it('renders the lock SVG instead of the hand-drawn overlays', () => {
    const geometry = renderAvatar(poseFromExpression(idle), surfacePresets.can, 1)
    expect(geometry.canonicalCan).not.toBeNull()
    expect(geometry.overlays).toEqual([])
    expect(geometry.leftPath).toBe('')
    expect(geometry.rightPath).toBe('')
    expect(geometry.canonicalCan?.innerMarkup).toContain('data-rmp-part="rig"')
    expect(geometry.canonicalCan?.innerMarkup).toContain('data-rmp-part="eyes"')
    expect(geometry.canonicalCan?.innerMarkup).toContain('data-rmp-part="spray"')
  })

  it('hides the spray group when canSpray is off', () => {
    const hidden = renderAvatar(
      poseFromExpression(idle),
      { ...surfacePresets.can, canSpray: false },
      1
    )
    expect(hidden.canonicalCan?.innerMarkup).not.toContain('data-rmp-part="spray"')
    expect(hidden.canonicalCan?.innerMarkup).toContain('data-rmp-part="body"')
  })

  it('orients body, spray and eyes together and rotates the four limbs', () => {
    const source = resolveCanonicalCan()
    expect(source).not.toBeNull()
    if (!source) return
    const posed = poseCanonicalCanMarkup(
      source.innerMarkup,
      {
        expression: {
          ...idle,
          headZ: 18,
          armHip: -22,
          armPoint: 14,
          legBack: 8,
          legFront: -11,
        },
      },
      source.viewBox
    )
    expect(posed).toContain('data-rmp-part="rig"')
    expect(posed).toContain('rotate(18')
    expect(posed).toContain('data-rmp-part="arm-hip"')
    expect(posed).toContain('rotate(-22')
    expect(posed).toContain('rotate(14')
    expect(posed).toContain('rotate(8')
    expect(posed).toContain('rotate(-11')
    expect(posed).toContain('data-rmp-part="eyes"')
    expect(posed).toContain('data-rmp-part="spray"')
  })
})
