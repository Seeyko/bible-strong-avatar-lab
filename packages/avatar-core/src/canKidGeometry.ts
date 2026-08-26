export const CAN_KID_ORANGE = '#ee682a'
export const CAN_KID_INK = '#111316'
export const CAN_KID_PAPER = '#fffef8'
export const CAN_KID_METAL = '#c5c8cc'
export const CAN_KID_TONGUE = '#b84628'
export const CAN_KID_SHADOW = '#1a1714'

export const CAN_KID_VIEWBOX = { x: 0, y: 0, width: 860, height: 1040 } as const

export const CAN_KID_PIVOTS = {
  shadow: { x: 300, y: 980 },
  body: { x: 300, y: 520 },
  eyes: { x: 300, y: 458 },
  spray: { x: 332, y: 196 },
  'arm-hip': { x: 196, y: 498 },
  'arm-point': { x: 404, y: 508 },
  'leg-back': { x: 244, y: 708 },
  'leg-front': { x: 356, y: 708 },
} as const

export const CAN_KID_BODY = {
  x: 190,
  y: 300,
  width: 220,
  height: 410,
  rx: 40,
  ry: 28,
} as const

const round = (value: number) => value.toFixed(2)

export const ellipsePath = (cx: number, cy: number, rx: number, ry: number) =>
  `M${round(cx + rx)} ${round(cy)}A${round(rx)} ${round(ry)} 0 1 1 ${round(cx - rx)} ${round(cy)}A${round(rx)} ${round(ry)} 0 1 1 ${round(cx + rx)} ${round(cy)}Z`

export const hosePath = (
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

const attrs = (values: Record<string, string | number | undefined>) =>
  Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')

const node = (tag: string, values: Record<string, string | number | undefined>, inner = '') =>
  inner ? `<${tag} ${attrs(values)}>${inner}</${tag}>` : `<${tag} ${attrs(values)}/>`

export const markedShape = (
  tag: string,
  values: Record<string, string | number | undefined>,
  role: string
) => node(tag, { ...values, 'data-rmp-fill': role })

const partGroup = (part: keyof typeof CAN_KID_PIVOTS, inner: string) => {
  const pivot = CAN_KID_PIVOTS[part]
  return node(
    'g',
    {
      'data-rmp-part': part,
      'data-rmp-pivot': `${pivot.x},${pivot.y}`,
      'data-rmp-geometry': 'clean',
    },
    inner
  )
}

const piePupil = (cx: number, cy: number, rx: number, ry: number, flip: number) => {
  const wedge = `M${round(cx)} ${round(cy)}L${round(cx + flip * rx * 0.08)} ${round(cy - ry * 0.98)}L${round(cx + flip * rx * 0.98)} ${round(cy - ry * 0.08)}Z`
  return markedShape(
    'path',
    {
      d: `${ellipsePath(cx, cy, rx, ry)}${wedge}`,
      fill: CAN_KID_INK,
      'fill-rule': 'evenodd',
    },
    'ink'
  )
}

const brow = (cx: number, cy: number, flip: number) =>
  markedShape(
    'path',
    {
      d: `M${round(cx - 18 * flip)} ${round(cy)}C${round(cx - 6 * flip)} ${round(cy - 10)} ${round(cx + 8 * flip)} ${round(cy - 9)} ${round(cx + 20 * flip)} ${round(cy - 2)}`,
      fill: 'none',
      stroke: CAN_KID_INK,
      'stroke-width': 5,
      'stroke-linecap': 'round',
    },
    'ink'
  )

export const canKidFaceClipMarkup = (clipId = 'rmp-can-face-clip') =>
  node(
    'clipPath',
    { id: clipId },
    markedShape(
      'rect',
      {
        x: CAN_KID_BODY.x,
        y: CAN_KID_BODY.y,
        width: CAN_KID_BODY.width,
        height: CAN_KID_BODY.height,
        rx: CAN_KID_BODY.rx,
        ry: CAN_KID_BODY.ry,
      },
      'clip'
    )
  )

export const canKidShadowMarkup = () =>
  [
    markedShape(
      'ellipse',
      {
        cx: CAN_KID_PIVOTS.shadow.x,
        cy: CAN_KID_PIVOTS.shadow.y,
        rx: 148,
        ry: 20,
        fill: CAN_KID_SHADOW,
        opacity: 0.18,
      },
      'shadow'
    ),
  ].join('')

export const canKidBodyMarkup = () =>
  [
    markedShape(
      'rect',
      {
        x: CAN_KID_BODY.x,
        y: CAN_KID_BODY.y,
        width: CAN_KID_BODY.width,
        height: CAN_KID_BODY.height,
        rx: CAN_KID_BODY.rx,
        ry: CAN_KID_BODY.ry,
        fill: CAN_KID_ORANGE,
        stroke: CAN_KID_INK,
        'stroke-width': 8,
      },
      'body'
    ),
    markedShape(
      'rect',
      {
        x: 198,
        y: 312,
        width: 204,
        height: 10,
        rx: 4,
        fill: CAN_KID_METAL,
        stroke: CAN_KID_INK,
        'stroke-width': 3,
      },
      'metal'
    ),
    markedShape(
      'rect',
      {
        x: 198,
        y: 688,
        width: 204,
        height: 12,
        rx: 4,
        fill: CAN_KID_METAL,
        stroke: CAN_KID_INK,
        'stroke-width': 3,
      },
      'metal'
    ),
    markedShape(
      'rect',
      {
        x: 214,
        y: 248,
        width: 172,
        height: 62,
        rx: 28,
        fill: CAN_KID_INK,
      },
      'ink'
    ),
    markedShape(
      'ellipse',
      {
        cx: 300,
        cy: 252,
        rx: 86,
        ry: 26,
        fill: CAN_KID_INK,
      },
      'ink'
    ),
    markedShape(
      'rect',
      {
        x: 278,
        y: 168,
        width: 44,
        height: 86,
        rx: 14,
        fill: CAN_KID_INK,
      },
      'ink'
    ),
    markedShape(
      'ellipse',
      {
        cx: 300,
        cy: 166,
        rx: 26,
        ry: 12,
        fill: CAN_KID_INK,
      },
      'ink'
    ),
    markedShape(
      'circle',
      {
        cx: 318,
        cy: 196,
        r: 11,
        fill: CAN_KID_ORANGE,
        stroke: CAN_KID_INK,
        'stroke-width': 3,
      },
      'body'
    ),
  ].join('')

export const canKidEyesMarkup = () =>
  [
    markedShape(
      'ellipse',
      {
        cx: 256,
        cy: 460,
        rx: 40,
        ry: 50,
        fill: CAN_KID_PAPER,
        stroke: CAN_KID_INK,
        'stroke-width': 6,
      },
      'white'
    ),
    piePupil(258, 464, 24, 30, 1),
    markedShape(
      'ellipse',
      {
        cx: 348,
        cy: 452,
        rx: 40,
        ry: 50,
        fill: CAN_KID_PAPER,
        stroke: CAN_KID_INK,
        'stroke-width': 6,
      },
      'white'
    ),
    piePupil(350, 456, 24, 30, -1),
    brow(252, 396, 1),
    brow(352, 388, -1),
  ].join('')

export const buildCanKidStaticMarkup = () =>
  [
    partGroup('shadow', canKidShadowMarkup()),
    partGroup('body', canKidBodyMarkup()),
    partGroup('eyes', canKidEyesMarkup()),
    partGroup('spray', ''),
  ].join('\n')

export const buildCanKidSvg = () =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CAN_KID_VIEWBOX.x} ${CAN_KID_VIEWBOX.y} ${CAN_KID_VIEWBOX.width} ${CAN_KID_VIEWBOX.height}" data-rmp-canonical="ready" data-rmp-geometry="clean">`,
    buildCanKidStaticMarkup(),
    '</svg>',
    '',
  ].join('\n')

const pathCommands = (markup: string) =>
  [...markup.matchAll(/\bd="([^"]+)"/g)].map(match => match[1] ?? '')

export const isCleanGeometricMarkup = (markup: string) => {
  if (!markup.includes('data-rmp-geometry="clean"')) return false
  if (/M0,0\s*L/i.test(markup)) return false
  return pathCommands(markup).every(path => {
    const lines = path.match(/[L]/gi)?.length ?? 0
    const points = path.match(/[ML]/gi)?.length ?? 0
    return lines <= 4 && points <= 8
  })
}
