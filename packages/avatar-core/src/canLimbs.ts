import {
  CAN_KID_INK,
  CAN_KID_ORANGE,
  CAN_KID_PAPER,
  CAN_KID_PIVOTS,
  CAN_KID_TONGUE,
  ellipsePath,
  hosePath,
  markedShape,
} from './canKidGeometry'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export const CAN_LIMB_INK = CAN_KID_INK
export const CAN_LIMB_PAPER = CAN_KID_PAPER
export const CAN_LIMB_TONGUE = CAN_KID_TONGUE

export type CanLimbAngles = {
  armHip: number
  armPoint: number
  legBack: number
  legFront: number
}

export type CanLimbPoseExpression = {
  headX: number
  headY: number
  headZ: number
  armHip?: number
  armPoint?: number
  legBack?: number
  legFront?: number
}

const round = (value: number) => value.toFixed(2)

const fill = (d: string, color: string, role: string, strokeWidth = 0, extra = '') =>
  `<path d="${d}" fill="${color}" data-rmp-fill="${role}"${extra}${strokeWidth ? ` stroke="${CAN_LIMB_INK}" stroke-width="${strokeWidth}" stroke-linejoin="round"` : ''}/>`

const gloveLines = (cx: number, cy: number, flip: number) =>
  [0, 1, 2]
    .map(index =>
      markedShape(
        'path',
        {
          d: `M${round(cx - 6 * flip)} ${round(cy - 8 + index * 7)}C${round(cx + 2 * flip)} ${round(cy - 10 + index * 7)} ${round(cx + 10 * flip)} ${round(cy - 7 + index * 7)} ${round(cx + 16 * flip)} ${round(cy - 4 + index * 7)}`,
          fill: 'none',
          stroke: CAN_LIMB_INK,
          'stroke-width': 2.4,
          'stroke-linecap': 'round',
        },
        'ink'
      )
    )
    .join('')

const hipGlove = (cx: number, cy: number) =>
  [
    fill(ellipsePath(cx, cy, 22, 18), CAN_LIMB_PAPER, 'white', 3.5),
    fill(ellipsePath(cx + 2, cy - 16, 15, 11), CAN_LIMB_PAPER, 'white', 3),
    fill(ellipsePath(cx + 14, cy - 6, 8, 7), CAN_LIMB_PAPER, 'white', 2.6),
    fill(ellipsePath(cx - 16, cy - 2, 8.5, 7), CAN_LIMB_PAPER, 'white', 2.6),
    gloveLines(cx - 2, cy, 1),
  ].join('')

const pointingGlove = (cx: number, cy: number) =>
  [
    fill(ellipsePath(cx, cy, 20, 16), CAN_LIMB_PAPER, 'white', 3.5),
    fill(ellipsePath(cx + 28, cy - 2, 20, 7.2), CAN_LIMB_PAPER, 'white', 3),
    fill(ellipsePath(cx + 8, cy + 12, 11, 7), CAN_LIMB_PAPER, 'white', 2.6),
    fill(ellipsePath(cx - 12, cy + 2, 8, 6.5), CAN_LIMB_PAPER, 'white', 2.4),
    gloveLines(cx - 4, cy + 1, 1),
  ].join('')

const sneaker = (cx: number, cy: number, flip: number) =>
  [
    fill(ellipsePath(cx + 2 * flip, cy + 10, 30, 8), CAN_LIMB_PAPER, 'white', 2.6),
    fill(ellipsePath(cx, cy - 2, 28, 16), CAN_KID_ORANGE, 'body', 3.6),
    fill(ellipsePath(cx + 16 * flip, cy - 1, 13, 12), CAN_LIMB_PAPER, 'white', 2.4),
    markedShape(
      'ellipse',
      { cx: cx - 4 * flip, cy: cy - 4, rx: 5, ry: 3.4, fill: CAN_LIMB_INK },
      'ink'
    ),
  ].join('')

type LimbRest = {
  pivot: { x: number; y: number }
  mid: { x: number; y: number }
  end: { x: number; y: number }
  width: number
  kind: 'hip' | 'point' | 'back-leg' | 'front-leg'
}

export const CANONICAL_CAN_LIMB_RESTS: Record<
  'arm-hip' | 'arm-point' | 'leg-back' | 'leg-front',
  LimbRest
> = {
  'arm-hip': {
    pivot: { ...CAN_KID_PIVOTS['arm-hip'] },
    mid: { x: 132, y: 558 },
    end: { x: 142, y: 638 },
    width: 16,
    kind: 'hip',
  },
  'arm-point': {
    pivot: { ...CAN_KID_PIVOTS['arm-point'] },
    mid: { x: 524, y: 468 },
    end: { x: 632, y: 438 },
    width: 16,
    kind: 'point',
  },
  'leg-back': {
    pivot: { ...CAN_KID_PIVOTS['leg-back'] },
    mid: { x: 198, y: 804 },
    end: { x: 162, y: 896 },
    width: 17,
    kind: 'back-leg',
  },
  'leg-front': {
    pivot: { ...CAN_KID_PIVOTS['leg-front'] },
    mid: { x: 418, y: 808 },
    end: { x: 468, y: 900 },
    width: 17,
    kind: 'front-leg',
  },
}

const heading = (from: { x: number; y: number }, to: { x: number; y: number }) =>
  (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI

export const canonicalCanLimbAngles = (expression: CanLimbPoseExpression): CanLimbAngles => ({
  armHip: (expression.armHip ?? 0) + expression.headZ * 0.22 + expression.headX * 0.28,
  armPoint: (expression.armPoint ?? 0) - expression.headZ * 0.18 + expression.headY * 0.12,
  legBack: (expression.legBack ?? 0) + expression.headX * 0.85,
  legFront: (expression.legFront ?? 0) - expression.headX * 0.85,
})

export const canonicalCanSmileMarkup = () =>
  [
    fill('M246 562C272 630 328 630 354 562C328 596 272 596 246 562Z', CAN_LIMB_INK, 'ink', 3),
    fill('M282 582C296 616 322 614 326 586C312 600 296 600 282 582Z', CAN_LIMB_TONGUE, 'tongue', 2),
  ].join('')

const limbTip = (rest: LimbRest) => {
  if (rest.kind === 'hip') {
    const angle = heading(rest.mid, rest.end) + 110
    return `<g transform="rotate(${round(angle)} ${rest.end.x} ${rest.end.y})">${hipGlove(rest.end.x, rest.end.y)}</g>`
  }
  if (rest.kind === 'point') {
    const angle = heading(rest.mid, rest.end)
    return `<g transform="rotate(${round(angle)} ${rest.end.x} ${rest.end.y})">${pointingGlove(rest.end.x, rest.end.y)}</g>`
  }
  const flip = rest.kind === 'back-leg' ? -1 : 1
  const angle = heading(rest.mid, rest.end) * 0.35 + (flip < 0 ? 188 : -8)
  return `<g transform="rotate(${round(angle)} ${rest.end.x} ${rest.end.y})">${sneaker(rest.end.x, rest.end.y, flip)}</g>`
}

export const proceduralCanonicalCanLimbMarkup = (part: keyof typeof CANONICAL_CAN_LIMB_RESTS) => {
  const rest = CANONICAL_CAN_LIMB_RESTS[part]
  const tube = hosePath(
    rest.pivot.x,
    rest.pivot.y,
    rest.mid.x,
    rest.mid.y,
    rest.end.x,
    rest.end.y,
    rest.width
  )
  return `${fill(tube, CAN_LIMB_INK, 'ink')}${limbTip(rest)}`
}

export const proceduralCanonicalCanSprayMarkup = (progress: number): string => {
  const amount = clamp(progress, 0, 1)
  if (amount <= 0.01) return ''

  const stream = clamp(amount / 0.35, 0, 1)
  const puff = clamp((amount - 0.28) / 0.42, 0, 1)
  const mist = clamp((amount - 0.62) / 0.38, 0, 1)
  const streamLength = 54 + stream * 186
  const puffScale = 0.22 + puff * 0.78
  const puffOpacity = puff * 0.98
  const mistOpacity = mist * 0.92
  const origin = CAN_KID_PIVOTS.spray
  const startHalf = 7
  const endHalf = 22

  return [
    `<g data-rmp-part="spray" data-rmp-spray="${amount.toFixed(3)}" data-rmp-geometry="clean" transform="translate(${origin.x} ${origin.y})">`,
    `<path d="M0 ${-startHalf} C ${round(streamLength * 0.32)} ${-endHalf} ${round(streamLength * 0.68)} ${-endHalf - 6} ${round(streamLength)} ${-endHalf} L ${round(streamLength)} ${endHalf} C ${round(streamLength * 0.68)} ${endHalf + 4} ${round(streamLength * 0.32)} ${startHalf + 4} 0 ${startHalf} Z" fill="${CAN_KID_ORANGE}" data-rmp-fill="puff" stroke="${CAN_LIMB_INK}" stroke-width="3" stroke-linejoin="round"/>`,
    `<g transform="translate(${round(streamLength)} -10) scale(${puffScale.toFixed(3)})" opacity="${puffOpacity.toFixed(3)}">`,
    `<ellipse cx="36" cy="-12" rx="88" ry="56" fill="${CAN_KID_ORANGE}" data-rmp-fill="puff" stroke="${CAN_LIMB_INK}" stroke-width="4"/>`,
    `<ellipse cx="92" cy="16" rx="58" ry="40" fill="${CAN_KID_ORANGE}" data-rmp-fill="puff" stroke="${CAN_LIMB_INK}" stroke-width="3.2"/>`,
    `<ellipse cx="8" cy="28" rx="46" ry="34" fill="${CAN_KID_ORANGE}" data-rmp-fill="puff" stroke="${CAN_LIMB_INK}" stroke-width="3"/>`,
    `<ellipse cx="70" cy="-38" rx="34" ry="24" fill="${CAN_KID_ORANGE}" data-rmp-fill="puff" stroke="${CAN_LIMB_INK}" stroke-width="2.6"/>`,
    `</g>`,
    `<g transform="translate(${round(streamLength + 78)} 22)" opacity="${mistOpacity.toFixed(3)}">`,
    `<circle cx="0" cy="-28" r="11" fill="${CAN_KID_ORANGE}" data-rmp-fill="puff"/>`,
    `<circle cx="34" cy="10" r="8" fill="${CAN_KID_ORANGE}" data-rmp-fill="puff"/>`,
    `<circle cx="58" cy="-16" r="6.5" fill="${CAN_KID_ORANGE}" data-rmp-fill="puff"/>`,
    `<circle cx="18" cy="32" r="5.5" fill="${CAN_KID_ORANGE}" data-rmp-fill="puff"/>`,
    `<circle cx="72" cy="20" r="4.5" fill="${CAN_KID_ORANGE}" data-rmp-fill="puff"/>`,
    `<circle cx="46" cy="-42" r="4" fill="${CAN_KID_ORANGE}" data-rmp-fill="puff"/>`,
    `</g>`,
    `</g>`,
  ].join('')
}

export const canonicalCanBadgeMarkup = (progress: number): string => {
  const amount = clamp(progress, 0, 1)
  if (amount <= 0.01) return ''

  const scale = 0.2 + amount * 0.8
  return [
    `<g data-rmp-part="badge" data-rmp-badge="${amount.toFixed(3)}" data-rmp-geometry="clean" transform="translate(690 120) scale(${scale.toFixed(3)})" opacity="${amount.toFixed(3)}">`,
    `<circle cx="0" cy="0" r="42" fill="#f4d35e" stroke="#1a1714" stroke-width="6"/>`,
    `<circle cx="0" cy="0" r="32" fill="#fff8e7"/>`,
    `<text x="0" y="6" text-anchor="middle" font-family="ui-rounded, 'Trebuchet MS', sans-serif" font-size="16" font-weight="700" fill="#1a1714">succès</text>`,
    `</g>`,
  ].join('')
}
