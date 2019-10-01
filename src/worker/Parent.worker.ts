import {
  setBackend,
  tensor1d,
  Tensor1D,
  tidy,
  logicalNot,
  logicalAnd
} from '@tensorflow/tfjs-core'
import { setWasmPath } from '@tensorflow/tfjs-backend-wasm'
import wasmPath from '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm'
import { toMask } from '@tensorflow-models/body-pix'
import { expose, wrap, Remote, transfer } from 'comlink'
import { SemanticPersonSegmentation } from '@tensorflow-models/body-pix/dist/types'
import ChildWorkerAbstract, { ChildWorker } from '../worker/Child.worker'

declare const self: Worker

export interface Config {
  width: number
  height: number
  duration: number
  debugFlag: boolean
  startPos: number
  endPos: number
  useWasm: boolean
}

const THESHOLDS = [0.05, 0.1, 0.2, 0.3, 0.5, 0.8, 1.0]

export class ParentWorker {
  private config!: Config
  private concurrency!: number
  private outputCanvas!: OffscreenCanvas

  private backgroundCanvas!: OffscreenCanvas

  private childWorkers!: Remote<ChildWorker>[]
  private childPromises!: Promise<
    [number, ImageBitmap, SemanticPersonSegmentation] | [number]
  >[]
  private applyPromiseChain: Promise<number | void> = Promise.resolve()

  private nonCompletedPixels: Tensor1D | null = null
  private completedCount = 0

  public async init(
    config: Config,
    canvas: OffscreenCanvas,
    concurrency: number
  ) {
    this.config = config
    this.concurrency = concurrency
    this.outputCanvas = canvas
    this.backgroundCanvas = new OffscreenCanvas(config.width, config.height)
    console.info(`concurrency: ${concurrency}`)

    /*
    if (this.config.useWasm) {
      console.info('wasm backend used (parent).')
      setWasmPath(wasmPath)
      await setBackend('wasm')
    }
    */

    const childWorkerPromises = []
    for (let i = 0; i < concurrency; i++) {
      childWorkerPromises.push(this.createChildWorker(i))
    }
    this.childWorkers = await Promise.all(childWorkerPromises)
    this.childPromises = Array.from({ length: concurrency }, (_, num) =>
      Promise.resolve([num])
    )
  }

  private async createChildWorker(num: number) {
    const WrappedChildWorker = wrap<typeof ChildWorker>(
      new ChildWorkerAbstract()
    )
    const childWorker = await new WrappedChildWorker()
    await childWorker.init(num, this.config)
    return childWorker
  }

  private resetCanvas(ctx: OffscreenCanvasRenderingContext2D) {
    ctx.clearRect(0, 0, this.config.width, this.config.height)
  }

  private drawWithCompositing(
    ctx: OffscreenCanvasRenderingContext2D,
    img: CanvasImageSource,
    operation: string
  ) {
    ctx.globalCompositeOperation = operation
    ctx.drawImage(img, 0, 0)
  }

  private createBackground(
    seg: SemanticPersonSegmentation,
    video: ImageBitmap
  ) {
    const maskImageData = toMask(seg)
    const background = this.backgroundCanvas
    const ctx = background.getContext('2d')!
    this.resetCanvas(ctx)
    ctx.putImageData(maskImageData, 0, 0)
    this.drawWithCompositing(ctx, video, 'source-in')
    return background
  }

  async getPersonSeg(
    num: number,
    input: ImageBitmap,
    theshold: number
  ): Promise<[number, ImageBitmap, SemanticPersonSegmentation]> {
    const inputImgCopy = await createImageBitmap(input)
    const personSeg = await this.childWorkers[num].getPersonSeg(
      transfer(input, [input]),
      theshold
    )
    return [num, inputImgCopy, personSeg]
  }

  apply(input: ImageBitmap, personSeg: SemanticPersonSegmentation) {
    if (this.nonCompletedPixels === null) {
      this.nonCompletedPixels = tensor1d(personSeg.data, 'bool')

      this.completedCount = tidy(
        () =>
          logicalNot(this.nonCompletedPixels!)
            .sum()
            .asScalar()
            .dataSync()[0]
      )
    } else {
      const newNonCompletedPixels = logicalAnd(
        personSeg.data,
        this.nonCompletedPixels
      ) as Tensor1D

      const isCompleted = !tidy(
        () =>
          newNonCompletedPixels
            .any()
            .asScalar()
            .dataSync()[0]
      )

      if (isCompleted) {
        this.nonCompletedPixels.dispose()
        newNonCompletedPixels.dispose()
        return -1
      }

      const newCompletedCount = tidy(
        () =>
          logicalNot(newNonCompletedPixels)
            .sum()
            .asScalar()
            .dataSync()[0]
      )
      if (this.completedCount === newCompletedCount) {
        newNonCompletedPixels.dispose()
        return this.completedCount
      }
      this.completedCount = newCompletedCount
      this.nonCompletedPixels.dispose()
      this.nonCompletedPixels = newNonCompletedPixels
    }

    const background = this.createBackground(personSeg, input)

    const output = this.outputCanvas
    const ctx = output.getContext('2d')!
    // 人物以外の部分を裏に書き込み
    this.drawWithCompositing(ctx, background, 'destination-over')
    return this.completedCount
  }

  async run(
    getNextImg: () => Promise<[ImageBitmap, number] | null>,
    retryFromStart: () => void,
    tick: () => void,
    notifyProgress: (progress: number) => void
  ) {
    const finishPos = this.config.duration - this.config.endPos
    let finish = false
    for (const theshold of THESHOLDS) {
      if (this.config.debugFlag) console.log(`start THESHOLD: ${theshold}`)
      retryFromStart()

      let currentTime = 0
      do {
        const res = await getNextImg()
        if (!res) continue

        const img = res[0]
        currentTime = res[1]

        const [num] = await Promise.race(this.childPromises)
        const segPromise = this.getPersonSeg(num, img, theshold)
        this.childPromises[num] = segPromise

        this.applyPromiseChain = this.applyPromiseChain
          .then(() => segPromise)
          // eslint-disable-next-line no-loop-func
          .then(([, input, personSeg]) => {
            if (finish) return

            const progress = this.apply(input, personSeg)
            notifyProgress(progress)
            if (progress === -1) {
              finish = true
            }
            input.close()
          })

        if (finish) return
        tick()
      } while (currentTime < finishPos)
    }
  }
}

expose(ParentWorker, self)

// https://github.com/webpack-contrib/worker-loader/issues/190#issuecomment-488337001
export default {} as typeof Worker & (new () => Worker)
