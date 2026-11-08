<!-- components/ImageCanvas.vue -->
<template>
    <div>
      <div class="canvas-container" ref="canvasContainer" :class="{ 'dark': isDarkMode }"></div>
      <div v-if="image" class="mt-2 text-sm" :class="{ 'text-gray-200': isDarkMode, 'text-gray-600': !isDarkMode }">
        Image Dimensions: {{ imageSize.width }} x {{ imageSize.height }} pixels
      </div>
    </div>
  </template>
  <script setup lang="ts">
  import { ref, onUnmounted } from 'vue'
  import Konva from 'konva'
  import { useImageProcessing } from '~/composables/useImageProcessing'
  import { useCrop } from '~/composables/useCrop'
  import { useGeometricMeasurements, type GeometricShape } from '~/composables/useGeometricMeasurements'
  import type { MeasurementUnit } from '~/utils/measurements'
  defineProps<{
    isDarkMode: boolean
  }>()
  const MAX_WIDTH = 800
  const MAX_HEIGHT = 600
  const canvasContainer = ref<HTMLDivElement | null>(null)
  const image = ref<HTMLImageElement | null>(null)
  const imageSize = ref({ width: 0, height: 0 })
  let stage: Konva.Stage | null = null
  let layer: Konva.Layer | null = null
  let konvaImage: Konva.Image | null = null
  // canvas units per source-image pixel (fit-to-view scale)
  let fitScale = 1
  const scale = ref(1)
  const { brightness, contrast, applyFilters, adjustBrightness, adjustContrast } = useImageProcessing()
  const { initCrop, applyCrop: cropImage, cancelCrop } = useCrop()
  const { attach, detach } = useGeometricMeasurements()

  const initCanvas = (imageElement: HTMLImageElement) => {
    if (!canvasContainer.value) return
    stage?.destroy()
    const w = imageElement.naturalWidth || imageElement.width
    const h = imageElement.naturalHeight || imageElement.height
    // Uniform scale so the aspect ratio is preserved.
    fitScale = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h, 1)
    stage = new Konva.Stage({
      container: canvasContainer.value,
      width: Math.round(w * fitScale),
      height: Math.round(h * fitScale)
    })
    layer = new Konva.Layer()
    stage.add(layer)
    konvaImage = new Konva.Image({
      image: imageElement,
      width: w,
      height: h,
      scaleX: fitScale,
      scaleY: fitScale,
      draggable: true
    })
    layer.add(konvaImage)
    layer.draw()
    scale.value = 1
  }

  /** Show a new image, resetting zoom, annotations and tools. */
  const setImage = (newImage: HTMLImageElement) => {
    image.value = newImage
    imageSize.value = {
      width: newImage.naturalWidth || newImage.width,
      height: newImage.naturalHeight || newImage.height
    }
    initCanvas(newImage)
  }

  /** Swap the displayed pixels (e.g. after window/level) while keeping view and annotations. */
  const replacePixels = (newImage: HTMLImageElement) => {
    if (!konvaImage) return
    konvaImage.image(newImage)
    if (brightness.value !== 0 || contrast.value !== 0) applyFilters(konvaImage)
    else konvaImage.getLayer()?.batchDraw()
  }

  /** Zoom in/out around the centre of the view. */
  const zoom = (direction: 'in' | 'out') => {
    if (!stage) return
    const scaleBy = 1.2
    const oldScale = scale.value
    const center = { x: stage.width() / 2, y: stage.height() / 2 }
    const pointTo = {
      x: (center.x - stage.x()) / oldScale,
      y: (center.y - stage.y()) / oldScale
    }
    const newScale = direction === 'in' ? oldScale * scaleBy : oldScale / scaleBy
    scale.value = newScale
    stage.scale({ x: newScale, y: newScale })
    stage.position({ x: center.x - pointTo.x * newScale, y: center.y - pointTo.y * newScale })
    stage.batchDraw()
  }

  /** Reset zoom/pan, remove annotations and clear brightness/contrast. */
  const reset = () => {
    if (!stage || !layer || !konvaImage) return
    detach(stage)
    cancelCrop(stage)
    scale.value = 1
    stage.scale({ x: 1, y: 1 })
    stage.position({ x: 0, y: 0 })
    konvaImage.position({ x: 0, y: 0 })
    konvaImage.draggable(true)
    layer.getChildren((node) => node !== konvaImage).forEach((node) => node.destroy())
    adjustBrightness(0, konvaImage)
    adjustContrast(0, konvaImage)
    stage.batchDraw()
  }

  /** Activate a measurement tool, or pass null to return to pan mode. */
  const setTool = (tool: GeometricShape | null, unit: MeasurementUnit = 'px', pixelSpacing = 1) => {
    if (!stage || !layer || !konvaImage) return
    cancelCrop(stage)
    if (!tool) {
      detach(stage)
      konvaImage.draggable(true)
      return
    }
    konvaImage.draggable(false)
    attach(stage, layer, tool, { unit, pixelSpacing, imageScale: fitScale })
  }

  const startCrop = () => {
    if (!stage || !layer || !konvaImage) return
    detach(stage)
    konvaImage.draggable(false)
    initCrop(stage, layer)
  }

  /** Crop to the drawn box. Returns the cropped image (full resolution) or null. */
  const finishCrop = async (): Promise<HTMLImageElement | null> => {
    if (!stage || !konvaImage) return null
    const cropped = await cropImage(stage, konvaImage)
    konvaImage.draggable(true)
    if (cropped) setImage(cropped)
    return cropped
  }

  const updateBrightness = (value: number) => {
    if (konvaImage) adjustBrightness(value, konvaImage)
  }
  const updateContrast = (value: number) => {
    if (konvaImage) adjustContrast(value, konvaImage)
  }
  onUnmounted(() => {
    stage?.destroy()
  })
  defineExpose({
    setImage,
    replacePixels,
    zoom,
    reset,
    setTool,
    startCrop,
    finishCrop,
    updateBrightness,
    updateContrast
  })
  </script>
  <style scoped>
  .canvas-container {
    border: 1px solid var(--border);
    border-radius: 4px;
    min-height: 400px;
    background-color: var(--card-bg);
  }
  .mt-2 {
    margin-top: 0.5rem;
  }
  .text-sm {
    font-size: 0.875rem;
    line-height: 1.25rem;
  }
  .text-gray-200 {
    color: #e5e7eb;
  }
  .text-gray-600 {
    color: #4b5563;
  }
  :deep(.dark) {
    .canvas-container {
      background-color: #2d3748;
      border-color: #4a5568;
    }
  }
  </style>