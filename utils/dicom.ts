// Pure helpers for turning DICOM pixel data into displayable RGBA pixels.
// No browser or Vue APIs here so the logic can be unit tested with `node --test`.

export interface DicomPixelInfo {
  rows: number
  columns: number
  bitsAllocated: number
  /** 0 = unsigned, 1 = two's complement signed */
  pixelRepresentation: number
  samplesPerPixel: number
  photometricInterpretation: string
  rescaleSlope: number
  rescaleIntercept: number
}

/** Format a DICOM DA value (YYYYMMDD) as YYYY-MM-DD; returns the input if it isn't 8 digits. */
export const formatDicomDate = (value?: string): string => {
  if (!value) return 'N/A'
  const v = value.trim()
  return /^\d{8}$/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : v
}

/** First number of a possibly multi-valued DICOM decimal string (e.g. "40\\400" -> 40). */
export const firstNumber = (value?: string): number | undefined => {
  if (!value) return undefined
  const n = parseFloat(value.split('\\')[0])
  return Number.isFinite(n) ? n : undefined
}

/** Read stored pixel values and apply the modality rescale (slope/intercept). */
export const readModalityValues = (bytes: Uint8Array, info: DicomPixelInfo): Float32Array => {
  const count = info.rows * info.columns
  const out = new Float32Array(count)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const signed = info.pixelRepresentation === 1
  for (let i = 0; i < count; i++) {
    let stored: number
    if (info.bitsAllocated === 16) {
      stored = signed ? view.getInt16(i * 2, true) : view.getUint16(i * 2, true)
    } else if (info.bitsAllocated === 8) {
      stored = signed ? view.getInt8(i) : view.getUint8(i)
    } else {
      throw new Error(`Unsupported Bits Allocated: ${info.bitsAllocated}`)
    }
    out[i] = stored * info.rescaleSlope + info.rescaleIntercept
  }
  return out
}

/** Default window when the file has none: span the full value range. */
export const autoWindow = (values: Float32Array): { center: number; width: number } => {
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!Number.isFinite(min)) return { center: 0, width: 1 }
  return { center: (min + max) / 2, width: Math.max(max - min, 1) }
}

/**
 * Map modality values to 8-bit RGBA grayscale with a linear window/level.
 * MONOCHROME1 images are inverted so that high values display dark.
 */
export const windowToRgba = (
  values: Float32Array,
  center: number,
  width: number,
  invert = false
): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(values.length * 4)
  const w = Math.max(width, 1)
  const low = center - w / 2
  for (let i = 0; i < values.length; i++) {
    let g = ((values[i] - low) / w) * 255
    if (invert) g = 255 - g
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = g
    out[i * 4 + 3] = 255
  }
  return out
}
