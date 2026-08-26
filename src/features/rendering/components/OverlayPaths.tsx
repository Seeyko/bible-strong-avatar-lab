import { type MotionValue } from 'motion'
import { motion } from 'motion/react'
import { overlayPaint, type OverlayLayer, type OverlayPlacement } from '@bible-strong/avatar-core'

export function OverlayPathList({
  overlays,
  paths,
  placement,
  colors,
}: {
  overlays: OverlayLayer[]
  paths?: MotionValue<string>[]
  placement: OverlayPlacement
  colors?: { body: string; eyes: string }
}) {
  return (
    <>
      {overlays.map((overlay, index) => {
        if (overlay.placement !== placement) return null
        const paint = colors ? overlayPaint(overlay, colors) : undefined
        const pathProps = {
          className: `avatar-overlay avatar-overlay-${overlay.fill}${
            overlay.strokeWidth === 0 ? ' is-unstroked' : ''
          }`,
          fill: paint?.fill,
          stroke: paint?.stroke,
          strokeWidth: paint?.strokeWidth,
          strokeLinejoin: 'round' as const,
          strokeLinecap: 'round' as const,
          fillRule: paint?.fillRule ?? overlay.fillRule ?? 'nonzero',
        }
        if (paths?.[index]) {
          return (
            <motion.path {...pathProps} d={paths[index]} key={`overlay-${placement}-${index}`} />
          )
        }
        return <path {...pathProps} d={overlay.d} key={`overlay-${placement}-${index}`} />
      })}
    </>
  )
}
