// composables/useDicomParser.ts
import { ref, shallowRef } from 'vue'
import dicomParser from 'dicom-parser'
import type { DicomMetadata } from '~/types/imageTypes'
import {
  autoWindow,
  firstNumber,
  formatDicomDate,
  readModalityValues,
  windowToRgba,
  type DicomPixelInfo
} from '~/utils/dicom'

// Transfer syntaxes whose pixel data is stored uncompressed, little endian.
const UNCOMPRESSED_LE = new Set(['1.2.840.10008.1.2', '1.2.840.10008.1.2.1'])

export const isDicomFile = async (file: File): Promise<boolean> => {
  if (file.name.toLowerCase().endsWith('.dcm')) return true
  // Part 10 files carry "DICM" at byte offset 128.
  const head = new Uint8Array(await file.slice(128, 132).arrayBuffer())
  return String.fromCharCode(...head) === 'DICM'
}

export const useDicomParser = () => {
  const metadata = ref<DicomMetadata | null>(null)
  const error = ref<string | null>(null)
  const windowCenter = ref(0)
  const windowWidth = ref(1)
  // Rescaled pixel values kept so window/level can be re-applied without re-parsing.
  const values = shallowRef<Float32Array | null>(null)
  let info: DicomPixelInfo | null = null

  const reset = () => {
    metadata.value = null
    error.value = null
    values.value = null
    info = null
  }

  const parseDicomFile = async (file: File) => {
    reset()
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const ds = dicomParser.parseDicom(bytes)
      const str = (tag: string) => ds.string(tag)?.trim() || undefined

      metadata.value = {
        patientName: str('x00100010') ?? 'N/A',
        patientId: str('x00100020') ?? 'N/A',
        studyDate: formatDicomDate(str('x00080020')),
        modality: str('x00080060') ?? 'N/A',
        studyDescription: str('x00081030') ?? 'N/A',
        seriesDescription: str('x0008103e') ?? 'N/A',
        manufacturer: str('x00080070') ?? 'N/A',
        pixelSpacing: str('x00280030') ?? 'N/A',
        windowCenter: str('x00281050') ?? 'N/A',
        windowWidth: str('x00281051') ?? 'N/A'
      }

      const transferSyntax = str('x00020010') ?? '1.2.840.10008.1.2'
      const pixelElement = ds.elements.x7fe00010
      if (!pixelElement) {
        error.value = 'This DICOM file has no pixel data; showing metadata only.'
        return
      }
      if (!UNCOMPRESSED_LE.has(transferSyntax)) {
        error.value = `Compressed transfer syntax ${transferSyntax} is not supported for display; showing metadata only.`
        return
      }

      info = {
        rows: ds.uint16('x00280010') ?? 0,
        columns: ds.uint16('x00280011') ?? 0,
        bitsAllocated: ds.uint16('x00280100') ?? 16,
        pixelRepresentation: ds.uint16('x00280103') ?? 0,
        samplesPerPixel: ds.uint16('x00280002') ?? 1,
        photometricInterpretation: str('x00280004') ?? 'MONOCHROME2',
        rescaleSlope: firstNumber(str('x00281053')) ?? 1,
        rescaleIntercept: firstNumber(str('x00281052')) ?? 0
      }
      if (info.samplesPerPixel !== 1 || !info.photometricInterpretation.startsWith('MONOCHROME')) {
        error.value = `Photometric interpretation ${info.photometricInterpretation} is not supported for display; showing metadata only.`
        info = null
        return
      }

      const pixelBytes = new Uint8Array(bytes.buffer, pixelElement.dataOffset, pixelElement.length)
      values.value = readModalityValues(pixelBytes, info)

      const auto = autoWindow(values.value)
      windowCenter.value = firstNumber(str('x00281050')) ?? auto.center
      windowWidth.value = firstNumber(str('x00281051')) ?? auto.width
    } catch (e) {
      error.value = `Error parsing DICOM file: ${e instanceof Error ? e.message : 'Unknown error'}`
      console.error('Error parsing DICOM file:', e)
    }
  }

  /** Render the current pixel data with the current window/level to an HTMLImageElement. */
  const renderImage = (): Promise<HTMLImageElement | null> => {
    if (!values.value || !info) return Promise.resolve(null)
    const canvas = document.createElement('canvas')
    canvas.width = info.columns
    canvas.height = info.rows
    const ctx = canvas.getContext('2d')
    if (!ctx) return Promise.resolve(null)
    const rgba = windowToRgba(
      values.value,
      windowCenter.value,
      windowWidth.value,
      info.photometricInterpretation === 'MONOCHROME1'
    )
    const imageData = ctx.createImageData(info.columns, info.rows)
    imageData.data.set(rgba)
    ctx.putImageData(imageData, 0, 0)
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = canvas.toDataURL()
    })
  }

  /** Pixel spacing (mm/pixel, row spacing) from the file, if present. */
  const pixelSpacingMm = (): number | undefined => firstNumber(metadata.value?.pixelSpacing)

  return {
    metadata,
    error,
    windowCenter,
    windowWidth,
    hasPixels: () => values.value !== null,
    parseDicomFile,
    renderImage,
    pixelSpacingMm,
    reset
  }
}
