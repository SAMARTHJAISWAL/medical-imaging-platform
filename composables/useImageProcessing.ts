import { ref } from 'vue'
import Konva from 'konva'

export const useImageProcessing = () => {
  const brightness = ref(0) // Konva Brighten: -1..1
  const contrast = ref(0) // Konva Contrast: -100..100

  const applyFilters = (konvaImage: Konva.Image) => {
    konvaImage.cache()
    konvaImage.filters([Konva.Filters.Brighten, Konva.Filters.Contrast])
    konvaImage.brightness(brightness.value)
    konvaImage.contrast(contrast.value)
    konvaImage.getLayer()?.batchDraw()
  }
  /** value: slider position -100..100 */
  const adjustBrightness = (value: number, konvaImage: Konva.Image) => {
    brightness.value = value / 100
    applyFilters(konvaImage)
  }
  /** value: slider position -100..100 */
  const adjustContrast = (value: number, konvaImage: Konva.Image) => {
    contrast.value = value
    applyFilters(konvaImage)
  }
  return { brightness, contrast, applyFilters, adjustBrightness, adjustContrast }
}
