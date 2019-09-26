import React, { FC, useRef } from 'react'
import './App.sass'
import InputVideo from './InputVideo'
import StateContainer from '../container/StateContainer'

import BodyPixWorkerAbstract, {
  BodyPixWorker,
  Config
} from '../worker/BodyPix.worker'
import { wrap, transfer } from 'comlink'

const THESHOLDS = [0.05, 0.1, 0.2, 0.3, 0.5, 0.8, 1.0]

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
  const output = $output.transferControlToOffscreen()

  const bodyPix = await getBodyPix(
    {
      width,
      height
    },
    output
  )

  for (const theshold of THESHOLDS) {
    console.log(`start THESHOLD: ${theshold}`)
    $video.currentTime = 0
    while ($video.currentTime < duration) {
      if ($video.readyState < 3) {
        await new Promise(resolve => {
          $video.oncanplay = resolve
        })
      }
      try {
        const imageb = await createImageBitmap($video)
        console.log($video.currentTime)
        const completed = await bodyPix.apply(
          transfer(imageb, [imageb]),
          theshold
        )
        if (completed) return
      } catch (e) {
        console.warn(e)
      }
      progress()
      $video.currentTime += 1
    }
  }
}

const App: FC = () => {
  const state = StateContainer.useContainer()

  const $video = useRef<HTMLVideoElement>(null)
  const $output = useRef<HTMLCanvasElement>(null)

  return (
    <div id="App">
      <p>
        動画から人物(一人に限る)を取り除いた背景を抽出します。
        定点からの映像でしか正常に動作しません。
        また、Chromeでしか動作しません。
      </p>
      <InputVideo />
      <button
        disabled={state.fileUrl === ''}
        onClick={async () => {
          if ($video.current && $output.current) {
            await exec($video.current, $output.current, () => {
              state.incrementProgress()
            })
            state.resetProgress()
          }
        }}
      >
        開始
      </button>
      {state.progress.value}
      <video id="input" src={state.fileUrl} controls ref={$video} />
      <canvas id="output" ref={$output} />
    </div>
  )
}

export default App
