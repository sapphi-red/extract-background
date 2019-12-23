import React, { FC, useRef } from 'react'
import './App.sass'
import InputVideo from './InputVideo'
import StateContainer from '../container/StateContainer'

import {
  Paper,
  Grid,
  Typography,
  Button,
  CircularProgress,
  LinearProgress
} from '@material-ui/core'
import { KeyboardArrowRight } from '@material-ui/icons'

import ParentWorkerAbstract, {
  ParentWorker,
  Config
} from '../worker/Parent.worker'
import { wrap, transfer, proxy } from 'comlink'
import PositionSetter from './PositionSetter'

const getBodyPix = async (
  config: Config,
  outputCanvas: OffscreenCanvas,
  concurrency: number
) => {
  const WrappedBodyPix = wrap<typeof ParentWorker>(new ParentWorkerAbstract())
  const bodyPix = await new WrappedBodyPix()
  await bodyPix.init(
    config,
    transfer(outputCanvas, [(outputCanvas as unknown) as Transferable]),
    concurrency
  )
  return bodyPix
}

const waitVideoLoad = async ($video: HTMLVideoElement) => {
  if ($video.readyState < 3) {
    await new Promise(resolve => {
      $video.oncanplay = resolve
    })
  }
}

const exec = async (
  $video: HTMLVideoElement,
  $output: HTMLDivElement,
  state: ReturnType<typeof StateContainer.useContainer>
) => {
  const params = new URLSearchParams(window.location.search.slice(1))
  const pTimeFlag = params.get('p_time') === 'true'
  const debugFlag = params.get('debug') === 'true'
  const wasmFlag = params.get('wasm') === 'true'
  const singleThreadFlag = params.get('single') === 'true'

  await waitVideoLoad($video)
  const imgb = await createImageBitmap($video)
  const { width, height } = imgb
  imgb.close()

  $output.innerHTML = ''
  const $canvas = document.createElement('canvas')
  $canvas.width = width
  $canvas.height = height
  $output.appendChild($canvas)
  if (debugFlag) console.log(width, height)

  const { duration } = $video
  const output = $canvas.transferControlToOffscreen()

  const bodyPix = await getBodyPix(
    {
      width,
      height,
      duration,
      debugFlag,
      startPos: state.startPos,
      endPos: state.endPos,
      useWasm: wasmFlag
    },
    output,
    singleThreadFlag ? 1 : Math.max(navigator.hardwareConcurrency - 1, 1)
  )

  let startTime = 0
  if (pTimeFlag) {
    startTime = performance.now()
  }

  return new Promise(resolve => {
    const retryFromStart = () => {
      $video.currentTime = state.startPos
      state.incrementProgressPhase()
    }
    const sendCurrentImage = async () => {
      await waitVideoLoad($video)
      try {
        const img = await createImageBitmap($video)
        return transfer([img, $video.currentTime], [img])
      } catch (e) {
        console.warn(e)
      }
      return null
    }
    const tick = () => {
      $video.currentTime++
    }
    const notifyProgress = (progress: number) => {
      if (progress === -1) {
        if (pTimeFlag) {
          const endTime = performance.now()
          console.info(`Elapsed Time: ${(endTime - startTime) / 1000}s`)
        }
        resolve()
        return
      }
      if (debugFlag) console.log((progress / (width * height)) * 100)
      state.setProgressValue((progress / (width * height)) * 100)
    }

    bodyPix.run(
      proxy(sendCurrentImage),
      proxy(retryFromStart),
      proxy(tick),
      proxy(notifyProgress)
    )
  })
}

const App: FC = () => {
  const state = StateContainer.useContainer()

  const $video = useRef<HTMLVideoElement>(null)
  const $output = useRef<HTMLDivElement>(null)

  return (
    <Paper id="app">
      <Typography variant="h5" component="h1">
        Extract background
      </Typography>
      <Typography component="p">
        動画から人物(一人に限る)を取り除いた背景を抽出します。
        定点からの映像でしか正常に動作しません。
        また、Chromeでしか動作しません。
        快適な動作にはそこそこのスペックを要求します。
        Positionは処理に利用しない前後の秒数を指定できます。
      </Typography>
      <Grid
        container
        direction="row"
        justify="flex-start"
        alignItems="flex-start"
        spacing={1}
      >
        <Grid item xs={12}>
          <PositionSetter />
        </Grid>
        <Grid item>
          <InputVideo />
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            disabled={state.fileUrl === '' || state.progress.phase !== 0}
            onClick={async () => {
              if ($video.current && $output.current) {
                await exec($video.current, $output.current, state)
                state.resetProgress()
              }
            }}
          >
            開始
            <KeyboardArrowRight />
            {state.progress.phase !== 0 && (
              <CircularProgress size={24} className="button-loading" />
            )}
          </Button>
        </Grid>
      </Grid>
      <Grid
        container
        direction="row"
        justify="flex-start"
        alignItems="center"
        spacing={1}
      >
        <Grid item xs>
          <LinearProgress variant="determinate" value={state.progress.value} />
        </Grid>
        <Grid item>{state.progress.value.toFixed(4)}%</Grid>
      </Grid>
      <video id="input" src={state.fileUrl} controls ref={$video} />
      <div id="output" ref={$output}></div>
    </Paper>
  )
}

export default App
