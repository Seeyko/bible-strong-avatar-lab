import type { CSSProperties } from 'react'

import { Button } from '@/components/ui/button'
import { useStudioLanguage } from '@/i18n'

import {
  GRAFFITI_COLOR_TOKENS,
  graffitiColorTokenLabels,
  graffitiEyeIds,
  graffitiEyeLabels,
  graffitiEyePaths,
  graffitiRingIds,
  graffitiRingLabels,
  graffitiRingPaths,
  graffitiRingViewBox,
  type GraffitiColorToken,
  type GraffitiEyeId,
  type GraffitiRingId,
} from '@bible-strong/avatar-core'

function GlyphThumb({ path, fill }: { path: string; fill: string }) {
  return (
    <svg viewBox={graffitiRingViewBox} aria-hidden="true">
      <path d={path} fill={fill} />
    </svg>
  )
}

export function GraffitiRingGrid({
  value,
  onChange,
}: {
  value?: GraffitiRingId
  onChange: (ring: GraffitiRingId) => void
}) {
  const { t } = useStudioLanguage()
  return (
    <div className="surface-grid graffiti-grid">
      {graffitiRingIds.map(ring => (
        <Button
          className="surface-card"
          variant="outline"
          type="button"
          key={ring}
          aria-pressed={value === ring}
          onClick={() => onChange(ring)}
        >
          <GlyphThumb path={graffitiRingPaths[ring]} fill="currentColor" />
          <span>{t(graffitiRingLabels[ring])}</span>
        </Button>
      ))}
    </div>
  )
}

export function GraffitiEyeGrid({
  value,
  onChange,
}: {
  value?: GraffitiEyeId
  onChange: (eye: GraffitiEyeId) => void
}) {
  const { t } = useStudioLanguage()
  return (
    <div className="surface-grid graffiti-eye-grid">
      {graffitiEyeIds.map(eye => (
        <Button
          className="surface-card"
          variant="outline"
          type="button"
          key={eye}
          aria-pressed={value === eye}
          onClick={() => onChange(eye)}
        >
          <GlyphThumb path={graffitiEyePaths[eye]} fill="currentColor" />
          <span>{t(graffitiEyeLabels[eye])}</span>
        </Button>
      ))}
    </div>
  )
}

export function GraffitiColorTokens({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  const { t } = useStudioLanguage()
  return (
    <div className="graffiti-token-row" role="group" aria-label={t('Tokens de couleur')}>
      {(Object.keys(GRAFFITI_COLOR_TOKENS) as GraffitiColorToken[]).map(token => {
        const color = GRAFFITI_COLOR_TOKENS[token]
        return (
          <Button
            className="graffiti-token"
            variant="outline"
            type="button"
            key={token}
            aria-pressed={value.toLowerCase() === color}
            aria-label={`${t(graffitiColorTokenLabels[token])} ${color}`}
            onClick={() => onChange(color)}
            style={{ '--graffiti-token': color } as CSSProperties}
          >
            <span className="graffiti-token-swatch" />
            <span>{t(graffitiColorTokenLabels[token])}</span>
          </Button>
        )
      })}
    </div>
  )
}
