import { Analytics } from '@vercel/analytics/react'
import {
  Activity,
  ArrowLeft,
  Camera,
  CameraOff,
  Circle,
  Crosshair,
  RefreshCw,
  ShieldCheck,
  Square,
} from 'lucide-react'
import { motion, useMotionValue } from 'motion/react'
import { StrictMode, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'

import { poseWithAvatarEyes, resolveColors } from '@/app/studio-utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { resolveAvatarBehavior } from '@/features/avatar/avatars'
import { clamp, poseFromExpression, renderAvatar } from '@/features/avatar/geometry'
import {
  createFacialCaptureSmoother,
  mirrorCaptureFrame,
  observeExpression,
  retargetCaptureFrame,
  type ObservedExpression,
  type FacialCaptureFrame,
} from '@/features/capture/facialCapture'
import { MotionTakeEditor } from '@/features/capture/MotionTakeEditor'
import {
  defaultMotionTakeSettings,
  processMotionTake,
  sampleMotionTake,
  type MotionSample,
  type MotionTake,
  type MotionTakeSettings,
} from '@/features/capture/motionTake'
import {
  createRenderedScene,
  paintRenderedOffset,
  paintRenderedScene,
} from '@/features/rendering/renderedScene'
import { loadStudioDocument } from '@/features/studio/studioDocument'

import './captureLab.css'

type CaptureStatus = 'idle' | 'loading' | 'tracking' | 'lost' | 'error'
type CaptureWorkerMessage =
  | { type: 'ready' }
  | { type: 'capture'; frame: FacialCaptureFrame }
  | { type: 'missing'; timestamp: number }
  | { type: 'error'; message: string }

type Telemetry = {
  pitch: number
  yaw: number
  roll: number
  positionX: number
  positionY: number
  positionZ: number
  blinkLeft: number
  blinkRight: number
  lookX: number
  lookY: number
  jawOpen: number
  fps: number
}

const emptyObservedExpression: ObservedExpression = {
  id: 'neutral',
  label: 'Waiting for a face',
  confidence: 0,
  scores: { smile: 0, laugh: 0, angry: 0, surprised: 0, sad: 0 },
}

const defaultSmoothing = 58

const emptyTelemetry: Telemetry = {
  pitch: 0,
  yaw: 0,
  roll: 0,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  blinkLeft: 0,
  blinkRight: 0,
  lookX: 0,
  lookY: 0,
  jawOpen: 0,
  fps: 0,
}

function Signal({
  label,
  value,
  signed = false,
}: {
  label: string
  value: number
  signed?: boolean
}) {
  const normalized = signed ? (value + 1) / 2 : value
  return (
    <div className="capture-signal">
      <div className="capture-signal-label">
        <span>{label}</span>
        <output>{signed ? value.toFixed(2) : `${Math.round(value * 100)}%`}</output>
      </div>
      <div className={`capture-signal-track ${signed ? 'is-signed' : ''}`}>
        {signed && <span className="capture-signal-zero" />}
        <motion.span
          className="capture-signal-fill"
          animate={{ scaleX: Math.max(0.015, normalized) }}
          transition={{ type: 'spring', stiffness: 340, damping: 38, mass: 0.5 }}
        />
      </div>
    </div>
  )
}

function CaptureLabApp() {
  const [studioDocument] = useState(() => loadStudioDocument())
  const activeAvatar =
    studioDocument.library.avatars.find(
      avatar => avatar.id === studioDocument.library.activeAvatarId
    ) ?? studioDocument.library.avatars[0]
  const behavior = resolveAvatarBehavior(activeAvatar, {
    expressions: studioDocument.expressions,
    sequences: studioDocument.sequences,
  })
  const baseExpression = poseWithAvatarEyes(behavior.expressions[0], activeAvatar.eyes).expression
  const captureExpression = {
    ...baseExpression,
    headX: 0,
    headY: 0,
    headZ: 0,
  }
  const initialGeometry = renderAvatar(
    poseFromExpression(baseExpression),
    activeAvatar.body.primary,
    1,
    { includeWire: false, bodyNodes: activeAvatar.body.nodes }
  )
  const captureGeometry = renderAvatar(
    poseFromExpression(captureExpression),
    activeAvatar.body.primary,
    1,
    { includeWire: false, bodyNodes: activeAvatar.body.nodes }
  )
  const [scene] = useState(() => createRenderedScene(initialGeometry))
  const captureScale = useMotionValue(1)
  const [status, setStatus] = useState<CaptureStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [telemetry, setTelemetry] = useState<Telemetry>(emptyTelemetry)
  const [observedExpression, setObservedExpression] = useState(emptyObservedExpression)
  const [calibrated, setCalibrated] = useState(false)
  const [smoothing, setSmoothing] = useState(defaultSmoothing)
  const [recording, setRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [take, setTake] = useState<MotionTake | null>(null)
  const [processedTake, setProcessedTake] = useState<MotionTake | null>(null)
  const [takeSettings, setTakeSettings] = useState<MotionTakeSettings>(defaultMotionTakeSettings)
  const [playhead, setPlayhead] = useState(0)
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const frameRequestRef = useRef<number | null>(null)
  const workerReadyRef = useRef(false)
  const cameraReadyRef = useRef(false)
  const processingRef = useRef(false)
  const lastVideoTimeRef = useRef(-1)
  const neutralRef = useRef<FacialCaptureFrame | null>(null)
  const latestFrameRef = useRef<FacialCaptureFrame | null>(null)
  const lastTelemetryAtRef = useRef(0)
  const lastCaptureAtRef = useRef(0)
  const smootherRef = useRef(createFacialCaptureSmoother(defaultSmoothing / 100))
  const recordingRef = useRef(false)
  const recordingStartedAtRef = useRef<number | null>(null)
  const recordingSamplesRef = useRef<MotionSample[]>([])
  const lastRecordingUiAtRef = useRef(0)
  const playbackFrameRef = useRef<number | null>(null)
  const processedTakeRef = useRef<MotionTake | null>(null)
  const lastPlaybackUiAtRef = useRef(0)
  const colors = resolveColors(baseExpression, activeAvatar.colors)

  const resetAvatar = () => {
    paintRenderedScene(scene, initialGeometry)
    paintRenderedOffset(scene, { x: 0, y: 0 })
    captureScale.set(1)
    setTelemetry(emptyTelemetry)
    setObservedExpression(emptyObservedExpression)
  }

  const paintMotionSample = (sample: MotionSample) => {
    const expression = {
      ...captureExpression,
      headX: captureExpression.headX + sample.pitch,
      headY: captureExpression.headY + sample.yaw,
      headZ: captureExpression.headZ + sample.roll,
      positionXLeft: captureExpression.positionXLeft + sample.lookX * 7.5,
      positionXRight: captureExpression.positionXRight + sample.lookX * 7.5,
      positionYLeft: captureExpression.positionYLeft - sample.lookY * 6,
      positionYRight: captureExpression.positionYRight - sample.lookY * 6,
    }
    paintRenderedScene(
      scene,
      renderAvatar(poseFromExpression(expression), activeAvatar.body.primary, 1 - sample.blink, {
        includeWire: false,
        bodyNodes: activeAvatar.body.nodes,
      })
    )
    paintRenderedOffset(scene, { x: sample.positionX, y: sample.positionY })
    captureScale.set(clamp(1 + sample.positionZ, 0.62, 1.52))
  }

  const paintCapture = (captured: FacialCaptureFrame) => {
    const mirrored = mirrorCaptureFrame(captured)
    const frame = smootherRef.current.next(mirrored)
    latestFrameRef.current = frame
    if (!neutralRef.current) {
      neutralRef.current = frame
      setCalibrated(true)
    }
    const neutral = neutralRef.current
    const retargeted = retargetCaptureFrame(frame, neutral, captureExpression)
    if (recordingRef.current) {
      const raw = retargetCaptureFrame(mirrored, neutral, captureExpression)
      const startedAt = recordingStartedAtRef.current ?? mirrored.timestamp
      recordingStartedAtRef.current = startedAt
      const time = mirrored.timestamp - startedAt
      recordingSamplesRef.current.push({
        time,
        pitch: raw.expression.headX - captureExpression.headX,
        yaw: raw.expression.headY - captureExpression.headY,
        roll: raw.expression.headZ - captureExpression.headZ,
        positionX: raw.signals.positionX,
        positionY: raw.signals.positionY,
        positionZ: raw.signals.positionZ,
        lookX: raw.signals.lookX,
        lookY: raw.signals.lookY,
        blink: 1 - raw.blinkAmount,
      })
      if (mirrored.timestamp - lastRecordingUiAtRef.current >= 90) {
        lastRecordingUiAtRef.current = mirrored.timestamp
        setRecordingDuration(time)
      }
    }
    paintRenderedScene(
      scene,
      renderAvatar(
        poseFromExpression(retargeted.expression),
        activeAvatar.body.primary,
        retargeted.blinkAmount,
        { includeWire: false, bodyNodes: activeAvatar.body.nodes }
      )
    )
    paintRenderedOffset(scene, {
      x: retargeted.signals.positionX,
      y: retargeted.signals.positionY,
    })
    captureScale.set(clamp(1 + retargeted.signals.positionZ, 0.62, 1.52))
    if (frame.timestamp - lastTelemetryAtRef.current >= 90) {
      const elapsed = frame.timestamp - lastCaptureAtRef.current
      const fps = elapsed > 0 ? 1000 / elapsed : 0
      lastTelemetryAtRef.current = frame.timestamp
      setTelemetry({
        pitch: frame.head.pitch - neutral.head.pitch,
        yaw: frame.head.yaw - neutral.head.yaw,
        roll: frame.head.roll - neutral.head.roll,
        positionX: retargeted.signals.positionX,
        positionY: retargeted.signals.positionY,
        positionZ: retargeted.signals.positionZ,
        blinkLeft: retargeted.signals.blinkLeft,
        blinkRight: retargeted.signals.blinkRight,
        lookX: retargeted.signals.lookX,
        lookY: retargeted.signals.lookY,
        jawOpen: frame.mouth.jawOpen,
        fps,
      })
      setObservedExpression(observeExpression(frame))
    }
    lastCaptureAtRef.current = frame.timestamp
  }

  const stopFrameLoop = () => {
    if (frameRequestRef.current !== null) cancelAnimationFrame(frameRequestRef.current)
    frameRequestRef.current = null
    processingRef.current = false
    lastVideoTimeRef.current = -1
  }

  const stopCameraStream = () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    cameraReadyRef.current = false
  }

  const frameLoop = () => {
    const video = videoRef.current
    const worker = workerRef.current
    if (
      video &&
      worker &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      !processingRef.current &&
      video.currentTime !== lastVideoTimeRef.current
    ) {
      processingRef.current = true
      lastVideoTimeRef.current = video.currentTime
      createImageBitmap(video)
        .then(image => {
          worker.postMessage({ type: 'frame', image, timestamp: performance.now() }, [image])
        })
        .catch(error => {
          processingRef.current = false
          setStatus('error')
          setErrorMessage(error instanceof Error ? error.message : 'Unable to read the camera.')
        })
    }
    frameRequestRef.current = requestAnimationFrame(frameLoop)
  }

  const startFrameLoop = () => {
    if (frameRequestRef.current !== null || !workerReadyRef.current || !cameraReadyRef.current)
      return
    frameRequestRef.current = requestAnimationFrame(frameLoop)
  }

  const ensureWorker = () => {
    if (workerRef.current) return
    const worker = new Worker(new URL('./faceLandmarker.worker.ts', import.meta.url), {
      type: 'module',
    })
    workerRef.current = worker
    worker.addEventListener('message', (event: MessageEvent<CaptureWorkerMessage>) => {
      if (event.data.type === 'ready') {
        workerReadyRef.current = true
        startFrameLoop()
        return
      }
      processingRef.current = false
      if (event.data.type === 'capture') {
        setStatus('tracking')
        paintCapture(event.data.frame)
      } else if (event.data.type === 'missing') {
        setStatus('lost')
      } else {
        setStatus('error')
        setErrorMessage(event.data.message)
        stopFrameLoop()
        stopCameraStream()
      }
    })
    worker.postMessage({ type: 'initialize' })
  }

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setErrorMessage('Camera access is not supported in this browser.')
      return
    }
    setStatus('loading')
    setErrorMessage('')
    setTake(null)
    setProcessedTake(null)
    setPlayhead(0)
    neutralRef.current = null
    latestFrameRef.current = null
    smootherRef.current.reset()
    setCalibrated(false)
    setTelemetry(emptyTelemetry)
    paintRenderedScene(scene, captureGeometry)
    paintRenderedOffset(scene, { x: 0, y: 0 })
    captureScale.set(1)
    ensureWorker()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()
      cameraReadyRef.current = true
      startFrameLoop()
    } catch (error) {
      stopFrameLoop()
      stopCameraStream()
      setStatus('error')
      setErrorMessage(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Camera permission was declined. You can allow it from the browser address bar.'
          : error instanceof Error
            ? error.message
            : 'Unable to start the camera.'
      )
    }
  }

  const stopCamera = () => {
    stopFrameLoop()
    stopCameraStream()
    neutralRef.current = null
    latestFrameRef.current = null
    smootherRef.current.reset()
    setCalibrated(false)
    setStatus('idle')
    recordingRef.current = false
    setRecording(false)
    resetAvatar()
  }

  const calibrate = () => {
    if (!latestFrameRef.current) return
    neutralRef.current = latestFrameRef.current
    setCalibrated(true)
  }

  const updateSmoothing = (nextSmoothing: number) => {
    setSmoothing(nextSmoothing)
    smootherRef.current.setSmoothing(nextSmoothing / 100)
  }

  const stopPlayback = () => {
    if (playbackFrameRef.current !== null) cancelAnimationFrame(playbackFrameRef.current)
    playbackFrameRef.current = null
    setPlaying(false)
  }

  const seekTake = (time: number) => {
    stopPlayback()
    const processed = processedTakeRef.current
    if (!processed) return
    const bounded = Math.max(0, Math.min(processed.duration, time))
    setPlayhead(bounded)
    const sample = sampleMotionTake(processed, bounded)
    if (sample) paintMotionSample(sample)
  }

  const togglePlayback = () => {
    if (playing) {
      stopPlayback()
      return
    }
    const processed = processedTakeRef.current
    if (!processed) return
    const initialTime = playhead >= processed.duration ? 0 : playhead
    const startedAt = performance.now() - initialTime
    setPlaying(true)
    const tick = (now: number) => {
      const current = Math.min(processed.duration, now - startedAt)
      const sample = sampleMotionTake(processed, current)
      if (sample) paintMotionSample(sample)
      if (now - lastPlaybackUiAtRef.current >= 45 || current >= processed.duration) {
        lastPlaybackUiAtRef.current = now
        setPlayhead(current)
      }
      if (current >= processed.duration) {
        playbackFrameRef.current = null
        setPlaying(false)
        return
      }
      playbackFrameRef.current = requestAnimationFrame(tick)
    }
    playbackFrameRef.current = requestAnimationFrame(tick)
  }

  const beginRecording = () => {
    if (status !== 'tracking' || !neutralRef.current) return
    stopPlayback()
    recordingSamplesRef.current = []
    recordingStartedAtRef.current = null
    lastRecordingUiAtRef.current = 0
    recordingRef.current = true
    setRecordingDuration(0)
    setRecording(true)
  }

  const finishRecording = () => {
    recordingRef.current = false
    setRecording(false)
    const samples = recordingSamplesRef.current
    if (samples.length < 2) return
    const recordedTake = { duration: samples.at(-1)?.time ?? 0, samples: [...samples] }
    const processed = processMotionTake(recordedTake, takeSettings)
    processedTakeRef.current = processed
    setTake(recordedTake)
    setProcessedTake(processed)
    setPlayhead(0)
    stopFrameLoop()
    stopCameraStream()
    setStatus('idle')
    const first = sampleMotionTake(processed, 0)
    if (first) paintMotionSample(first)
  }

  const updateTakeSettings = (settings: MotionTakeSettings) => {
    setTakeSettings(settings)
    if (!take) return
    const processed = processMotionTake(take, settings)
    processedTakeRef.current = processed
    setProcessedTake(processed)
    const nextPlayhead = Math.min(playhead, processed.duration)
    setPlayhead(nextPlayhead)
    const sample = sampleMotionTake(processed, nextPlayhead)
    if (sample) paintMotionSample(sample)
  }

  const retake = () => {
    stopPlayback()
    setTake(null)
    setProcessedTake(null)
    processedTakeRef.current = null
    setPlayhead(0)
    requestAnimationFrame(() => void startCamera())
  }

  useEffect(
    () => () => {
      stopFrameLoop()
      if (playbackFrameRef.current !== null) cancelAnimationFrame(playbackFrameRef.current)
      streamRef.current?.getTracks().forEach(track => track.stop())
      workerRef.current?.terminate()
    },
    []
  )

  const statusLabel = {
    idle: 'Camera off',
    loading: 'Loading tracker',
    tracking: 'Face locked',
    lost: 'Find your face',
    error: 'Tracker unavailable',
  }[status]
  const isCameraActive = status === 'tracking' || status === 'lost' || status === 'loading'

  return (
    <main
      className="capture-lab"
      style={
        {
          '--capture-body': colors.body,
          '--capture-eyes': colors.eyes,
        } as CSSProperties
      }
    >
      <header className="capture-header">
        <a className="capture-back" href="../">
          <ArrowLeft />
          Avatar Lab
        </a>
        <div className="capture-title-lockup">
          <span>Experimental instrument · 01</span>
          <h1>Performance Capture</h1>
        </div>
        <Badge className="capture-privacy-badge" variant="outline">
          <ShieldCheck /> Local processing
        </Badge>
      </header>

      <section className="capture-workbench">
        <div className="capture-stage">
          <div className="capture-stage-grid" aria-hidden="true" />
          <div className="capture-avatar-label">
            <span>{take ? 'Refined playback' : 'Live retarget'}</span>
            <strong>{activeAvatar.name}</strong>
          </div>
          <svg className="capture-avatar" viewBox="-150 -150 300 300" role="img">
            <title>{activeAvatar.name} driven by facial capture</title>
            <defs>
              <clipPath id="capture-head-clip">
                <motion.path d={scene.headPath} />
              </clipPath>
            </defs>
            <motion.g
              style={{
                x: scene.offsetX,
                y: scene.offsetY,
                scale: captureScale,
                transformOrigin: '0px 0px',
              }}
            >
              {scene.backPaths.map((path, index) => (
                <motion.path className="capture-avatar-body" d={path} key={`back-${index}`} />
              ))}
              <motion.path className="capture-avatar-body" d={scene.headPath} />
              <g clipPath="url(#capture-head-clip)">
                <motion.path
                  className="capture-avatar-eye"
                  d={scene.leftPath}
                  opacity={scene.leftOpacity}
                />
                <motion.path
                  className="capture-avatar-eye"
                  d={scene.rightPath}
                  opacity={scene.rightOpacity}
                />
              </g>
              {scene.frontPaths.map((path, index) => (
                <motion.path className="capture-avatar-body" d={path} key={`front-${index}`} />
              ))}
            </motion.g>
          </svg>
          <div className={`capture-lock-status is-${take ? 'take' : status}`}>
            <span />
            {take ? 'Take ready' : statusLabel}
          </div>
          <div className={`capture-camera-card ${take ? 'is-hidden' : ''}`}>
            <video ref={videoRef} muted playsInline aria-label="Webcam preview" />
            <div className="capture-camera-reticle" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            {!isCameraActive && (
              <div className="capture-camera-placeholder">
                <Camera />
                <span>Camera preview</span>
              </div>
            )}
            <span className="capture-camera-caption">SOURCE / LOCAL</span>
          </div>
        </div>

        <aside className="capture-console">
          {take && processedTake ? (
            <MotionTakeEditor
              take={take}
              processedTake={processedTake}
              settings={takeSettings}
              playhead={playhead}
              playing={playing}
              onSettingsChange={updateTakeSettings}
              onSeek={seekTake}
              onTogglePlayback={togglePlayback}
              onRetake={retake}
            />
          ) : (
            <>
              <div className="capture-console-heading">
                <div>
                  <span>Signal console</span>
                  <h2>Face → procedural rig</h2>
                </div>
                <Activity className={status === 'tracking' ? 'is-active' : ''} />
              </div>

              <div className="capture-orientation">
                <div>
                  <span>Pitch</span>
                  <strong>{telemetry.pitch.toFixed(1)}°</strong>
                </div>
                <div>
                  <span>Yaw</span>
                  <strong>{telemetry.yaw.toFixed(1)}°</strong>
                </div>
                <div>
                  <span>Roll</span>
                  <strong>{telemetry.roll.toFixed(1)}°</strong>
                </div>
              </div>

              <div className="capture-position">
                <div>
                  <span>Move X</span>
                  <strong>{telemetry.positionX.toFixed(1)}</strong>
                </div>
                <div>
                  <span>Move Y</span>
                  <strong>{telemetry.positionY.toFixed(1)}</strong>
                </div>
                <div>
                  <span>Depth</span>
                  <strong>{telemetry.positionZ.toFixed(2)}</strong>
                </div>
              </div>

              <div className="capture-signal-group">
                <Signal label="Left blink" value={telemetry.blinkLeft} />
                <Signal label="Right blink" value={telemetry.blinkRight} />
                <Signal label="Gaze horizontal" value={telemetry.lookX} signed />
                <Signal label="Gaze vertical" value={telemetry.lookY} signed />
              </div>

              <div className="capture-smoothing-control">
                <div className="capture-smoothing-heading">
                  <label htmlFor="capture-smoothing">Motion smoothing</label>
                  <output htmlFor="capture-smoothing">{smoothing}%</output>
                </div>
                <input
                  id="capture-smoothing"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={smoothing}
                  onChange={event => updateSmoothing(Number(event.currentTarget.value))}
                />
                <div className="capture-smoothing-scale" aria-hidden="true">
                  <span>Responsive</span>
                  <span>Fluid</span>
                </div>
              </div>

              <div className="capture-future-signal">
                <div>
                  <span>Reserved channel</span>
                  <strong>Mouth / jaw</strong>
                </div>
                <output>{Math.round(telemetry.jawOpen * 100)}%</output>
              </div>

              <section className="capture-expression-observer" aria-live="polite">
                <div className="capture-expression-summary">
                  <div>
                    <span>Expression observer</span>
                    <strong>{observedExpression.label}</strong>
                  </div>
                  <output>{Math.round(observedExpression.confidence * 100)}%</output>
                </div>
                <div className="capture-expression-scores">
                  {Object.entries(observedExpression.scores).map(([label, value]) => (
                    <div key={label}>
                      <span>{label === 'laugh' ? 'Laugh-like' : label}</span>
                      <i aria-hidden="true">
                        <motion.b
                          animate={{ scaleX: Math.max(0.01, value) }}
                          transition={{ type: 'spring', stiffness: 280, damping: 34, mass: 0.55 }}
                        />
                      </i>
                      <output>{Math.round(value * 100)}</output>
                    </div>
                  ))}
                </div>
                <p>Visual estimate only. It does not affect the avatar rig.</p>
              </section>

              <div className="capture-calibration-card">
                <Crosshair />
                <div>
                  <strong>
                    {calibrated ? 'Neutral pose calibrated' : 'Neutral pose required'}
                  </strong>
                  <p>Look forward, relax your eyes, then capture a new neutral reference.</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Calibrate neutral pose"
                  disabled={!latestFrameRef.current}
                  onClick={calibrate}
                >
                  <RefreshCw />
                </Button>
              </div>

              {errorMessage && <p className="capture-error-message">{errorMessage}</p>}

              <div className="capture-console-actions">
                {isCameraActive ? (
                  <>
                    <Button
                      className={`capture-record-button ${recording ? 'is-recording' : ''}`}
                      disabled={status !== 'tracking'}
                      onClick={recording ? finishRecording : beginRecording}
                    >
                      {recording ? <Square /> : <Circle />}
                      {recording ? 'Finish take' : 'Record a take'}
                    </Button>
                    <Button className="capture-stop-button" variant="outline" onClick={stopCamera}>
                      <CameraOff /> Stop camera
                    </Button>
                  </>
                ) : (
                  <Button className="capture-start-button" onClick={startCamera}>
                    <Camera /> Start capture
                  </Button>
                )}
                <span>
                  {recording
                    ? `REC ${(recordingDuration / 1000).toFixed(1)}s`
                    : telemetry.fps
                      ? `${Math.round(telemetry.fps)} FPS`
                      : '— FPS'}
                </span>
              </div>

              <p className="capture-privacy-note">
                Frames are analyzed on this device and are never stored or uploaded.
              </p>
            </>
          )}
        </aside>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CaptureLabApp />
    <Analytics />
  </StrictMode>
)
