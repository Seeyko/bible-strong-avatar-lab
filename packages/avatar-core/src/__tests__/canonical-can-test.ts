import { poseFromExpression, renderAvatar, type Expression } from '../geometry'
import {
  CANONICAL_CAN_SESSION_FILL,
  applyCanonicalCanOptions,
  canonicalCanFitTransform,
  canonicalCanLean,
  isCanonicalCanReady,
  parseCanonicalCanSource,
  poseCanonicalCanMarkup,
  resolveCanonicalCan,
  tintCanonicalCanMarkup,
} from '../canonicalCan'
import { canonicalCanLimbAngles } from '../canLimbs'
import {
  CAN_KID_ORANGE,
  CAN_KID_VIEWBOX,
  buildCanKidStaticMarkup,
  buildCanKidSvg,
  isCleanGeometricMarkup,
} from '../canKidGeometry'
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
    expect(parsed.innerMarkup).not.toContain('data-rmp-part="arm-hip"')
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
    expect(geometry.canonicalCan?.innerMarkup).toContain('data-rmp-part="can"')
    expect(geometry.canonicalCan?.innerMarkup).toContain('data-rmp-part="eyes"')
    expect(geometry.canonicalCan?.innerMarkup).toContain('data-rmp-part="stage"')
    expect(geometry.canonicalCan?.innerMarkup).not.toContain('data-rmp-part="spray"')
    expect(geometry.canonicalCan?.innerMarkup).not.toContain('data-rmp-part="badge"')
    expect(geometry.canonicalCan?.innerMarkup).toContain('data-rmp-procedural="limb"')
    expect(geometry.canonicalCan?.innerMarkup).toContain('data-rmp-part="mouth"')
  })

  it('keeps the jet off on idle even when the body can spray', () => {
    const hidden = renderAvatar(
      poseFromExpression(idle),
      { ...surfacePresets.can, canSpray: false },
      1
    )
    expect(hidden.canonicalCan?.innerMarkup).not.toContain('data-rmp-part="spray"')
    expect(hidden.canonicalCan?.innerMarkup).toContain('data-rmp-part="body"')
  })

  it('grows a procedural jet and paints a success badge from clip fields', () => {
    const painted = renderAvatar(
      poseFromExpression({ ...idle, spray: 1, badge: 1, stageX: 40 }),
      surfacePresets.can,
      1
    )
    const markup = painted.canonicalCan?.innerMarkup ?? ''
    expect(markup).toContain('data-rmp-part="spray"')
    expect(markup).toContain('data-rmp-spray="1.000"')
    expect(markup).toContain('data-rmp-part="badge"')
    expect(markup).toContain('succès')
    expect(markup).toContain('data-rmp-part="stage"')
    expect(markup).toContain('translate(40.00 0)')
    const canOpen = markup.indexOf('data-rmp-part="can"')
    const canClose = markup.indexOf('data-rmp-part="arm-point"')
    expect(markup.slice(canOpen, canClose)).toContain('data-rmp-part="spray"')
    expect(markup).toContain('data-rmp-fill="puff"')
    expect(markup).toContain(CAN_KID_ORANGE)
    expect(markup).toMatch(/<ellipse[^>]+data-rmp-fill="puff"/)
    expect(markup).toMatch(/<circle[^>]+data-rmp-fill="puff"/)
  })

  it('refuses the jet when the body cannot spray, even if the clip asks for it', () => {
    const blocked = renderAvatar(
      poseFromExpression({ ...idle, spray: 1, badge: 1 }),
      { ...surfacePresets.can, canSpray: false },
      1
    )
    expect(blocked.canonicalCan?.innerMarkup).not.toContain('data-rmp-part="spray"')
    expect(blocked.canonicalCan?.innerMarkup).not.toContain('data-rmp-part="badge"')
  })

  it('leans the can without wrapping the four limbs in the same sticker rotate', () => {
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
    const canOpen = posed.indexOf('data-rmp-part="can"')
    const canClose = posed.indexOf('data-rmp-part="arm-point"')
    const canMarkup = posed.slice(canOpen, canClose)
    expect(canOpen).toBeGreaterThan(-1)
    expect(canMarkup).toContain('rotate(18')
    expect(canMarkup).toContain('data-rmp-part="body"')
    expect(canMarkup).toContain('data-rmp-part="eyes"')
    expect(canMarkup).not.toContain('data-rmp-part="arm-hip"')
    expect(canMarkup).not.toContain('data-rmp-part="leg-front"')
    expect(posed).toContain('data-rmp-procedural="limb"')
    const sliders = poseCanonicalCanMarkup(
      source.innerMarkup,
      {
        expression: {
          ...idle,
          armHip: -22,
          armPoint: 14,
          legBack: 8,
          legFront: -11,
        },
      },
      source.viewBox
    )
    expect(sliders).toContain('rotate(-22')
    expect(sliders).toContain('rotate(14')
    expect(sliders).toContain('rotate(8')
    expect(sliders).toContain('rotate(-11')
  })

  it('draws one clipped geometric face on the body, without baked plates', () => {
    const source = resolveCanonicalCan()
    expect(source).not.toBeNull()
    if (!source) return
    expect(isCleanGeometricMarkup(source.innerMarkup)).toBe(true)
    expect(isCleanGeometricMarkup(buildCanKidSvg())).toBe(true)
    expect(source.innerMarkup).toBe(buildCanKidStaticMarkup())
    expect(source.innerMarkup).not.toMatch(/M0,0\s*L/)
    expect(source.innerMarkup).not.toContain('data-rmp-face-plate')
    const posed = poseCanonicalCanMarkup(source.innerMarkup, { expression: idle }, source.viewBox)
    expect(posed).toContain('data-rmp-part="mouth"')
    expect(posed).toContain('data-rmp-part="eye-glyphs"')
    expect(posed).toContain('clip-path="url(#rmp-can-face-clip)"')
    expect(posed).toContain('data-rmp-part="face"')
    expect(posed).not.toContain('data-rmp-face-plate')
    expect(posed.match(/data-rmp-part="mouth"/g)).toHaveLength(1)
  })

  it('turns headX/Y/Z and stageX into visible can motion instead of a no-op', () => {
    const rest = canonicalCanLean(CAN_KID_VIEWBOX, 0, 0, 0)
    const yaw = canonicalCanLean(CAN_KID_VIEWBOX, 0, 42, 0)
    const pitch = canonicalCanLean(CAN_KID_VIEWBOX, 36, 0, 0)
    const roll = canonicalCanLean(CAN_KID_VIEWBOX, 0, 0, 18)
    expect(rest.can).not.toContain('scale(')
    expect(yaw.can).toMatch(/scale\((0\.[0-6]|0\.7[0-4])/)
    expect(pitch.can).toMatch(/scale\(1 0\.[0-8]/)
    expect(Math.abs(Number(yaw.can.match(/translate\(([-\d.]+)/)?.[1] ?? 0))).toBeGreaterThan(40)
    expect(roll.can).toContain('rotate(18')
    expect(yaw.can).not.toBe(rest.can)
    expect(yaw.limbs).not.toContain('scale(')
    const posed = poseCanonicalCanMarkup(buildCanKidStaticMarkup(), {
      expression: { ...idle, headY: 42, headX: 20 },
      stageX: -120,
    })
    expect(posed).toContain('translate(-120.00 0)')
    expect(posed).toContain('data-rmp-part="can"')
    expect(posed).toContain('scale(')
  })

  it('swings the limbs when idle head values change, and honors pose sliders', () => {
    const idleGlance = canonicalCanLimbAngles({ ...idle, headX: 7.3, headZ: -16.1 })
    const idleCurious = canonicalCanLimbAngles({ ...idle, headX: -22.8, headZ: 6.2 })
    expect(idleGlance.legFront).not.toBeCloseTo(idleCurious.legFront)
    expect(idleGlance.armHip).not.toBeCloseTo(idleCurious.armHip)
    const posed = canonicalCanLimbAngles({
      ...idle,
      armHip: -22,
      armPoint: 14,
      legBack: 8,
      legFront: -11,
    })
    expect(posed.armHip).toBeCloseTo(-22)
    expect(posed.armPoint).toBeCloseTo(14)
    expect(posed.legBack).toBeCloseTo(8)
    expect(posed.legFront).toBeCloseTo(-11)
  })
})
