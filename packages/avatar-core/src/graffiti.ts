export const GRAFFITI_COLOR_TOKENS = {
  spot: '#289bd2',
  session: '#ee682a',
  event: '#b132ce',
  shop: '#40c814',
} as const

export type GraffitiColorToken = keyof typeof GRAFFITI_COLOR_TOKENS

export const graffitiRingIds = [
  'thick',
  'brush',
  'uniform-left',
  'uniform',
  'uniform-right',
] as const

export type GraffitiRingId = (typeof graffitiRingIds)[number]

export const graffitiEyeIds = [
  'blob-00',
  'blob-01',
  'blob-02',
  'blob-03',
  'blob-04',
  'blob-05',
  'blob-06',
  'blob-07',
  'blob-08',
  'blob-09',
  'blob-10',
  'blob-11',
  'blob-12',
  'blob-13',
  'blob-14',
  'blob-15',
] as const

export type GraffitiEyeId = (typeof graffitiEyeIds)[number]

export const DEFAULT_GRAFFITI_RING: GraffitiRingId = 'uniform'
export const DEFAULT_GRAFFITI_EYE: GraffitiEyeId = 'blob-07'
export const DEFAULT_GRAFFITI_EYE_RIGHT: GraffitiEyeId = 'blob-06'

export const graffitiRingLabels: Record<GraffitiRingId, string> = {
  thick: 'Anneau épais',
  brush: 'Anneau brossé',
  'uniform-left': 'Anneau uniforme gauche',
  uniform: 'Anneau du milieu',
  'uniform-right': 'Anneau uniforme droit',
}

export const graffitiEyeLabels: Record<GraffitiEyeId, string> = {
  'blob-00': 'Aplat long gauche',
  'blob-01': 'Aplat long droit',
  'blob-02': 'Aplat vertical',
  'blob-03': 'Aplat compact',
  'blob-04': 'Aplat ovale',
  'blob-05': 'Aplat hyped',
  'blob-06': 'Aplat idle droit',
  'blob-07': 'Aplat idle',
  'blob-08': 'Aplat clin',
  'blob-09': 'Aplat oops',
  'blob-10': 'Aplat fin',
  'blob-11': 'Aplat squint',
  'blob-12': 'Aplat trait',
  'blob-13': 'Aplat smear',
  'blob-14': 'Aplat large',
  'blob-15': 'Aplat splash',
}

export const graffitiColorTokenLabels: Record<GraffitiColorToken, string> = {
  spot: 'Spot',
  session: 'Session',
  event: 'Event',
  shop: 'Shop',
}

const GRAFFITI_UNITS = 120

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

const noisyRing = (
  radius: number,
  samples: number,
  seed: number,
  noise: number,
  clockwise: boolean,
  squash = 1
) => {
  const points = Array.from({ length: samples }, (_, index) => {
    const turn = clockwise ? index / samples : 1 - index / samples
    const angle = turn * Math.PI * 2 - Math.PI / 2
    const wobble = (hash(seed + index * 3.1) - 0.5) * noise
    const radial = radius * (1 + wobble)
    return [Math.cos(angle) * radial, Math.sin(angle) * radial * squash] as const
  })
  return closedSpline(points)
}

const dripPath = (x: number, y: number, width: number, length: number, seed: number) => {
  const tipX = x + (hash(seed) - 0.5) * width * 0.35
  const tipY = y + length
  const left = x - width / 2
  const right = x + width / 2
  return `M${left.toFixed(2)} ${y.toFixed(2)}C${left.toFixed(2)} ${(y + length * 0.45).toFixed(2)} ${(tipX - width * 0.2).toFixed(2)} ${(tipY - width * 0.35).toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}C${(tipX + width * 0.2).toFixed(2)} ${(tipY - width * 0.35).toFixed(2)} ${right.toFixed(2)} ${(y + length * 0.45).toFixed(2)} ${right.toFixed(2)} ${y.toFixed(2)}Z`
}

const splatters = (count: number, radius: number, seed: number, spread = 1) =>
  Array.from({ length: count }, (_, index) => {
    const angle = hash(seed + index * 7.3) * Math.PI * 2
    const distance = radius * (0.82 + hash(seed + index * 11.9) * 0.34 * spread)
    const size = 0.7 + hash(seed + index * 17.1) * 2.4
    const x = Math.cos(angle) * distance
    const y = Math.sin(angle) * distance
    return `M${(x + size).toFixed(2)} ${y.toFixed(2)}A${size.toFixed(2)} ${size.toFixed(2)} 0 1 1 ${(x - size).toFixed(2)} ${y.toFixed(2)}A${size.toFixed(2)} ${size.toFixed(2)} 0 1 1 ${(x + size).toFixed(2)} ${y.toFixed(2)}Z`
  }).join('')

const blobPath = (
  width: number,
  height: number,
  seed: number,
  drips: ReadonlyArray<readonly [number, number, number]>
) => {
  const samples = 18
  const points = Array.from({ length: samples }, (_, index) => {
    const angle = (index / samples) * Math.PI * 2 - Math.PI / 2
    const wobble = 1 + (hash(seed + index * 4.7) - 0.5) * 0.16
    return [
      (Math.cos(angle) * width * wobble) / 2,
      (Math.sin(angle) * height * wobble) / 2,
    ] as const
  })
  const body = closedSpline(points)
  const dripMarks = drips
    .map(([offset, widthScale, length], index) =>
      dripPath(offset, height * 0.28, width * widthScale, length, seed + index * 13)
    )
    .join('')
  const mist = splatters(7, Math.max(width, height) * 0.62, seed + 40, 0.7)
  return `${body}${dripMarks}${mist}`
}

const ringPath = ({
  outer,
  inner,
  seed,
  noise,
  drips,
  innerDrips = [],
  splatCount,
  squash = 1,
}: {
  outer: number
  inner: number
  seed: number
  noise: number
  drips: ReadonlyArray<readonly [number, number, number, number]>
  innerDrips?: ReadonlyArray<readonly [number, number, number, number]>
  splatCount: number
  squash?: number
}) => {
  const outerPath = noisyRing(outer, 36, seed, noise, true, squash)
  const innerPath = noisyRing(inner, 28, seed + 9, noise * 0.7, false, squash)
  const outerDrips = drips
    .map(([x, y, width, length], index) => dripPath(x, y, width, length, seed + 20 + index))
    .join('')
  const hanging = innerDrips
    .map(([x, y, width, length], index) => dripPath(x, y, width, length, seed + 80 + index))
    .join('')
  return `${outerPath}${innerPath}${outerDrips}${hanging}${splatters(splatCount, outer * 1.02, seed + 50)}`
}

export const graffitiRingPaths: Record<GraffitiRingId, string> = {
  thick: ringPath({
    outer: 118,
    inner: 58,
    seed: 1,
    noise: 0.045,
    splatCount: 22,
    drips: [
      [-18, 108, 7, 22],
      [6, 112, 8, 34],
      [28, 106, 5.5, 18],
    ],
    innerDrips: [
      [-12, -52, 4, 10],
      [16, -48, 3.5, 8],
    ],
  }),
  brush: ringPath({
    outer: 116,
    inner: 68,
    seed: 2,
    noise: 0.07,
    squash: 0.96,
    splatCount: 26,
    drips: [
      [22, 104, 5, 38],
      [38, 96, 4, 28],
      [-8, 108, 6, 16],
    ],
    innerDrips: [[24, -46, 3.2, 12]],
  }),
  'uniform-left': ringPath({
    outer: 114,
    inner: 78,
    seed: 3,
    noise: 0.028,
    splatCount: 16,
    drips: [
      [-28, 108, 5.5, 26],
      [-8, 112, 4.5, 18],
      [10, 110, 4, 12],
    ],
    innerDrips: [[-18, -70, 3, 9]],
  }),
  uniform: ringPath({
    outer: 114,
    inner: 78,
    seed: 4,
    noise: 0.026,
    splatCount: 18,
    drips: [
      [-16, 110, 5, 16],
      [4, 112, 6, 32],
      [22, 108, 4.5, 20],
      [36, 104, 3.5, 12],
    ],
    innerDrips: [
      [10, -70, 3.2, 11],
      [24, -66, 2.8, 8],
    ],
  }),
  'uniform-right': ringPath({
    outer: 114,
    inner: 78,
    seed: 5,
    noise: 0.028,
    splatCount: 16,
    drips: [
      [8, 110, 4.5, 14],
      [26, 112, 5.5, 28],
      [42, 106, 4, 18],
    ],
    innerDrips: [[20, -68, 3, 10]],
  }),
}

export const graffitiEyePaths: Record<GraffitiEyeId, string> = {
  'blob-00': blobPath(22, 34, 10, [
    [-4, 0.18, 16],
    [2, 0.14, 22],
    [7, 0.12, 11],
  ]),
  'blob-01': blobPath(22, 33, 11, [
    [-3, 0.16, 18],
    [5, 0.14, 14],
  ]),
  'blob-02': blobPath(20, 32, 12, [
    [-2, 0.15, 12],
    [4, 0.12, 9],
  ]),
  'blob-03': blobPath(21, 28, 13, [[0, 0.16, 10]]),
  'blob-04': blobPath(28, 22, 14, [
    [-6, 0.12, 8],
    [5, 0.1, 6],
  ]),
  'blob-05': blobPath(36, 20, 15, [
    [-8, 0.1, 7],
    [0, 0.12, 10],
    [8, 0.1, 6],
  ]),
  'blob-06': blobPath(24, 28, 16, [
    [-3, 0.16, 14],
    [4, 0.14, 10],
  ]),
  'blob-07': blobPath(24, 30, 17, [
    [-5, 0.16, 12],
    [0, 0.18, 16],
    [5, 0.14, 9],
  ]),
  'blob-08': blobPath(34, 12, 18, [
    [-6, 0.08, 5],
    [4, 0.07, 4],
  ]),
  'blob-09': blobPath(32, 11, 19, [[0, 0.08, 6]]),
  'blob-10': blobPath(30, 10, 20, [
    [-8, 0.07, 4],
    [7, 0.06, 3],
  ]),
  'blob-11': blobPath(28, 13, 21, [[3, 0.08, 5]]),
  'blob-12': blobPath(40, 9, 22, [
    [-10, 0.05, 4],
    [8, 0.05, 3],
  ]),
  'blob-13': blobPath(38, 10, 23, [[0, 0.06, 5]]),
  'blob-14': blobPath(42, 11, 24, [
    [-12, 0.05, 4],
    [0, 0.06, 6],
    [12, 0.05, 3],
  ]),
  'blob-15': blobPath(36, 14, 25, [
    [-6, 0.08, 8],
    [7, 0.07, 5],
  ]),
}

export const isGraffitiRingId = (value: unknown): value is GraffitiRingId =>
  typeof value === 'string' && (graffitiRingIds as readonly string[]).includes(value)

export const isGraffitiEyeId = (value: unknown): value is GraffitiEyeId =>
  typeof value === 'string' && (graffitiEyeIds as readonly string[]).includes(value)

export const parseGraffitiRingId = (
  value: unknown,
  fallback: GraffitiRingId = DEFAULT_GRAFFITI_RING
) => (isGraffitiRingId(value) ? value : fallback)

export const parseGraffitiEyeId = (value: unknown, fallback?: GraffitiEyeId) =>
  isGraffitiEyeId(value) ? value : fallback

export type GraffitiPathTransform = {
  centerX: number
  centerY: number
  scaleX: number
  scaleY: number
  rotation: number
}

const transformPoint = (
  x: number,
  y: number,
  { centerX, centerY, scaleX, scaleY, rotation }: GraffitiPathTransform
) => {
  const scaledX = x * scaleX
  const scaledY = y * scaleY
  const cosine = Math.cos(rotation)
  const sine = Math.sin(rotation)
  return [
    centerX + scaledX * cosine - scaledY * sine,
    centerY + scaledX * sine + scaledY * cosine,
  ] as const
}

const numberToken = '[-+]?(?:\\d*\\.\\d+|\\d+)(?:e[-+]?\\d+)?'
const pathCommandPattern = new RegExp(
  `([MmLlCcQqTtSsAaZz])\\s*((?:${numberToken}(?:[\\s,]+${numberToken})*)?)`,
  'g'
)
const numberPattern = new RegExp(numberToken, 'gi')

const readNumbers = (value: string) =>
  [...value.matchAll(numberPattern)].map(match => Number(match[0]))

export const transformGraffitiPath = (path: string, transform: GraffitiPathTransform) => {
  pathCommandPattern.lastIndex = 0
  let result = ''
  let match: RegExpExecArray | null
  while ((match = pathCommandPattern.exec(path))) {
    const command = match[1]
    const values = readNumbers(match[2] ?? '')
    if (command === 'Z' || command === 'z') {
      result += 'Z'
      continue
    }
    const pairs =
      command === 'C' || command === 'c' ? 3 : command === 'Q' || command === 'q' ? 2 : 1
    const transformed: number[] = []
    for (let index = 0; index + 1 < values.length; index += 2) {
      const point = transformPoint(values[index], values[index + 1], transform)
      transformed.push(point[0], point[1])
    }
    const outputCommand = command.toUpperCase()
    result += outputCommand
    for (let index = 0; index < transformed.length; index += 2 * pairs) {
      const slice = transformed.slice(index, index + 2 * pairs)
      result += slice.map(value => value.toFixed(2)).join(' ')
    }
  }
  return result
}

export const graffitiRingViewBox = `${-GRAFFITI_UNITS} ${-GRAFFITI_UNITS} ${GRAFFITI_UNITS * 2} ${GRAFFITI_UNITS * 2}`

export const resolveGraffitiEyeGlyph = (
  width: number,
  height: number,
  preferred?: GraffitiEyeId
): GraffitiEyeId => {
  if (height <= 18 || width / Math.max(height, 1) >= 1.7) return 'blob-08'
  if (width / Math.max(height, 1) >= 1.15) return 'blob-05'
  return preferred ?? DEFAULT_GRAFFITI_EYE
}

export const graffitiSvgDocument = (path: string, fill = '#111316') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${graffitiRingViewBox}" fill="${fill}"><path d="${path}"/></svg>`
