import { useEffect, useRef } from 'react'
import { type MotionValue } from 'motion/react'

import {
  serializeCanonicalCanLayer,
  tintCanonicalCanMarkup,
  type CanonicalCanSource,
} from '@/features/avatar/geometry'

export function CanonicalCanGraphic({
  source,
  bodyColor,
  className,
  onPointerDown,
}: {
  source: CanonicalCanSource
  bodyColor: string
  className?: string
  onPointerDown?: (event: React.PointerEvent<SVGGElement>) => void
}) {
  return (
    <g
      className={className}
      transform={source.transform}
      onPointerDown={onPointerDown}
      dangerouslySetInnerHTML={{
        __html: tintCanonicalCanMarkup(source.innerMarkup, { body: bodyColor }),
      }}
    />
  )
}

export function LiveCanonicalCanGraphic({
  transform,
  markup,
  bodyColor,
  onPointerDown,
}: {
  transform: MotionValue<string>
  markup: MotionValue<string>
  bodyColor: MotionValue<string>
  onPointerDown?: (event: React.PointerEvent<SVGGElement>) => void
}) {
  const ref = useRef<SVGGElement>(null)
  const paint = () => {
    const node = ref.current
    if (!node) return
    const raw = markup.get()
    node.setAttribute('transform', transform.get())
    node.innerHTML = raw ? tintCanonicalCanMarkup(raw, { body: bodyColor.get() }) : ''
  }
  useEffect(() => {
    paint()
    const offMarkup = markup.on('change', paint)
    const offColor = bodyColor.on('change', paint)
    const offTransform = transform.on('change', paint)
    return () => {
      offMarkup()
      offColor()
      offTransform()
    }
  })
  return <g ref={ref} className="avatar-can-lock" onPointerDown={onPointerDown} />
}

export const canonicalCanSnapshotMarkup = (source: CanonicalCanSource, bodyColor: string) =>
  serializeCanonicalCanLayer(source, { body: bodyColor })
