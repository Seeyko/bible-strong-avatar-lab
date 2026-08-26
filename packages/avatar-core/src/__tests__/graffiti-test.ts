import { poseFromExpression, renderAvatar, type Expression } from '../geometry'
import {
  DEFAULT_GRAFFITI_EYE,
  DEFAULT_GRAFFITI_RING,
  GRAFFITI_COLOR_TOKENS,
  graffitiEyePaths,
  graffitiRingPaths,
  parseGraffitiRingId,
  resolveGraffitiEyeGlyph,
  transformGraffitiPath,
} from '../graffiti'
import { surfacePresets } from '../surfaces'

const graffitiExpression: Expression = {
  id: 'expression-neutral',
  headX: 0,
  headY: 0,
  headZ: 0,
  widthLeft: 26,
  widthRight: 26,
  heightLeft: 32,
  heightRight: 32,
  spacing: 46,
  positionXLeft: 0,
  positionXRight: 0,
  positionYLeft: -10,
  positionYRight: -10,
  leftAngle: 0,
  rightAngle: 0,
  perspective: 1,
  eyeMotion: 'none',
  bodyMotion: 'none',
  eyeGlyphLeft: 'blob-07',
  eyeGlyphRight: 'blob-06',
}

describe('Thomas graffiti pack', () => {
  it('locks the default body to the middle uniform ring', () => {
    expect(DEFAULT_GRAFFITI_RING).toBe('uniform')
    expect(parseGraffitiRingId(undefined)).toBe('uniform')
    expect(surfacePresets.graffiti.graffitiRing).toBe('uniform')
    expect(graffitiRingPaths.uniform.length).toBeGreaterThan(200)
  })

  it('exposes five rings and sixteen eye blobs from the sheet', () => {
    expect(Object.keys(graffitiRingPaths)).toEqual([
      'thick',
      'brush',
      'uniform-left',
      'uniform',
      'uniform-right',
    ])
    expect(Object.keys(graffitiEyePaths)).toHaveLength(16)
    expect(DEFAULT_GRAFFITI_EYE).toBe('blob-07')
  })

  it('keeps color tokens as ring fills', () => {
    expect(GRAFFITI_COLOR_TOKENS).toEqual({
      spot: '#289bd2',
      session: '#ee682a',
      event: '#b132ce',
      shop: '#40c814',
    })
  })

  it('picks wink and hyped blobs from eye proportions', () => {
    expect(resolveGraffitiEyeGlyph(34, 12, 'blob-07')).toBe('blob-08')
    expect(resolveGraffitiEyeGlyph(32, 24, 'blob-07')).toBe('blob-05')
    expect(resolveGraffitiEyeGlyph(26, 32, 'blob-07')).toBe('blob-07')
  })

  it('renders a graffiti head and two blob eyes without extra primitives', () => {
    const geometry = renderAvatar(
      poseFromExpression(graffitiExpression),
      { ...surfacePresets.graffiti, graffitiRing: 'uniform' },
      1
    )

    expect(geometry.backPaths).toEqual([])
    expect(geometry.frontPaths).toEqual([])
    expect(geometry.headPath).toContain('M')
    expect(geometry.leftPath).toContain('M')
    expect(geometry.rightPath).toContain('M')
    expect(geometry.leftPath).not.toBe(geometry.rightPath)
    expect(geometry.leftVisible).toBe(true)
    expect(geometry.rightVisible).toBe(true)
  })

  it('transforms glyph paths into the facial frame', () => {
    const moved = transformGraffitiPath('M10 0L20 0Z', {
      centerX: 40,
      centerY: -8,
      scaleX: 2,
      scaleY: 2,
      rotation: 0,
    })
    expect(moved).toBe('M60.00 -8.00L80.00 -8.00Z')
  })
})
