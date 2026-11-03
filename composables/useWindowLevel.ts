import { windowToRgba } from '~/utils/dicom'

/**
 * Window/level for ordinary 8-bit raster images (PNG/JPEG): converts the source image to
 * grayscale luminance and applies a linear window. DICOM images are windowed on their raw
 * modality values instead (see useDicomParser.renderImage).
 */
export const useWindowLevel = () => {
  const applyWindowLevel = (
    source: HTMLImageElement,
    center: number,
    width: number
  ): Promise<HTMLImageElement | null> => {
    const canvas = document.createElement('canvas')
    canvas.width = source.naturalWidth || source.width
    canvas.height = source.naturalHeight || source.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return Promise.resolve(null)
    ctx.drawImage(source, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const px = imageData.data
    const luminance = new Float32Array(px.length / 4)
    for (let i = 0; i < luminance.length; i++) {
      luminance[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]
    }
    const rgba = windowToRgba(luminance, center, width)
    // keep the source alpha channel
    for (let i = 3; i < rgba.length; i += 4) rgba[i] = px[i]
    imageData.data.set(rgba)
    ctx.putImageData(imageData, 0, 0)
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = canvas.toDataURL()
    })
  }
  return { applyWindowLevel }
}
