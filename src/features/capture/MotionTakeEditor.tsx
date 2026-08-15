import { Pause, Play, RotateCcw, Video } from 'lucide-react'
import type { PointerEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  motionChannels,
  type MotionChannel,
  type MotionTake,
  type MotionTakeSettings,
} from '@/features/capture/motionTake'

const channels: { channel: MotionChannel; label: string; range: number; color: string }[] = [
  { channel: 'pitch', label: 'Pitch', range: 38, color: '#567ef0' },
  { channel: 'yaw', label: 'Yaw', range: 52, color: '#ef725f' },
  { channel: 'roll', label: 'Roll', range: 42, color: '#d2a83f' },
  { channel: 'positionX', label: 'Move X', range: 55, color: '#d05a87' },
  { channel: 'positionY', label: 'Move Y', range: 55, color: '#62a8c6' },
  { channel: 'positionZ', label: 'Depth', range: 0.48, color: '#d67b3b' },
  { channel: 'lookX', label: 'Gaze X', range: 1, color: '#2f9f83' },
  { channel: 'lookY', label: 'Gaze Y', range: 1, color: '#9670d6' },
  { channel: 'blink', label: 'Blink', range: 1, color: '#34383f' },
]

const curvePoints = (take: MotionTake, channel: MotionChannel, range: number) =>
  take.samples.map(sample => {
    const x = take.duration ? (sample.time / take.duration) * 100 : 0
    const normalized = channel === 'blink' ? sample[channel] * 2 - 1 : sample[channel] / range
    return { x, y: 12 - Math.max(-1, Math.min(1, normalized)) * 9 }
  })

const curvePath = (take: MotionTake, channel: MotionChannel, range: number, rounded = false) => {
  if (take.samples.length === 0) return ''
  const points = curvePoints(take, channel, range)
  if (!rounded || points.length < 3)
    return points
      .map(
        (point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
      )
      .join(' ')
  return points.slice(0, -1).reduce(
    (path, point, index) => {
      const before = points[Math.max(0, index - 1)]
      const next = points[index + 1]
      const after = points[Math.min(points.length - 1, index + 2)]
      const controlA = {
        x: point.x + (next.x - before.x) / 6,
        y: point.y + (next.y - before.y) / 6,
      }
      const controlB = {
        x: next.x - (after.x - point.x) / 6,
        y: next.y - (after.y - point.y) / 6,
      }
      return `${path} C${controlA.x.toFixed(2)} ${controlA.y.toFixed(2)} ${controlB.x.toFixed(2)} ${controlB.y.toFixed(2)} ${next.x.toFixed(2)} ${next.y.toFixed(2)}`
    },
    `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`
  )
}

function EditorSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (value: number) => string
  onChange: (value: number) => void
}) {
  const id = `take-${label.toLowerCase()}`
  return (
    <div className="take-editor-slider">
      <div>
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{format(value)}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={event => onChange(Number(event.currentTarget.value))}
      />
    </div>
  )
}

export function MotionTakeEditor({
  take,
  processedTake,
  settings,
  playhead,
  playing,
  onSettingsChange,
  onSeek,
  onTogglePlayback,
  onRetake,
}: {
  take: MotionTake
  processedTake: MotionTake
  settings: MotionTakeSettings
  playhead: number
  playing: boolean
  onSettingsChange: (settings: MotionTakeSettings) => void
  onSeek: (time: number) => void
  onTogglePlayback: () => void
  onRetake: () => void
}) {
  const seekFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    onSeek(((event.clientX - bounds.left) / bounds.width) * processedTake.duration)
  }
  const playheadX = processedTake.duration ? (playhead / processedTake.duration) * 100 : 0

  return (
    <div className="take-editor">
      <div className="take-editor-heading">
        <div>
          <span>Recorded take · 01</span>
          <h2>Refine the gesture</h2>
        </div>
        <div className="take-editor-duration">
          <strong>{(processedTake.duration / 1000).toFixed(2)}s</strong>
          <span>{take.samples.length} samples</span>
        </div>
      </div>

      <div className="take-editor-legend">
        <span className="is-raw">Raw capture</span>
        <span className="is-refined">Refined curve</span>
      </div>

      <div
        className="take-timeline"
        onPointerDown={event => {
          event.currentTarget.setPointerCapture(event.pointerId)
          seekFromPointer(event)
        }}
        onPointerMove={event => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromPointer(event)
        }}
      >
        <span className="take-playhead" style={{ left: `${playheadX}%` }} />
        {channels.map(({ channel, label, range, color }) => (
          <div className="take-channel" key={channel}>
            <span>{label}</span>
            <svg viewBox="0 0 100 24" preserveAspectRatio="none" aria-label={`${label} curve`}>
              <line x1="0" y1="12" x2="100" y2="12" />
              <path className="take-raw-curve" d={curvePath(take, channel, range)} />
              <path
                className="take-refined-curve"
                d={curvePath(processedTake, channel, range, true)}
                style={{ stroke: color }}
              />
            </svg>
          </div>
        ))}
      </div>

      <div className="take-editor-controls">
        <EditorSlider
          label="Curve smoothness"
          value={settings.smoothing}
          min={0}
          max={1}
          step={0.01}
          format={value => `${Math.round(value * 100)}%`}
          onChange={smoothing => onSettingsChange({ ...settings, smoothing })}
        />
        <EditorSlider
          label="Detail retention"
          value={settings.detailRetention}
          min={0}
          max={1}
          step={0.01}
          format={value => `${Math.round(value * 100)}%`}
          onChange={detailRetention => onSettingsChange({ ...settings, detailRetention })}
        />
        <EditorSlider
          label="Amplitude"
          value={settings.amplitude}
          min={0}
          max={2}
          step={0.01}
          format={value => `${value.toFixed(2)}×`}
          onChange={amplitude => onSettingsChange({ ...settings, amplitude })}
        />
        <EditorSlider
          label="Speed"
          value={settings.speed}
          min={0.25}
          max={2.5}
          step={0.05}
          format={value => `${value.toFixed(2)}×`}
          onChange={speed => onSettingsChange({ ...settings, speed })}
        />
      </div>

      <div className="take-editor-actions">
        <Button className="take-play-button" onClick={onTogglePlayback}>
          {playing ? <Pause /> : <Play />}
          {playing ? 'Pause preview' : 'Preview take'}
        </Button>
        <Button variant="outline" onClick={onRetake}>
          <RotateCcw /> Retake
        </Button>
        <span>
          <Video /> Offline curve processing
        </span>
      </div>
    </div>
  )
}
