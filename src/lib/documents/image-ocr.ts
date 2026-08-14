import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { createWorker, OEM, PSM, type Worker } from 'tesseract.js'

const OCR_LANG_DIR = path.join('/tmp', 'igs-ocr-languages')
const OCR_CACHE_DIR = path.join('/tmp', 'igs-ocr-cache')
const MAX_OCR_WIDTH = 1_800
const MAX_OCR_HEIGHT = 2_400

interface OcrRuntimeState {
  workerPromise?: Promise<Worker>
  queue: Promise<void>
}

declare global {
  var igsOcrRuntime: OcrRuntimeState | undefined
}

function runtimeState(): OcrRuntimeState {
  if (!globalThis.igsOcrRuntime) globalThis.igsOcrRuntime = { queue: Promise.resolve() }
  return globalThis.igsOcrRuntime
}

async function prepareLanguageFiles() {
  await Promise.all([mkdir(OCR_LANG_DIR, { recursive: true }), mkdir(OCR_CACHE_DIR, { recursive: true })])
  const languagePackages = [
    { code: 'fra', root: path.dirname(require.resolve('@tesseract.js-data/fra')) },
    { code: 'eng', root: path.dirname(require.resolve('@tesseract.js-data/eng')) },
  ]
  await Promise.all(languagePackages.map(async ({ code, root }) => {
    const destination = path.join(OCR_LANG_DIR, `${code}.traineddata.gz`)
    try {
      await copyFile(path.join(root, '4.0.0_best_int', `${code}.traineddata.gz`), destination)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
  }))
}

async function createOcrWorker() {
  await prepareLanguageFiles()
  const worker = await createWorker(['fra', 'eng'], OEM.LSTM_ONLY, {
    langPath: OCR_LANG_DIR,
    cachePath: OCR_CACHE_DIR,
    cacheMethod: 'none',
    gzip: true,
  })
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  })
  return worker
}

async function worker() {
  const state = runtimeState()
  state.workerPromise ??= createOcrWorker().catch((error) => {
    state.workerPromise = undefined
    throw error
  })
  return state.workerPromise
}

async function prepareImage(buffer: Buffer) {
  return sharp(buffer, { limitInputPixels: 40_000_000, failOn: 'error' })
    .rotate()
    .resize({
      width: MAX_OCR_WIDTH,
      height: MAX_OCR_HEIGHT,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .grayscale()
    .normalize()
    .sharpen()
    .png({ compressionLevel: 6 })
    .toBuffer()
}

export interface OcrResult {
  text: string
  confidence: number
}

export async function recognizeDocumentImages(images: Buffer[]): Promise<OcrResult> {
  const state = runtimeState()
  const task = state.queue.then(async () => {
    const ocrWorker = await worker()
    const pages: string[] = []
    const confidences: number[] = []
    for (const image of images.slice(0, 2)) {
      const normalized = await prepareImage(image)
      const recognition = await ocrWorker.recognize(normalized, { rotateAuto: true })
      pages.push(recognition.data.text.trim())
      confidences.push(recognition.data.confidence)
    }
    return {
      text: pages.filter(Boolean).join('\n\n').slice(0, 80_000),
      confidence: confidences.length
        ? Math.round(confidences.reduce((total, value) => total + value, 0) / confidences.length)
        : 0,
    }
  })
  state.queue = task.then(
    () => undefined,
    () => {
      state.workerPromise = undefined
    },
  )
  return task
}
