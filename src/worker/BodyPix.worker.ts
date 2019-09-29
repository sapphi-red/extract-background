import {
  load as loadBodyPix,
  BodyPix,
  toMaskImageData
} from '@tensorflow-models/body-pix'
import { expose } from 'comlink'
import { PersonSegmentation } from '@tensorflow-models/body-pix/dist/types'

declare const self: Worker

const STRIDE = 32

export interface Config {
  width: number
  height: number
}

export class BodyPixWorker {
  private config!: Config
  private outputCanvas!: OffscreenCanvas

  private videoCanvas!: OffscreenCanvas
  private backgroundCanvas!: OffscreenCanvas

  private bodyPixLoading = false
  private bodyPix: BodyPix | null = null

  private completedPixels: Uint8Array | null = null

  public async init(config: Config, canvas: OffscreenCanvas) {
    this.config = config
    this.outputCanvas = canvas
    this.videoCanvas = new OffscreenCanvas(config.width, config.height)
    this.backgroundCanvas = new OffscreenCanvas(config.width, config.height)
    await this.loadBodyPix()
  }

  private async loadBodyPix() {
    if (this.bodyPixLoading) return

    this.bodyPixLoading = true
    this.bodyPix = await loadBodyPix()
    this.bodyPixLoading = false
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

  private async createBackground(
    seg: PersonSegmentation,
    video: OffscreenCanvas
  ) {
    const maskImageData = toMaskImageData(seg)
    const background = this.backgroundCanvas
    const ctx = background.getContext('2d')!
    this.resetCanvas(ctx)
    ctx.putImageData(maskImageData, 0, 0)
    this.drawWithCompositing(ctx, video, 'source-in')
    return background
  }

  private getPersonSeg(
    bodyPix: BodyPix,
    input: OffscreenCanvas,
    theshold: number
  ) {
    return bodyPix.estimatePersonSegmentation(
      (input as unknown) as HTMLCanvasElement,
      STRIDE,
      theshold
    )
  }

  async apply(inputImg: ImageBitmap, theshold: number) {
    const output = this.outputCanvas
    const input = this.videoCanvas
    {
      const ctx = input.getContext('2d')!
      ctx.drawImage(inputImg, 0, 0)
      inputImg.close()
    }

    const ctx = output.getContext('2d')!

    const personSeg = await this.getPersonSeg(this.bodyPix!, input, theshold)

    if (this.completedPixels === null) {
      this.completedPixels = personSeg.data
    } else {
      let completed = true
      for (let i = 0; i < personSeg.data.length; i++) {
        if (this.completedPixels[i] === 1) {
          completed = false
        }
        if (personSeg.data[i] === 0 && this.completedPixels[i] === 1) {
          this.completedPixels[i] = 0
        }
      }
      if (completed) {
        return true
      }
    }

    const background = await this.createBackground(personSeg, input)

    // 人物以外の部分を裏に書き込み
    this.drawWithCompositing(ctx, background, 'destination-over')
    return false
  }
}

expose(BodyPixWorker, self)

// https://github.com/webpack-contrib/worker-loader/issues/190#issuecomment-488337001
export default {} as typeof Worker & (new () => Worker)
