import { ArrowLeft, Eye, Sparkles } from 'lucide-react'
import {
  animate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  type AnimationPlaybackControls,
} from 'motion/react'
import {
  StrictMode,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createRoot } from 'react-dom/client'

import { interpolateHexColor, poseWithAvatarEyes, resolveColors } from '@/app/studio-utils'
import { resolveAvatarBehavior } from '@/features/avatar/avatars'
import {
  interpolatePose,
  poseFromExpression,
  renderAvatar,
  rotateExpressionWithArcball,
  type AvatarPose,
} from '@/features/avatar/geometry'
import {
  advanceLegacyGrokSpring,
  comparisonBlinkDelay,
  interpolateLegacyGrokExpression,
  legacyGrokSpringIsSettled,
} from '@/features/comparison/comparisonTransition'
import {
  LEGACY_GROK_BODY_PATH,
  legacyGrokExpressions,
  legacyGrokPath,
  type LegacyGrokExpression,
} from '@/features/comparison/legacyGrok'
import { loadStudioDocument } from '@/features/studio/studioDocument'

import './grokComparison.css'

const legacyRingCentroid = (ring: LegacyGrokExpression[number]) => {
  const total = ring.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]] as const, [
    0, 0,
  ] as const)
  return [total[0] / ring.length, total[1] / ring.length] as const
}

function LegacyGrok({
  expression,
  index,
  blinkAmount,
}: {
  expression: LegacyGrokExpression
  index: number
  blinkAmount: number
}) {
  return (
    <svg
      className="comparison-avatar legacy-avatar"
      viewBox="-25.87 -25.91 280.28 280.28"
      role="img"
    >
      <title>Official Grok Bot, expression {index}</title>
      <defs>
        <clipPath id="legacy-comparison-head-clip">
          <path d={LEGACY_GROK_BODY_PATH} />
        </clipPath>
      </defs>
      <g>
        <path className="legacy-body" d={LEGACY_GROK_BODY_PATH} />
        <g clipPath="url(#legacy-comparison-head-clip)">
          {expression.map((ring, eyeIndex) => {
            const center = legacyRingCentroid(ring)
            return (
              <path
                className="legacy-eye"
                d={legacyGrokPath(ring)}
                transform={`translate(${center[0]} ${center[1]}) scale(1 ${blinkAmount}) translate(${-center[0]} ${-center[1]})`}
                key={eyeIndex}
              />
            )
          })}
        </g>
      </g>
    </svg>
  )
}

function GrokComparisonApp() {
  const [studioDocument] = useState(() => loadStudioDocument())
  const [selectedExpression, setSelectedExpression] = useState(0)
  const [blinkAmount, setBlinkAmount] = useState(1)
  const blinkValue = useMotionValue(1)
  const rotationProgress = useMotionValue(0)
  useMotionValueEvent(blinkValue, 'change', setBlinkAmount)
  const reduceMotion = useReducedMotion()
  const grokAvatar = studioDocument.library.avatars.find(
    avatar => avatar.name.trim().toLowerCase() === 'grok bot'
  )

  if (!grokAvatar) {
    return (
      <main className="comparison-error">
        <strong>Grok Bot could not be found.</strong>
        <a href="../">Return to Avatar Lab</a>
      </main>
    )
  }

  const behavior = resolveAvatarBehavior(grokAvatar, {
    expressions: studioDocument.expressions,
    sequences: studioDocument.sequences,
  })
  const expressionCount = Math.min(behavior.expressions.length, legacyGrokExpressions.length)
  const activeIndex = Math.min(selectedExpression, expressionCount - 1)
  const [displayedPose, setDisplayedPose] = useState<AvatarPose>(() =>
    poseWithAvatarEyes(behavior.expressions[0], grokAvatar.eyes)
  )
  const [displayedLegacyExpression, setDisplayedLegacyExpression] = useState<LegacyGrokExpression>(
    () => legacyGrokExpressions[0]
  )
  const displayedPoseRef = useRef(displayedPose)
  const displayedLegacyRef = useRef(displayedLegacyExpression)
  const comparisonFrame = useRef<number | null>(null)
  const blinkAnimation = useRef<AnimationPlaybackControls | null>(null)
  const rotationAnimation = useRef<AnimationPlaybackControls | null>(null)
  const rotationDrag = useRef<{
    startPoint: readonly [number, number]
    pose: AvatarPose
  } | null>(null)
  const expression = displayedPose.expression
  const geometry = renderAvatar(displayedPose, grokAvatar.body.primary, blinkAmount, {
    includeWire: false,
    bodyNodes: grokAvatar.body.nodes,
  })
  const colors = resolveColors(expression, grokAvatar.colors)

  useEffect(
    () => () => {
      if (comparisonFrame.current !== null) cancelAnimationFrame(comparisonFrame.current)
      blinkAnimation.current?.stop()
      rotationAnimation.current?.stop()
    },
    []
  )

  const toAvatarPoint = (event: ReactPointerEvent<SVGPathElement>): readonly [number, number] => {
    const rectangle = event.currentTarget.ownerSVGElement!.getBoundingClientRect()
    return [
      ((event.clientX - rectangle.left) / rectangle.width) * 300 - 150,
      ((event.clientY - rectangle.top) / rectangle.height) * 300 - 150,
    ]
  }

  const animateDisplayedRotation = (target: AvatarPose, duration: number) => {
    rotationAnimation.current?.stop()
    const from = displayedPoseRef.current
    if (reduceMotion) {
      displayedPoseRef.current = target
      setDisplayedPose(target)
      return
    }
    rotationProgress.jump(0)
    rotationAnimation.current = animate(rotationProgress, 1, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: progress => {
        const pose = interpolatePose(from, target, progress)
        displayedPoseRef.current = pose
        setDisplayedPose(pose)
      },
      onComplete: () => {
        displayedPoseRef.current = target
        setDisplayedPose(target)
      },
    })
  }

  const startRotation = (event: ReactPointerEvent<SVGPathElement>) => {
    event.preventDefault()
    if (comparisonFrame.current !== null) {
      cancelAnimationFrame(comparisonFrame.current)
      comparisonFrame.current = null
    }
    rotationAnimation.current?.stop()
    rotationDrag.current = {
      startPoint: toAvatarPoint(event),
      pose: displayedPoseRef.current,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveRotation = (event: ReactPointerEvent<SVGPathElement>) => {
    if (!rotationDrag.current) return
    const rotated = rotateExpressionWithArcball(
      rotationDrag.current.pose.expression,
      rotationDrag.current.startPoint,
      toAvatarPoint(event)
    )
    animateDisplayedRotation(poseFromExpression(rotated), 0.1)
  }

  const finishRotation = () => {
    if (!rotationDrag.current) return
    rotationDrag.current = null
    animateDisplayedRotation(
      poseWithAvatarEyes(behavior.expressions[activeIndex], grokAvatar.eyes),
      0.48
    )
  }

  const blink = () => {
    blinkAnimation.current?.stop()
    blinkValue.jump(1)
    blinkAnimation.current = animate(blinkValue, [1, 0.04, 1], {
      duration: 0.32,
      times: [0, 0.42, 1],
      ease: ['easeIn', 'easeOut'],
      onUpdate: setBlinkAmount,
    })
  }

  useEffect(() => {
    let timer: number | null = null
    let active = true
    const scheduleBlink = () => {
      timer = window.setTimeout(() => {
        if (!active) return
        blink()
        scheduleBlink()
      }, comparisonBlinkDelay())
    }
    scheduleBlink()
    return () => {
      active = false
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [])

  const selectExpression = (index: number) => {
    if (index === activeIndex) return
    const nextPose = poseWithAvatarEyes(behavior.expressions[index], grokAvatar.eyes)
    const nextLegacyExpression = legacyGrokExpressions[index]
    setSelectedExpression(index)

    if (comparisonFrame.current !== null) cancelAnimationFrame(comparisonFrame.current)
    rotationDrag.current = null
    rotationAnimation.current?.stop()

    if (reduceMotion) {
      displayedPoseRef.current = nextPose
      displayedLegacyRef.current = nextLegacyExpression
      setDisplayedPose(nextPose)
      setDisplayedLegacyExpression(nextLegacyExpression)
      return
    }

    const fromPose = displayedPoseRef.current
    const fromColors = resolveColors(fromPose.expression, grokAvatar.colors)
    const targetColors = resolveColors(nextPose.expression, grokAvatar.colors)
    const fromLegacyExpression = displayedLegacyRef.current
    let spring = { morph: 0, velocity: 0 }
    let previousTime = performance.now()
    const tickComparison = (time: number) => {
      spring = advanceLegacyGrokSpring(spring, (time - previousTime) / 1000)
      previousTime = time
      const progress = Math.max(0, Math.min(1, spring.morph))
      const pose = interpolatePose(fromPose, nextPose, progress)
      pose.expression.bodyColor = interpolateHexColor(fromColors.body, targetColors.body, progress)
      pose.expression.eyeColor = interpolateHexColor(fromColors.eyes, targetColors.eyes, progress)
      const legacyExpression = interpolateLegacyGrokExpression(
        fromLegacyExpression,
        nextLegacyExpression,
        progress
      )
      displayedPoseRef.current = pose
      displayedLegacyRef.current = legacyExpression
      setDisplayedPose(pose)
      setDisplayedLegacyExpression(legacyExpression)
      if (!legacyGrokSpringIsSettled(spring)) {
        comparisonFrame.current = requestAnimationFrame(tickComparison)
        return
      }
      comparisonFrame.current = null
      displayedPoseRef.current = nextPose
      displayedLegacyRef.current = nextLegacyExpression
      setDisplayedPose(nextPose)
      setDisplayedLegacyExpression(nextLegacyExpression)
    }
    comparisonFrame.current = requestAnimationFrame(tickComparison)
  }

  return (
    <main className="comparison-page">
      <header className="comparison-header">
        <a className="comparison-back" href="../">
          <ArrowLeft aria-hidden="true" />
          Avatar Lab
        </a>
        <div className="comparison-header-actions">
          <div className="comparison-signal">
            <Sparkles aria-hidden="true" />
            Expression {String(activeIndex).padStart(2, '0')}
          </div>
        </div>
      </header>

      <section className="comparison-stage" aria-label="Comparison of both Grok Bots">
        <article className="comparison-card remastered-card">
          <div className="comparison-card-heading">
            <div>
              <h2>Procedural 3D engine</h2>
              <p>
                Each expression interpolates a three-dimensional pose. The engine rebuilds and
                projects the body and eyes as SVG on every frame.
              </p>
            </div>
          </div>
          <div className="comparison-avatar-frame">
            <svg className="comparison-avatar" viewBox="-150 -150 300 300" role="img">
              <title>Grok Bot remastered, expression {activeIndex}</title>
              <defs>
                <clipPath id="remastered-comparison-head-clip">
                  <path d={geometry.headPath} />
                </clipPath>
              </defs>
              <g>
                {geometry.backPaths.map((path, index) => (
                  <path d={path} fill={colors.body} key={`back-${index}`} />
                ))}
                <path d={geometry.headPath} fill={colors.body} />
                <g clipPath="url(#remastered-comparison-head-clip)" fill={colors.eyes}>
                  {geometry.leftVisible && <path d={geometry.leftPath} />}
                  {geometry.rightVisible && <path d={geometry.rightPath} />}
                </g>
                {geometry.frontPaths.map((path, index) => (
                  <path d={path} fill={colors.body} key={`front-${index}`} />
                ))}
                <path
                  className="comparison-rotation-hitarea"
                  d={geometry.headPath}
                  onPointerDown={startRotation}
                  onPointerMove={moveRotation}
                  onPointerUp={finishRotation}
                  onPointerCancel={finishRotation}
                />
              </g>
            </svg>
          </div>
        </article>

        <div className="comparison-versus" aria-hidden="true">
          VS
        </div>

        <article className="comparison-card legacy-card">
          <div className="comparison-card-heading">
            <div>
              <h2>SVG morphing</h2>
              <p>
                Each transition morphs the 48 eye points between 25 fixed expressions. The body
                remains a single, unchanged SVG path.
              </p>
            </div>
          </div>
          <div className="comparison-avatar-frame">
            <LegacyGrok
              expression={displayedLegacyExpression}
              index={activeIndex}
              blinkAmount={blinkAmount}
            />
          </div>
        </article>
      </section>

      <section className="comparison-expression-panel" aria-label="Official expressions">
        <div className="comparison-expression-actions">
          <button className="comparison-blink-button" type="button" onClick={blink}>
            <Eye aria-hidden="true" />
            Blink
          </button>
        </div>
        <div className="comparison-expression-grid">
          {legacyGrokExpressions.slice(0, expressionCount).map((legacyExpression, index) => (
            <button
              className="comparison-expression-button"
              type="button"
              aria-label={`Expression ${index}`}
              aria-pressed={index === activeIndex}
              onClick={() => selectExpression(index)}
              key={index}
            >
              <svg viewBox="0 0 229 229" aria-hidden="true">
                {legacyExpression.map((ring, eyeIndex) => (
                  <path d={legacyGrokPath(ring)} key={eyeIndex} />
                ))}
              </svg>
              <span>{String(index).padStart(2, '0')}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GrokComparisonApp />
  </StrictMode>
)
