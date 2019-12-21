import { setBackend } from '@tensorflow/tfjs-core'
import wasmPath from '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm'
import { load as loadBodyPix, BodyPix } from '@tensorflow-models/body-pix'
import { expose, transfer } from 'comlink'
import { Config } from './Parent.worker'
import { SemanticPersonSegmentation } from '@tensorflow-models/body-pix/dist/types'

declare const self: Worker

export class ChildWorker {
  private number!: number
  private config!: Config
  private inputCanvas!: OffscreenCanvas

  private bodyPixLoading = false
  private bodyPix: BodyPix | null = null

  public async init(num: number, config: Config) {
    this.number = num
    this.config = config
    this.inputCanvas = new OffscreenCanvas(config.width, config.height)
    await this.loadBodyPix()
  }

  private async loadBodyPix() {
    if (this.bodyPixLoading) return

    this.bodyPixLoading = true
    if (this.config.useWasm) {
      const { setWasmPath } = await import('@tensorflow/tfjs-backend-wasm')
      console.info('wasm backend used.')
      setWasmPath(wasmPath)
      await setBackend('wasm')
    }
    this.bodyPix = await loadBodyPix()
    this.bodyPixLoading = false
  }

  private _getPersonSeg(
    bodyPix: BodyPix,
    input: ImageBitmap,
    theshold: number
  ) {
    if (this.config.debugFlag) console.log(`Running: ${this.number}`)
    const context = this.inputCanvas.getContext('2d')!
    context.drawImage(input, 0, 0)
    const imageData = context.getImageData(0, 0, input.width, input.height)
    return bodyPix.segmentPerson(imageData, {
      segmentationThreshold: theshold
      //internalResolution: 'low'
    })
  }

  async getPersonSeg(
    input: ImageBitmap,
    theshold: number
  ): Promise<SemanticPersonSegmentation> {
    const personSeg = await this._getPersonSeg(this.bodyPix!, input, theshold)
    input.close()
    return transfer(personSeg, [personSeg.data.buffer])
  }
}

expose(ChildWorker, self)

// https://github.com/webpack-contrib/worker-loader/issues/190#issuecomment-488337001
export default {} as typeof Worker & (new () => Worker)
