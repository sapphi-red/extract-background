import React, {
  FC,
  useState,
  useReducer,
  Reducer,
  Dispatch,
  useRef
} from 'react'
import './App.sass'
import InputVideo from './InputVideo'

import BodyPixWorkerAbstract, {
  BodyPixWorker,
  Config
} from '../worker/BodyPix.worker'
import { wrap, transfer } from 'comlink'

interface Progress {
  value: number
}
type ProgressAction = IncrementAction | ResetAction
interface IncrementAction {
  type: 'increment'
}
interface ResetAction {
  type: 'reset'
}

const progressReducer: Reducer<Progress, ProgressAction> = (state, action) => {
  switch (action.type) {
    case 'increment':
      return { value: state.value + 1 }
    case 'reset':
      return { value: 0 }
  }
}

const recreateFileUrl = (
  setFileUrl: Dispatch<string>,
  file: File | null,
  prevFileUrl: string
) => {
  if (prevFileUrl !== '') {
    URL.revokeObjectURL(prevFileUrl)
  }
  setFileUrl(file ? URL.createObjectURL(file) : '')
}

const getBodyPix = async (config: Config, outputCanvas: OffscreenCanvas) => {
  const WrappedBodyPix = wrap<typeof BodyPixWorker>(new BodyPixWorkerAbstract())
  const bodyPix = await new WrappedBodyPix()
  await bodyPix.init(
    config,
    transfer(outputCanvas, [(outputCanvas as unknown) as Transferable])
  )
  return bodyPix
}

const exec = async (
  $video: HTMLVideoElement,
  $output: HTMLCanvasElement,
  progress: () => void
) => {
  if ($video.readyState < 3) {
    await new Promise(resolve => {
      $video.oncanplay = resolve
    })
  }
  const imgb = await createImageBitmap($video)
  const { width, height } = imgb
  $output.width = width
  $output.height = height
  console.log(width, height)

  const { duration } = $video
  $video.currentTime = 0

  const output = $output.transferControlToOffscreen()

  const bodyPix = await getBodyPix(
    {
      width,
      height
    },
    output
  )

  while ($video.currentTime < duration) {
    if ($video.readyState < 3) {
      await new Promise(resolve => {
        $video.oncanplay = resolve
      })
    }
    try {
      const imageb = await createImageBitmap($video)
      console.log(imageb)
      await bodyPix.apply(transfer(imageb, [imageb]))
    } catch (e) {
      console.warn(e)
    }
    progress()
    $video.currentTime += 1
  }
}

const App: FC = () => {
  const [fileUrl, setFileUrl] = useState('')
  const [progress, dispatchProgress] = useReducer(progressReducer, { value: 0 })

  const $video = useRef<HTMLVideoElement>(null)
  const $output = useRef<HTMLCanvasElement>(null)

  return (
    <div id="App">
      <InputVideo
        disabled={progress.value > 0}
        onChange={file => {
          recreateFileUrl(setFileUrl, file, fileUrl)
        }}
      />
      <button
        disabled={fileUrl === ''}
        onClick={async () => {
          if ($video.current && $output.current) {
            await exec($video.current, $output.current, () => {
              dispatchProgress({ type: 'increment' })
            })
            dispatchProgress({ type: 'reset' })
          }
        }}
      >
        開始
      </button>
      {progress.value}
      {fileUrl !== '' && (
        <video
          src={fileUrl}
          controls
          ref={$video}
          style={{ display: 'none' }}
        />
      )}
      <canvas ref={$output} style={{ maxWidth: '100%' }} />
    </div>
  )
}

export default App
