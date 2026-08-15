import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

import { captureFrameFromMediaPipe } from './facialCapture'

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

type WorkerRequest =
  { type: 'initialize' } | { type: 'frame'; image: ImageBitmap; timestamp: number }

let landmarker: FaceLandmarker | null = null

const initialize = async () => {
  if (landmarker) return
  // Module workers cannot expose the classic loader's local ModuleFactory.
  // The module build publishes it on globalThis for MediaPipe's task runner.
  const vision = await FilesetResolver.forVisionTasks(WASM_ROOT, true)
  landmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL },
    runningMode: 'VIDEO',
    numFaces: 1,
    minFaceDetectionConfidence: 0.55,
    minFacePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  })
}

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  try {
    if (event.data.type === 'initialize') {
      await initialize()
      self.postMessage({ type: 'ready' })
      return
    }
    const { image, timestamp } = event.data
    try {
      if (!landmarker) await initialize()
      const result = landmarker!.detectForVideo(image, timestamp)
      const classification = result.faceBlendshapes[0]
      const matrix = result.facialTransformationMatrixes[0]
      if (!classification || !matrix) {
        self.postMessage({ type: 'missing', timestamp })
        return
      }
      const scores = Object.fromEntries(
        classification.categories.map(category => [category.categoryName, category.score])
      )
      self.postMessage({
        type: 'capture',
        frame: captureFrameFromMediaPipe(scores, matrix.data, timestamp),
      })
    } finally {
      image.close()
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Face tracking failed.',
    })
  }
})
