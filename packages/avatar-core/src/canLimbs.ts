const SESSION_ORANGE = '#ee682a'
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

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

export const proceduralCanonicalCanSprayMarkup = (progress: number): string => {
  const amount = clamp(progress, 0, 1)
  if (amount <= 0.01) return ''

  const stream = clamp(amount / 0.35, 0, 1)
  const puff = clamp((amount - 0.32) / 0.38, 0, 1)
  const mist = clamp((amount - 0.68) / 0.32, 0, 1)
  const streamLength = 28 + stream * 118
  const puffScale = 0.18 + puff * 0.82
  const puffOpacity = puff * 0.92
  const mistOpacity = mist * 0.55

  return [
    `<g data-rmp-part="spray" data-rmp-spray="${amount.toFixed(3)}" transform="translate(400 198)">`,
    `<path d="M0 2 C ${round(streamLength * 0.42)} -6 ${round(streamLength * 0.72)} 4 ${round(streamLength)} 1" fill="none" stroke="#f4f1ea" stroke-linecap="round" stroke-width="${round(4.5 + stream * 3.5)}" opacity="${(0.35 + stream * 0.55).toFixed(3)}"/>`,
    `<g transform="translate(${round(streamLength)} 0) scale(${puffScale.toFixed(3)})" opacity="${puffOpacity.toFixed(3)}">`,
    `<ellipse cx="18" cy="-6" rx="34" ry="22" fill="#f7f4ee"/>`,
    `<ellipse cx="46" cy="8" rx="26" ry="18" fill="#efeae0"/>`,
    `<ellipse cx="8" cy="16" rx="20" ry="14" fill="#f4f0e8"/>`,
    `</g>`,
    `<g transform="translate(${round(streamLength + 54)} 18)" opacity="${mistOpacity.toFixed(3)}">`,
    `<circle cx="0" cy="0" r="6" fill="#f4f1ea"/>`,
    `<circle cx="16" cy="10" r="4.5" fill="#efeae0"/>`,
    `<circle cx="28" cy="-4" r="3.5" fill="#f7f4ee"/>`,
    `</g>`,
    `</g>`,
  ].join('')
}

export const canonicalCanBadgeMarkup = (progress: number): string => {
  const amount = clamp(progress, 0, 1)
  if (amount <= 0.01) return ''

  const scale = 0.2 + amount * 0.8
  return [
    `<g data-rmp-part="badge" data-rmp-badge="${amount.toFixed(3)}" transform="translate(596 188) scale(${scale.toFixed(3)})" opacity="${amount.toFixed(3)}">`,
    `<circle cx="0" cy="0" r="42" fill="#f4d35e" stroke="#1a1714" stroke-width="6"/>`,
    `<circle cx="0" cy="0" r="32" fill="#fff8e7"/>`,
    `<text x="0" y="6" text-anchor="middle" font-family="ui-rounded, 'Trebuchet MS', sans-serif" font-size="16" font-weight="700" fill="#1a1714">succès</text>`,
    `</g>`,
  ].join('')
}
