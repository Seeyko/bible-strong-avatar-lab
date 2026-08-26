const SESSION_ORANGE = '#ee682a'

export const CAN_LIMB_INK = '#111316'
export const CAN_LIMB_PAPER = '#fffef8'
export const CAN_LIMB_TONGUE = '#b84628'

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

const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${round(cx + rx)} ${round(cy)}A${round(rx)} ${round(ry)} 0 1 1 ${round(cx - rx)} ${round(cy)}A${round(rx)} ${round(ry)} 0 1 1 ${round(cx + rx)} ${round(cy)}Z`

const hose = (
  startX: number,
  startY: number,
  midX: number,
  midY: number,
  endX: number,
  endY: number,
  width: number
) => {
  const tangentX = endX - startX
  const tangentY = endY - startY
  const length = Math.hypot(tangentX, tangentY) || 1
  const normalX = (-tangentY / length) * (width / 2)
  const normalY = (tangentX / length) * (width / 2)
  const midNormalX = normalX * 0.88
  const midNormalY = normalY * 0.88
  return `M${round(startX + normalX)} ${round(startY + normalY)}C${round(midX + midNormalX)} ${round(midY + midNormalY)} ${round(midX + midNormalX)} ${round(midY + midNormalY)} ${round(endX + normalX * 0.72)} ${round(endY + normalY * 0.72)}L${round(endX - normalX * 0.72)} ${round(endY - normalY * 0.72)}C${round(midX - midNormalX)} ${round(midY - midNormalY)} ${round(midX - midNormalX)} ${round(midY - midNormalY)} ${round(startX - normalX)} ${round(startY - normalY)}Z`
}

const fill = (d: string, color: string, role: string, strokeWidth = 0, extra = '') =>
  `<path d="${d}" fill="${color}" data-rmp-fill="${role}"${extra}${strokeWidth ? ` stroke="${CAN_LIMB_INK}" stroke-width="${strokeWidth}" stroke-linejoin="round"` : ''}/>`

const hipGlove = (cx: number, cy: number) =>
  [
    fill(ellipse(cx, cy, 22, 18), CAN_LIMB_PAPER, 'white', 3.5),
    fill(ellipse(cx + 3, cy - 16, 16, 12), CAN_LIMB_PAPER, 'white', 3),
    fill(ellipse(cx - 16, cy - 2, 8.5, 7), CAN_LIMB_PAPER, 'white', 2.6),
  ].join('')

const pointingGlove = (cx: number, cy: number) =>
  [
    fill(ellipse(cx, cy, 20, 16), CAN_LIMB_PAPER, 'white', 3.5),
    fill(ellipse(cx + 28, cy - 2, 20, 7.2), CAN_LIMB_PAPER, 'white', 3),
    fill(ellipse(cx + 10, cy + 11, 12, 7.5), CAN_LIMB_PAPER, 'white', 2.6),
  ].join('')

const sneaker = (cx: number, cy: number, flip: number) =>
  [
    fill(ellipse(cx + 2 * flip, cy + 8, 28, 7.2), CAN_LIMB_PAPER, 'white', 2.4),
    fill(ellipse(cx, cy - 3, 27, 15), SESSION_ORANGE, 'body', 3.4),
    fill(ellipse(cx + 16 * flip, cy - 1, 12, 11), CAN_LIMB_PAPER, 'white', 2.2),
    fill(ellipse(cx - 2 * flip, cy - 2, 7, 4.2), CAN_LIMB_INK, 'ink'),
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
    pivot: { x: 210, y: 490 },
    mid: { x: 148, y: 555 },
    end: { x: 158, y: 638 },
    width: 16,
    kind: 'hip',
  },
  'arm-point': {
    pivot: { x: 430, y: 505 },
    mid: { x: 545, y: 458 },
    end: { x: 655, y: 428 },
    width: 16,
    kind: 'point',
  },
  'leg-back': {
    pivot: { x: 255, y: 705 },
    mid: { x: 205, y: 802 },
    end: { x: 168, y: 898 },
    width: 17,
    kind: 'back-leg',
  },
  'leg-front': {
    pivot: { x: 375, y: 705 },
    mid: { x: 438, y: 808 },
    end: { x: 492, y: 908 },
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

export const canonicalCanFacePlateMarkup = () =>
  [
    fill(ellipse(258, 458, 50, 64), SESSION_ORANGE, 'body', 0, ' data-rmp-face-plate="eyes"'),
    fill(ellipse(358, 448, 50, 64), SESSION_ORANGE, 'body', 0, ' data-rmp-face-plate="eyes"'),
    fill(ellipse(318, 598, 64, 44), SESSION_ORANGE, 'body', 0, ' data-rmp-face-plate="mouth"'),
  ].join('')

export const canonicalCanSmileMarkup = () =>
  [
    fill('M268 568C292 632 348 632 372 568C348 598 292 598 268 568Z', CAN_LIMB_INK, 'ink', 3),
    fill('M300 586C312 618 336 616 340 588C328 602 312 602 300 586Z', CAN_LIMB_TONGUE, 'tongue', 2),
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
  const tube = hose(
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
