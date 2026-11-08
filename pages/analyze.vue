<!-- pages/analyze.vue -->
<template>
  <div class="min-h-screen" :class="{ 'dark': isDarkMode }">
    <div class="max-w-6xl mx-auto p-4">
      <Toolbar
        ref="toolbarRef"
        @zoom="handleZoom"
        @reset="handleReset"
        @measure="handleMeasure"
        @crop="handleCrop"
        @brightness-change="handleBrightnessChange"
        @contrast-change="handleContrastChange"
        @window-width-change="(v) => handleWindowChange('width', v)"
        @window-center-change="(v) => handleWindowChange('center', v)"
        @unit-change="handleUnitChange"
        @pixel-spacing-change="handlePixelSpacingChange"
        @toggle-theme="toggleDarkMode"
        :isCropping="isCropping"
        :isDarkMode="isDarkMode"
        :windowWidth="windowWidth"
        :windowCenter="windowCenter"
        :windowRange="windowRange"
        :pixelSpacing="pixelSpacing"
      />
      <div class="flex justify-end mt-4" v-if="hasImage">
        <n-button @click="fileInput?.click()" size="small">Open another file</n-button>
      </div>
      <input
        type="file"
        accept="image/*,.dcm,application/dicom"
        @change="handleFileUpload"
        class="hidden"
        ref="fileInput"
      />
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div class="upload-section dark:bg-gray-800 dark:border-gray-700" v-if="!hasImage">
          <n-button @click="fileInput?.click()" type="primary" size="large">
            Upload Image
          </n-button>
        </div>
        <ImageCanvas ref="imageCanvasRef" :isDarkMode="isDarkMode" />
        <DicomViewer
          v-if="isDicom"
          :isDarkMode="isDarkMode"
          :metadata="dicom.metadata.value"
          :error="dicom.error.value"
        />
      </div>
      <p v-if="uploadError" class="mt-4 text-sm text-red-600" role="alert">{{ uploadError }}</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, inject, type Ref } from 'vue'
import { NButton } from 'naive-ui'
import Toolbar from '~/components/Toolbar.vue'
import ImageCanvas from '~/components/ImageCanvas.vue'
import DicomViewer from '~/components/DicomViewer.vue'
import { useWindowLevel } from '~/composables/useWindowLevel'
import { useDicomParser, isDicomFile } from '~/composables/useDicomParser'
import type { GeometricShape } from '~/composables/useGeometricMeasurements'
import type { MeasurementUnit } from '~/utils/measurements'

const imageCanvasRef = ref<InstanceType<typeof ImageCanvas> | null>(null)
const toolbarRef = ref<InstanceType<typeof Toolbar> | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isDicom = ref(false)
const hasImage = ref(false)
const isCropping = ref(false)
const uploadError = ref<string | null>(null)
const isDarkMode = inject<Ref<boolean>>('isDarkMode', ref(false))
const currentTool = ref<GeometricShape | null>(null)
const currentUnit = ref<MeasurementUnit>('px')
const pixelSpacing = ref(1)
const windowWidth = ref(256)
const windowCenter = ref(128)
const windowRange = ref({ min: 0, max: 255 })
// Unmodified raster image, the source for window/level on non-DICOM files.
let sourceImage: HTMLImageElement | null = null
// After a crop the raw DICOM pixels no longer match the view, so window/level falls back to the raster path.
let dicomCropped = false

const dicom = useDicomParser()
const { applyWindowLevel } = useWindowLevel()

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('The browser could not decode this image.'))
    img.src = src
  })

const showImage = (img: HTMLImageElement) => {
  sourceImage = img
  dicomCropped = false
  imageCanvasRef.value?.setImage(img)
  hasImage.value = true
  currentTool.value = null
  isCropping.value = false
  toolbarRef.value?.resetControls()
}

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = '' // allow re-selecting the same file
  if (!file) return
  uploadError.value = null
  try {
    isDicom.value = await isDicomFile(file)
    if (isDicom.value) {
      await dicom.parseDicomFile(file)
      const spacing = dicom.pixelSpacingMm()
      if (spacing) pixelSpacing.value = spacing
      if (dicom.hasPixels()) {
        windowCenter.value = dicom.windowCenter.value
        windowWidth.value = dicom.windowWidth.value
        const half = Math.max(windowWidth.value, 256)
        windowRange.value = {
          min: Math.floor(windowCenter.value - half),
          max: Math.ceil(windowCenter.value + half)
        }
        const img = await dicom.renderImage()
        if (img) showImage(img)
      }
      return
    }
    dicom.reset()
    windowRange.value = { min: 0, max: 255 }
    windowCenter.value = 128
    windowWidth.value = 256
    pixelSpacing.value = 1
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    showImage(await loadImage(dataUrl))
  } catch (e) {
    uploadError.value = e instanceof Error ? e.message : 'Could not open this file.'
  }
}

const handleZoom = (direction: 'in' | 'out') => {
  imageCanvasRef.value?.zoom(direction)
}
const handleReset = () => {
  imageCanvasRef.value?.reset()
  toolbarRef.value?.resetControls()
  currentTool.value = null
  isCropping.value = false
}
const handleMeasure = (tool: GeometricShape | null) => {
  currentTool.value = tool
  isCropping.value = false
  imageCanvasRef.value?.setTool(tool, currentUnit.value, pixelSpacing.value)
}
const handleCrop = async () => {
  const canvas = imageCanvasRef.value
  if (!canvas) return
  if (!isCropping.value) {
    // first click: draw a box; second click: apply it
    currentTool.value = null
    toolbarRef.value?.resetControls()
    canvas.startCrop()
    isCropping.value = true
    return
  }
  isCropping.value = false
  const cropped = await canvas.finishCrop()
  if (cropped) {
    sourceImage = cropped
    dicomCropped = isDicom.value
  }
}
const handleBrightnessChange = (value: number) => {
  imageCanvasRef.value?.updateBrightness(value)
}
const handleContrastChange = (value: number) => {
  imageCanvasRef.value?.updateContrast(value)
}
let windowRequest = 0
const handleWindowChange = async (type: 'width' | 'center', value: number) => {
  if (type === 'width') windowWidth.value = value
  else windowCenter.value = value
  const request = ++windowRequest
  let img: HTMLImageElement | null = null
  if (isDicom.value && dicom.hasPixels() && !dicomCropped) {
    dicom.windowCenter.value = windowCenter.value
    dicom.windowWidth.value = windowWidth.value
    img = await dicom.renderImage()
  } else if (sourceImage) {
    img = await applyWindowLevel(sourceImage, windowCenter.value, windowWidth.value)
  }
  // drop stale results when the slider moves faster than rendering
  if (img && request === windowRequest) imageCanvasRef.value?.replacePixels(img)
}
const handleUnitChange = (unit: MeasurementUnit) => {
  currentUnit.value = unit
  if (currentTool.value) handleMeasure(currentTool.value)
}
const handlePixelSpacingChange = (spacing: number) => {
  pixelSpacing.value = spacing
  if (currentTool.value) handleMeasure(currentTool.value)
}
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
  document.documentElement.classList.toggle('dark', isDarkMode.value)
}
</script>
<style>
.dark {
    background-color: var(--background);
    color: var(--text);
  }
.upload-section {
  @apply flex justify-center items-center min-h-[400px] border-2 border-dashed rounded-lg p-5;
  background-color: var(--card-bg);
  border-color: var(--border);
}
:root {
  --background: #ffffff;
  --text: #000000;
  --card-bg: #ffffff;
  --border: #e2e8f0;
}
:root.dark {
  --background: #1a1a1a;
  --text: #ffffff;
  --card-bg: #2d3748;
  --border: #4a5568;
}
  .grid {
    display: grid;
  } 
  .grid-cols-1 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
  @media (min-width: 768px) {
    .md\:grid-cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .gap-4 {
    gap: 1rem;
  }
  .mt-4 {
    margin-top: 1rem;
  }
  .max-w-6xl {
    max-width: 72rem;
  }
  .mx-auto {
    margin-left: auto;
    margin-right: auto;
  }
  .p-4 {
    padding: 1rem;
  }
  .min-h-screen {
    min-height: 100vh;
  }
  .hidden {
    display: none;
  }
</style>