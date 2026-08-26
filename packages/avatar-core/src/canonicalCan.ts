import canonicalCanSvgSource from './assets/can-kid.svg?raw'
import {
  CANONICAL_CAN_LIMB_RESTS,
  canonicalCanFacePlateMarkup,
  canonicalCanLimbAngles,
  canonicalCanSmileMarkup,
  proceduralCanonicalCanLimbMarkup,
} from './canLimbs'

export const CANONICAL_CAN_SESSION_FILL = '#ee682a'

export const CANONICAL_CAN_PARTS = [
  'shadow',
  'leg-back',
  'arm-hip',
  'body',
  'eyes',
  'spray',
  'arm-point',
  'leg-front',
] as const

export type CanonicalCanPartId = (typeof CANONICAL_CAN_PARTS)[number]

export const CANONICAL_CAN_LIMBS = ['armHip', 'armPoint', 'legBack', 'legFront'] as const
export type CanonicalCanLimbId = (typeof CANONICAL_CAN_LIMBS)[number]

const LIMB_PART: Record<CanonicalCanLimbId, CanonicalCanPartId> = {
  armHip: 'arm-hip',
  armPoint: 'arm-point',
  legBack: 'leg-back',
  legFront: 'leg-front',
}

export type CanonicalCanViewBox = {
  x: number
  y: number
  width: number
  height: number
}

export type CanonicalCanPivot = { x: number; y: number }

export type CanonicalCanSource = {
  innerMarkup: string
  viewBox: CanonicalCanViewBox
  transform: string
}

const defaultViewBox: CanonicalCanViewBox = { x: 0, y: 0, width: 1024, height: 1024 }

const defaultPivots: Record<CanonicalCanPartId, CanonicalCanPivot> = {
  shadow: { x: 320, y: 940 },
  spray: { x: 400, y: 230 },
  'arm-hip': { x: 210, y: 490 },
  'arm-point': { x: 430, y: 505 },
  'leg-back': { x: 255, y: 705 },
  'leg-front': { x: 375, y: 705 },
  eyes: { x: 320, y: 460 },
  body: { x: 320, y: 520 },
}

const groupPattern = /<g\b([^>]*)data-rmp-part="([^"]+)"([^>]*)>([\s\S]*?)<\/g>/gi

export const isCanonicalCanReady = (source = canonicalCanSvgSource) =>
  !/data-rmp-canonical\s*=\s*["']pending["']/i.test(source) &&
  /<(path|g|circle|ellipse|rect|polygon|polyline)\b/i.test(source)

const parseViewBox = (source: string): CanonicalCanViewBox => {
  const match = source.match(/viewBox\s*=\s*["']([^"']+)["']/i)
  if (!match?.[1]) return defaultViewBox
  const parts = match[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (parts.length !== 4 || parts.some(value => !Number.isFinite(value))) return defaultViewBox
  const [x, y, width, height] = parts
  if (!width || !height) return defaultViewBox
  return { x, y, width, height }
}

export const parseCanonicalCanSource = (
  source = canonicalCanSvgSource
): CanonicalCanSource | null => {
  if (!isCanonicalCanReady(source)) return null
  const innerMarkup = source
    .replace(/<\?xml[^>]*>/i, '')
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/^[\s\S]*?<svg\b[^>]*>/i, '')
    .replace(/<\/svg>[\s\S]*$/i, '')
    .trim()
  if (!innerMarkup) return null
  const viewBox = parseViewBox(source)
  return {
    innerMarkup,
    viewBox,
    transform: canonicalCanFitTransform(viewBox),
  }
}

const setMarkedFill = (markup: string, role: 'body' | 'puff', color: string) =>
  markup
    .replace(
      new RegExp(`(<[^>]*data-rmp-fill="${role}"[^>]*?)(?:fill="[^"]*")?`, 'gi'),
      (_match, prefix: string) =>
        /fill="/i.test(prefix) ? `${prefix}` : `${prefix} fill="${color}"`
    )
    .replace(new RegExp(`(<[^>]*data-rmp-fill="${role}"[^>]*fill=")[^"]*(")`, 'gi'), `$1${color}$2`)

export const tintCanonicalCanMarkup = (markup: string, colors: { body: string; puff?: string }) => {
  const body = colors.body
  const puff = colors.puff ?? colors.body
  let next = markup.replace(new RegExp(CANONICAL_CAN_SESSION_FILL, 'gi'), body)
  next = setMarkedFill(next, 'body', body)
  next = setMarkedFill(next, 'puff', puff)
  return next
}

export const stripCanonicalCanPuff = (markup: string) =>
  markup
    .replace(/<g\b[^>]*data-rmp-(?:fill|part)="(?:puff|spray)"[^>]*>[\s\S]*?<\/g>/gi, '')
    .replace(/<[^>]*data-rmp-(?:fill|part)="(?:puff|spray)"[^>]*\/>/gi, '')
    .replace(/<[^>]*data-rmp-(?:fill|part)="(?:puff|spray)"[^>]*>[\s\S]*?<\/[a-zA-Z]+>/gi, '')

export const applyCanonicalCanOptions = (
  markup: string,
  options: { body: string; puff?: string; spray?: boolean }
) => {
  const tinted = tintCanonicalCanMarkup(markup, options)
  return options.spray === false ? stripCanonicalCanPuff(tinted) : tinted
}

export const canonicalCanFitTransform = (viewBox: CanonicalCanViewBox, size = 240) => {
  const scale = size / Math.max(viewBox.width, viewBox.height)
  const centerX = viewBox.x + viewBox.width / 2
  const centerY = viewBox.y + viewBox.height / 2
  return `scale(${scale}) translate(${-centerX} ${-centerY})`
}

const parsePivot = (attributes: string, part: CanonicalCanPartId): CanonicalCanPivot => {
  const match = attributes.match(/data-rmp-pivot="([^"]+)"/i)
  if (!match?.[1]) return defaultPivots[part]
  const [x, y] = match[1].split(/[\s,]+/).map(Number)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return defaultPivots[part]
  return { x, y }
}

const rotateAround = (degrees: number, pivot: CanonicalCanPivot) =>
  Math.abs(degrees) < 0.01 ? '' : `rotate(${degrees} ${pivot.x} ${pivot.y})`

const scaleAround = (scaleX: number, scaleY: number, pivot: CanonicalCanPivot) => {
  if (Math.abs(scaleX - 1) < 0.001 && Math.abs(scaleY - 1) < 0.001) return ''
  return `translate(${pivot.x} ${pivot.y}) scale(${scaleX} ${scaleY}) translate(${-pivot.x} ${-pivot.y})`
}

const joinTransforms = (...parts: string[]) => parts.filter(Boolean).join(' ')

export const canonicalCanLean = (
  viewBox: CanonicalCanViewBox,
  headX: number,
  headY: number,
  headZ: number
) => {
  const pivot = {
    x: viewBox.x + viewBox.width * 0.31,
    y: viewBox.y + viewBox.height * 0.51,
  }
  const pitch = (headX * Math.PI) / 180
  const yaw = (headY * Math.PI) / 180
  const scaleX = Math.sign(Math.cos(yaw) || 1) * Math.max(0.88, Math.abs(Math.cos(yaw)))
  const scaleY = Math.max(0.9, Math.abs(Math.cos(pitch)))
  const shiftX = Math.sin(yaw) * viewBox.width * 0.035
  const shiftY = Math.sin(pitch) * viewBox.height * 0.025
  const translate = `translate(${shiftX} ${shiftY})`
  const rotate = rotateAround(headZ, pivot)
  return {
    pivot,
    can: joinTransforms(translate, rotate, scaleAround(scaleX, scaleY, pivot)),
    limbs: joinTransforms(translate, rotate),
  }
}

export const canonicalCanRigTransform = (
  viewBox: CanonicalCanViewBox,
  headX: number,
  headY: number,
  headZ: number
) => canonicalCanLean(viewBox, headX, headY, headZ).can

export type CanonicalCanPoseExpression = {
  headX: number
  headY: number
  headZ: number
  widthLeft: number
  widthRight: number
  heightLeft: number
  heightRight: number
  spacing: number
  positionXLeft: number
  positionXRight: number
  positionYLeft: number
  positionYRight: number
  leftAngle: number
  rightAngle: number
  armHip?: number
  armPoint?: number
  legBack?: number
  legFront?: number
}

export type CanonicalCanPoseInput = {
  expression: CanonicalCanPoseExpression
  blink?: number
  spray?: boolean
  eyeOffset?: Readonly<{ x: number; y: number }>
}

export const poseCanonicalCanMarkup = (
  markup: string,
  input: CanonicalCanPoseInput,
  viewBox: CanonicalCanViewBox = defaultViewBox
) => {
  const blink = input.blink ?? 1
  const offset = input.eyeOffset ?? { x: 0, y: 0 }
  const expression = input.expression
  const prepared = input.spray === false ? stripCanonicalCanPuff(markup) : markup
  const lean = canonicalCanLean(viewBox, expression.headX, expression.headY, expression.headZ)
  const lookX =
    (expression.positionXLeft + expression.positionXRight) / 2 +
    (expression.spacing - 44) * 0.12 +
    offset.x * 0.45
  const lookY = (expression.positionYLeft + expression.positionYRight) / 2 + 10 + offset.y * 0.45
  const eyeScaleX = Math.max(0.55, (expression.widthLeft + expression.widthRight) / 64)
  const eyeScaleY = Math.max(0.12, ((expression.heightLeft + expression.heightRight) / 80) * blink)
  const eyeTilt = (expression.leftAngle + expression.rightAngle) / 2
  const limbs = canonicalCanLimbAngles(expression)

  const groups = new Map<string, { attributes: string; inner: string; pivot: CanonicalCanPivot }>()
  for (const match of prepared.matchAll(groupPattern)) {
    const part = match[2]
    if (!CANONICAL_CAN_PARTS.includes(part as CanonicalCanPartId)) continue
    const attributes = `${match[1]} ${match[3]}`
    groups.set(part, {
      attributes,
      inner: match[4],
      pivot: parsePivot(attributes, part as CanonicalCanPartId),
    })
  }

  const lockGroup = (part: CanonicalCanPartId, inner: string, transform = '') => {
    const pivot = groups.get(part)?.pivot ?? defaultPivots[part]
    const attribute = transform ? ` transform="${transform}"` : ''
    return `<g data-rmp-part="${part}" data-rmp-pivot="${pivot.x},${pivot.y}"${attribute}>${inner}</g>`
  }

  const limbGroup = (part: keyof typeof CANONICAL_CAN_LIMB_RESTS, angle: number) => {
    const rest = CANONICAL_CAN_LIMB_RESTS[part]
    const transform = joinTransforms(lean.limbs, rotateAround(angle, rest.pivot))
    return `<g data-rmp-part="${part}" data-rmp-procedural="limb" data-rmp-pivot="${rest.pivot.x},${rest.pivot.y}"${transform ? ` transform="${transform}"` : ''}>${proceduralCanonicalCanLimbMarkup(part)}</g>`
  }

  const eyesPivot = groups.get('eyes')?.pivot ?? defaultPivots.eyes
  const eyeMotion = joinTransforms(
    `translate(${lookX} ${lookY})`,
    rotateAround(eyeTilt, eyesPivot),
    scaleAround(eyeScaleX, eyeScaleY, eyesPivot)
  )
  const eyesInner = groups.get('eyes')?.inner ?? ''
  const bodyInner = `${groups.get('body')?.inner ?? ''}${canonicalCanFacePlateMarkup()}`
  const sprayInner = input.spray === false ? '' : (groups.get('spray')?.inner ?? '')
  const shadow = lockGroup('shadow', groups.get('shadow')?.inner ?? '')
  const canInner = `${lockGroup('body', bodyInner)}${lockGroup(
    'eyes',
    `<g data-rmp-part="eye-glyphs"${eyeMotion ? ` transform="${eyeMotion}"` : ''}>${eyesInner}</g><g data-rmp-part="mouth">${canonicalCanSmileMarkup()}</g>`
  )}${sprayInner ? lockGroup('spray', sprayInner) : ''}`
  const can = lean.can ? `<g data-rmp-part="can" transform="${lean.can}">${canInner}</g>` : canInner

  return `${shadow}${limbGroup('leg-back', limbs.legBack)}${limbGroup('arm-hip', limbs.armHip)}${can}${limbGroup('arm-point', limbs.armPoint)}${limbGroup('leg-front', limbs.legFront)}`
}

export const poseCanonicalCan = (
  source: CanonicalCanSource | null,
  input: CanonicalCanPoseInput
): CanonicalCanSource | null => {
  if (!source) return null
  return {
    viewBox: source.viewBox,
    transform: source.transform,
    innerMarkup: poseCanonicalCanMarkup(source.innerMarkup, input, source.viewBox),
  }
}

export const serializeCanonicalCanLayer = (
  source: CanonicalCanSource,
  colors: { body: string; puff?: string }
) =>
  `<g class="avatar-can-lock" transform="${source.transform}">${tintCanonicalCanMarkup(source.innerMarkup, colors)}</g>`

export const resolveCanonicalCan = (source = canonicalCanSvgSource) =>
  parseCanonicalCanSource(source)

export const canonicalCanLimbPart = (limb: CanonicalCanLimbId) => LIMB_PART[limb]
