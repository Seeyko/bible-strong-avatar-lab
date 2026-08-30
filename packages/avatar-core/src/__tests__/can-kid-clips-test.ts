import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { serializeCanonicalCanLayer } from '../canonicalCan'
import { CAN_KID_ORANGE } from '../canKidGeometry'
import { interpolatePose, poseFromExpression, renderAvatar, type Expression } from '../geometry'
import { surfacePresets } from '../surfaces'

const base: Expression = {
  id: 'clip-base',
  headX: 6,
  headY: 10,
  headZ: -4,
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

const keys: Expression[] = [
  {
    ...base,
    id: 'enter-l',
    headX: -16,
    armHip: 30,
    armPoint: -28,
    legBack: -34,
    legFront: 32,
    stageX: -140,
  },
  {
    ...base,
    id: 'enter-r',
    headX: 14,
    armHip: -28,
    armPoint: 30,
    legBack: 32,
    legFront: -34,
    stageX: -40,
  },
  { ...base, id: 'settle', stageX: 0 },
  { ...base, id: 'aim', headY: 22, armPoint: 26, spray: 0 },
  { ...base, id: 'stream', headY: 24, armPoint: 32, spray: 0.42 },
  { ...base, id: 'hit', headY: 18, armPoint: 34, spray: 1, badge: 1 },
  { ...base, id: 'off', armPoint: 8, spray: 0, badge: 1 },
  {
    ...base,
    id: 'idle-a',
    headY: 12,
    armHip: 16,
    armPoint: -14,
    legBack: -12,
    legFront: 14,
    badge: 1,
  },
  {
    ...base,
    id: 'idle-b',
    headX: -10,
    headY: -8,
    armHip: -14,
    armPoint: 16,
    legBack: 14,
    legFront: -12,
    badge: 1,
  },
]

const holds = [10, 10, 8, 8, 10, 14, 10, 12, 12]

const snapshot = (expression: Expression) => {
  const geometry = renderAvatar(poseFromExpression(expression), surfacePresets.can, 1)
  if (!geometry.canonicalCan) throw new Error('Missing can')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-150 -150 300 300" width="720" height="720">
  <rect x="-150" y="-150" width="300" height="300" fill="#f4efe6"/>
  ${serializeCanonicalCanLayer(geometry.canonicalCan, { body: CAN_KID_ORANGE })}
</svg>
`
}

describe('Can Kid clip reel', () => {
  it('writes interpolated enter/paint/spray-off/idle frames', () => {
    const outDir = resolve('/tmp/can-kid-frames')
    mkdirSync(outDir, { recursive: true })
    let index = 0
    let last = keys[0]!
    writeFileSync(resolve(outDir, `frame-${String(index).padStart(3, '0')}.svg`), snapshot(last))
    index += 1
    for (let step = 1; step < keys.length; step += 1) {
      const next = keys[step]!
      const frames = holds[step] ?? 8
      for (let frame = 1; frame <= frames; frame += 1) {
        const pose = interpolatePose(
          poseFromExpression(last),
          poseFromExpression(next),
          frame / frames
        )
        writeFileSync(
          resolve(outDir, `frame-${String(index).padStart(3, '0')}.svg`),
          snapshot(pose.expression)
        )
        index += 1
      }
      last = next
    }
    expect(index).toBeGreaterThan(70)
    expect(index).toBeLessThan(140)
    writeFileSync(resolve('/tmp/can-kid-frames/clip-frame-count.txt'), `${index}\n`)
  })
})
