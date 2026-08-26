import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { serializeCanonicalCanLayer } from '../canonicalCan'
import { CAN_KID_ORANGE, isCleanGeometricMarkup } from '../canKidGeometry'
import { poseFromExpression, renderAvatar, type Expression } from '../geometry'
import { surfacePresets } from '../surfaces'

const idle: Expression = {
  id: 'still-idle',
  headX: 6,
  headY: 12,
  headZ: -6,
  widthLeft: 32,
  widthRight: 32,
  heightLeft: 42,
  heightRight: 42,
  spacing: 44,
  positionXLeft: 0,
  positionXRight: 0,
  positionYLeft: -8,
  positionYRight: -8,
  leftAngle: 0,
  rightAngle: 0,
  perspective: 1,
  eyeMotion: 'none',
  bodyMotion: 'none',
  armHip: 16,
  armPoint: -14,
  legBack: -12,
  legFront: 14,
  spray: 0,
  badge: 0,
  stageX: 0,
}

const snapshot = (name: string, expression: Expression) => {
  const geometry = renderAvatar(poseFromExpression(expression), surfacePresets.can, 1)
  if (!geometry.canonicalCan) throw new Error(`No canonical can for ${name}`)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-150 -150 300 300" width="1024" height="1024" role="img" aria-label="${name}">
  <rect x="-150" y="-150" width="300" height="300" fill="#f4efe6"/>
  ${serializeCanonicalCanLayer(geometry.canonicalCan, { body: CAN_KID_ORANGE })}
</svg>
`
}

describe('Can Kid geometric stills', () => {
  it('writes idle, paint, 3/4 and enter frames with clean geometry', () => {
    const stills = {
      idle,
      paint: { ...idle, headY: 18, armPoint: 34, spray: 1, badge: 1 },
      'three-quarter': { ...idle, headX: 16, headY: 38, headZ: -8 },
      enter: {
        ...idle,
        headX: -18,
        headZ: 8,
        armHip: 30,
        armPoint: -28,
        legBack: -34,
        legFront: 32,
        stageX: -120,
      },
    } satisfies Record<string, Expression>

    const outDir = resolve('docs/can-kid-recast')
    mkdirSync(outDir, { recursive: true })
    for (const [name, expression] of Object.entries(stills)) {
      const svg = snapshot(name, expression)
      expect(isCleanGeometricMarkup(svg)).toBe(true)
      expect(svg).toContain('data-rmp-part="body"')
      expect(svg).toContain('data-rmp-part="eyes"')
      expect(svg).not.toContain('data-rmp-face-plate')
      if (name === 'paint') {
        expect(svg).toContain('data-rmp-part="spray"')
        expect(svg).toContain('succès')
      } else {
        expect(svg).not.toContain('data-rmp-part="spray"')
      }
      if (name === 'enter') expect(svg).toContain('translate(-120.00 0)')
      writeFileSync(resolve(outDir, `${name}.svg`), svg)
    }
  })
})
