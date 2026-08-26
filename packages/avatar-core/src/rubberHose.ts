import { transformGraffitiPath, type GraffitiPathTransform } from './graffiti'

export const DEFAULT_CAN_SPRAY = true

export const OVERLAY_INK = '#111316'
export const OVERLAY_PAPER = '#fffef8'
export const OVERLAY_METAL = '#c5c8cc'
export const OVERLAY_SHADOW = '#c8c4bb'

export const MAX_OVERLAY_PATHS = 32

export type OverlayFillRole = 'body' | 'eyes' | 'ink' | 'paper' | 'metal' | 'shadow'

export type OverlayPlacement = 'back' | 'front'

export type OverlayLayer = {
  d: string
  fill: OverlayFillRole
  stroke?: OverlayFillRole
  strokeWidth?: number
  placement: OverlayPlacement
  fillRule?: 'evenodd' | 'nonzero'
}

export const resolveOverlayFill = (
  role: OverlayFillRole,
  colors: { body: string; eyes: string }
) => {
  switch (role) {
    case 'body':
      return colors.body
    case 'eyes':
      return colors.eyes
    case 'ink':
      return OVERLAY_INK
    case 'paper':
      return OVERLAY_PAPER
    case 'metal':
      return OVERLAY_METAL
    case 'shadow':
      return OVERLAY_SHADOW
  }
}

export const parseCanSpray = (value: unknown, fallback = DEFAULT_CAN_SPRAY) =>
  typeof value === 'boolean' ? value : fallback

export const overlayPaint = (overlay: OverlayLayer, colors: { body: string; eyes: string }) => ({
  d: overlay.d,
  fill: resolveOverlayFill(overlay.fill, colors),
  stroke: overlay.stroke ? resolveOverlayFill(overlay.stroke, colors) : 'none',
  strokeWidth: overlay.strokeWidth ?? 0,
  fillRule: overlay.fillRule ?? 'nonzero',
})

const hash = (value: number) => {
  const sample = Math.sin(value * 127.1 + 311.7) * 43758.5453
  return sample - Math.floor(sample)
}

const closedSpline = (points: ReadonlyArray<readonly [number, number]>) => {
  if (points.length < 3) return ''
  const segment = (index: number) => {
    const previous = points[(index - 1 + points.length) % points.length]
    const current = points[index]
    const next = points[(index + 1) % points.length]
    const after = points[(index + 2) % points.length]
    const firstX = current[0] + (next[0] - previous[0]) / 6
    const firstY = current[1] + (next[1] - previous[1]) / 6
    const secondX = next[0] - (after[0] - current[0]) / 6
    const secondY = next[1] - (after[1] - current[1]) / 6
    return `C${firstX.toFixed(2)} ${firstY.toFixed(2)} ${secondX.toFixed(2)} ${secondY.toFixed(2)} ${next[0].toFixed(2)} ${next[1].toFixed(2)}`
  }
  return `M${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}${points.map((_, index) => segment(index)).join('')}Z`
}

const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${(cx + rx).toFixed(2)} ${cy.toFixed(2)}A${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 1 ${(cx - rx).toFixed(2)} ${cy.toFixed(2)}A${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 1 ${(cx + rx).toFixed(2)} ${cy.toFixed(2)}Z`

const blob = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  samples = 16,
  noise = 0.16
) => {
  const points = Array.from({ length: samples }, (_, index) => {
    const angle = (index / samples) * Math.PI * 2 - Math.PI / 2
    const wobble = 1 + (hash(seed + index * 4.7) - 0.5) * noise
    return [cx + Math.cos(angle) * rx * wobble, cy + Math.sin(angle) * ry * wobble] as const
  })
  return closedSpline(points)
}

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
  const midNormalX = normalX * 0.85
  const midNormalY = normalY * 0.85
  return `M${(startX + normalX).toFixed(2)} ${(startY + normalY).toFixed(2)}C${(midX + midNormalX).toFixed(2)} ${(midY + midNormalY).toFixed(2)} ${(midX + midNormalX).toFixed(2)} ${(midY + midNormalY).toFixed(2)} ${(endX + normalX * 0.7).toFixed(2)} ${(endY + normalY * 0.7).toFixed(2)}L${(endX - normalX * 0.7).toFixed(2)} ${(endY - normalY * 0.7).toFixed(2)}C${(midX - midNormalX).toFixed(2)} ${(midY - midNormalY).toFixed(2)} ${(midX - midNormalX).toFixed(2)} ${(midY - midNormalY).toFixed(2)} ${(startX - normalX).toFixed(2)} ${(startY - normalY).toFixed(2)}Z`
}

const glove = (cx: number, cy: number, scale: number, pointing: boolean) => {
  if (pointing) {
    const palm = blob(cx, cy, 13 * scale, 11.5 * scale, 51 + cx, 12, 0.05)
    const index = blob(cx + 18 * scale, cy - 1 * scale, 12 * scale, 4.4 * scale, 52 + cx, 10, 0.04)
    const lower = blob(cx + 7 * scale, cy + 7 * scale, 8.5 * scale, 5.2 * scale, 53 + cx, 10, 0.05)
    return `${palm}${index}${lower}`
  }
  const palm = blob(cx, cy, 13 * scale, 11.5 * scale, 61 + cx, 12, 0.05)
  const fingers = blob(cx + 2 * scale, cy - 11 * scale, 10 * scale, 8.5 * scale, 62 + cx, 10, 0.05)
  const thumb = blob(cx - 10 * scale, cy - 1 * scale, 5.6 * scale, 4.6 * scale, 63 + cx, 8, 0.04)
  return `${palm}${fingers}${thumb}`
}

const sneaker = (cx: number, cy: number, scaleX: number, scaleY: number) => {
  const body = blob(cx, cy - 2.2 * scaleY, 16 * scaleX, 8.4 * scaleY, 31 + cx, 12, 0.08)
  return body
}

const sneakerSole = (cx: number, cy: number, scaleX: number, scaleY: number) =>
  blob(cx + 0.6 * scaleX, cy + 4.4 * scaleY, 15.2 * scaleX, 3.6 * scaleY, 44 + cx, 10, 0.05)

const stipple = (cx: number, cy: number, rx: number, ry: number, count: number, seed: number) =>
  Array.from({ length: count }, (_, index) => {
    const angle = hash(seed + index * 6.1) * Math.PI * 2
    const distance = 0.55 + hash(seed + index * 9.3) * 0.7
    const size = 0.7 + hash(seed + index * 13.7) * 2.1
    const x = cx + Math.cos(angle) * rx * distance
    const y = cy + Math.sin(angle) * ry * distance
    return ellipse(x, y, size, size * 0.86)
  }).join('')

const canBodyLocal = () =>
  `M-36.00 -36.00C-41.50 -36.00 -43.00 -22.00 -43.00 6.00C-43.00 30.00 -41.00 46.00 -36.00 50.00L36.00 50.00C41.00 46.00 43.00 30.00 43.00 6.00C43.00 -22.00 41.50 -36.00 36.00 -36.00Z`

const canCapLocal = () =>
  `M-32.00 -34.00C-34.50 -34.00 -36.50 -40.00 -34.50 -46.00L-18.00 -62.00C-16.00 -65.00 -10.00 -66.50 0.00 -66.50C10.00 -66.50 16.00 -65.00 18.00 -62.00L34.50 -46.00C36.50 -40.00 34.50 -34.00 32.00 -34.00Z`

const canNozzleLocal = () =>
  `M-7.40 -60.00L-5.10 -76.00C-4.50 -79.00 -2.30 -80.60 0.40 -80.60C3.10 -80.60 5.30 -79.00 5.90 -76.00L8.10 -60.00Z${ellipse(0.4, -82.4, 5.6, 3.3)}`

const canRimLocal = () =>
  `M-36.00 42.00C-41.00 43.40 -43.20 46.60 -43.20 49.40C-43.20 52.40 -40.20 55.00 -36.00 55.60L36.00 55.60C40.20 55.00 43.20 52.40 43.20 49.40C43.20 46.60 41.00 43.40 36.00 42.00Z`

const mouthLocal = () =>
  `M-21.00 18.00C-12.00 34.00 12.00 34.00 21.00 18.00C13.00 11.50 -13.00 11.50 -21.00 18.00Z`

const tongueLocal = () =>
  `M-7.80 20.50C-2.00 31.50 11.00 30.00 8.80 21.20C3.60 23.80 -2.60 23.60 -7.80 20.50Z`

const brow = (cx: number, cy: number, flip: boolean) => {
  const side = flip ? -1 : 1
  return `M${(cx - 11 * side).toFixed(2)} ${cy.toFixed(2)}C${(cx - 4 * side).toFixed(2)} ${(cy - 6).toFixed(2)} ${(cx + 5 * side).toFixed(2)} ${(cy - 5.5).toFixed(2)} ${(cx + 11 * side).toFixed(2)} ${(cy - 1.2).toFixed(2)}C${(cx + 5 * side).toFixed(2)} ${(cy - 2.4).toFixed(2)} ${(cx - 3 * side).toFixed(2)} ${(cy - 2.8).toFixed(2)} ${(cx - 11 * side).toFixed(2)} ${cy.toFixed(2)}Z`
}

const sprayStreamLocal = () =>
  `M6.40 -76.00C22.00 -74.00 42.00 -66.00 58.00 -52.00C44.00 -58.00 26.00 -68.00 8.60 -74.20Z`

const sprayPuffLocal = () =>
  `${blob(92, -36, 38, 30, 7, 18, 0.22)}${blob(116, -24, 20, 15, 11, 12, 0.2)}${blob(74, -14, 17, 13, 15, 12, 0.18)}`

const sprayMistLocal = () =>
  `${stipple(94, -34, 44, 34, 28, 21)}${stipple(126, -16, 18, 15, 10, 33)}${ellipse(136, -8, 2.2, 1.9)}${ellipse(130, 6, 1.7, 1.5)}${ellipse(78, 8, 1.9, 1.6)}`

const layer = (
  d: string,
  fill: OverlayFillRole,
  placement: OverlayPlacement,
  options: Partial<Pick<OverlayLayer, 'stroke' | 'strokeWidth' | 'fillRule'>> = {}
): OverlayLayer => ({
  d,
  fill,
  placement,
  stroke: options.stroke ?? (fill === 'shadow' ? undefined : 'ink'),
  strokeWidth: options.strokeWidth ?? (fill === 'shadow' ? 0 : 5),
  fillRule: options.fillRule,
})

export const canLocalOverlays = (spray = DEFAULT_CAN_SPRAY): OverlayLayer[] => {
  const overlays: OverlayLayer[] = [
    layer(ellipse(4, 96, 48, 8.5), 'shadow', 'back', { strokeWidth: 0, stroke: undefined }),
    layer(hose(-16, 50, -22, 66, -30, 80, 6.2), 'ink', 'back'),
    layer(hose(14, 50, 24, 68, 34, 84, 6.2), 'ink', 'back'),
    layer(hose(-40, 12, -58, 30, -50, 44, 6.6), 'ink', 'front'),
    layer(glove(-58, 48, 1.18, false), 'paper', 'front', { strokeWidth: 3.5 }),
    layer(canCapLocal(), 'ink', 'front'),
    layer(canNozzleLocal(), 'ink', 'front'),
    layer(canRimLocal(), 'metal', 'front'),
    layer(mouthLocal(), 'ink', 'front', { strokeWidth: 4 }),
    layer(tongueLocal(), 'body', 'front', { strokeWidth: 3 }),
    layer(brow(-16, -24, true), 'ink', 'front', { strokeWidth: 2.5 }),
    layer(brow(16, -24, false), 'ink', 'front', { strokeWidth: 2.5 }),
    layer(hose(40, 10, 62, 16, 80, 18, 6.4), 'ink', 'front'),
    layer(glove(96, 18, 1.2, true), 'paper', 'front', { strokeWidth: 3.5 }),
    layer(sneaker(-32, 86, 1, 1), 'body', 'front'),
    layer(sneakerSole(-32, 86, 1, 1), 'paper', 'front'),
    layer(sneaker(38, 90, 1.05, 1), 'body', 'front'),
    layer(sneakerSole(38, 90, 1.05, 1), 'paper', 'front'),
  ]
  if (spray) {
    overlays.splice(
      1,
      0,
      layer(sprayPuffLocal(), 'body', 'back'),
      layer(sprayMistLocal(), 'body', 'back', { strokeWidth: 0, stroke: undefined }),
      layer(sprayStreamLocal(), 'body', 'back', { strokeWidth: 3 })
    )
  }
  return overlays
}

const transformLayer = (overlay: OverlayLayer, transform: GraffitiPathTransform): OverlayLayer => ({
  ...overlay,
  d: transformGraffitiPath(overlay.d, transform),
})

export const transformCanOverlays = (overlays: OverlayLayer[], transform: GraffitiPathTransform) =>
  overlays.map(overlay => transformLayer(overlay, transform))

export const canBodyPath = (transform: GraffitiPathTransform) =>
  transformGraffitiPath(canBodyLocal(), transform)

export const pieEyeWhitePath = (width: number, height: number) => {
  const rx = Math.max(width / 2, 1)
  const ry = Math.max(height / 2, 1)
  return ellipse(0, 0, rx, ry)
}

export const pieEyeWedgePath = (width: number, height: number) => {
  const rx = Math.max(width * 0.42, 1)
  const ry = Math.max(height * 0.42, 1)
  const cx = width * 0.05
  const cy = height * 0.04
  const start = (-38 * Math.PI) / 180
  const end = (58 * Math.PI) / 180
  const x1 = cx + rx * Math.cos(start)
  const y1 = cy + ry * Math.sin(start)
  const x2 = cx + rx * Math.cos(end)
  const y2 = cy + ry * Math.sin(end)
  return `${ellipse(cx, cy, rx, ry)}M${cx.toFixed(2)} ${cy.toFixed(2)}L${x1.toFixed(2)} ${y1.toFixed(2)}A${rx.toFixed(2)} ${ry.toFixed(2)} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z`
}

export const transformPieEye = (
  path: string,
  transform: {
    centerX: number
    centerY: number
    scaleX: number
    scaleY: number
    rotation: number
  }
) => transformGraffitiPath(path, transform)
