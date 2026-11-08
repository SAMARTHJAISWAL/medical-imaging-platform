<!-- components/Toolbar.vue -->
<template>
    <div class="flex flex-col gap-4 p-4 rounded-lg" :class="{ 'bg-gray-800 text-white': isDarkMode, 'bg-white': !isDarkMode }">
      <div class="flex flex-wrap gap-2">
        <n-button-group>
          <n-button @click="$emit('zoom', 'in')" type="primary">
            Zoom In
          </n-button>
          <n-button @click="$emit('zoom', 'out')" type="primary">
            Zoom Out
          </n-button>
        </n-button-group>  
        <n-button-group>
          <n-button 
            @click="setMeasurementTool('line')"
            :type="activeTool === 'line' ? 'primary' : 'default'"
          >
            Line
          </n-button>
          <n-button 
            @click="setMeasurementTool('circle')"
            :type="activeTool === 'circle' ? 'primary' : 'default'"
          >
            Circle
          </n-button>
          <n-button 
            @click="setMeasurementTool('ellipse')"
            :type="activeTool === 'ellipse' ? 'primary' : 'default'"
          >
            Ellipse
          </n-button>
          <n-button 
            @click="setMeasurementTool('angle')"
            :type="activeTool === 'angle' ? 'primary' : 'default'"
          >
            Angle
          </n-button>
        </n-button-group>  
        <n-button @click="$emit('reset')" type="warning">
          Reset
        </n-button>
        <n-button
          @click="$emit('crop')"
          :type="isCropping ? 'success' : 'default'"
        >
          {{ isCropping ? 'Apply Crop' : 'Crop' }}
        </n-button>
      </div>
      <n-collapse>
        <n-collapse-item title="Image Adjustments">
          <div class="image-adjustments">
            <div class="mb-2">
              <label class="block text-sm font-medium mb-1">Brightness</label>
              <n-slider
                v-model:value="brightnessValue"
                :min="-100"
                :max="100"
                :step="1"
                @update:value="$emit('brightness-change', $event)"
              />
            </div>
            <div class="mb-2">
              <label class="block text-sm font-medium mb-1">Contrast</label>
              <n-slider
                v-model:value="contrastValue"
                :min="-100"
                :max="100"
                :step="1"
                @update:value="$emit('contrast-change', $event)"
              />
            </div>  
            <div class="mb-2">
              <label class="block text-sm font-medium mb-1">Window Width: {{ Math.round(windowWidth) }}</label>
              <n-slider
                :value="windowWidth"
                :min="1"
                :max="windowRange.max - windowRange.min + 1"
                :step="1"
                @update:value="$emit('window-width-change', $event)"
              />
            </div>
            <div class="mb-2">
              <label class="block text-sm font-medium mb-1">Window Center: {{ Math.round(windowCenter) }}</label>
              <n-slider
                :value="windowCenter"
                :min="windowRange.min"
                :max="windowRange.max"
                :step="1"
                @update:value="$emit('window-center-change', $event)"
              />
            </div>
          </div>
        </n-collapse-item>
      </n-collapse>
      <n-collapse>
        <n-collapse-item title="Measurement Settings">
          <div class="mb-2">
            <label class="block text-sm font-medium mb-1">Unit</label>
            <n-select
              v-model:value="measurementUnit"
              :options="[
                { label: 'Pixels', value: 'px' },
                { label: 'Millimeters', value: 'mm' },
                { label: 'Centimeters', value: 'cm' }
              ]"
              @update:value="$emit('unit-change', $event)"
            />
          </div>
          <div class="mb-2">
            <label class="block text-sm font-medium mb-1">Pixel Spacing (mm)</label>
            <n-input-number
              :value="pixelSpacing"
              :min="0.001"
              :step="0.001"
              @update:value="(v: number | null) => v && $emit('pixel-spacing-change', v)"
            />
          </div>
        </n-collapse-item>
      </n-collapse>
      <n-button @click="$emit('toggle-theme')" class="mt-2">
        {{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}
      </n-button>
    </div>
  </template>
  <script setup lang="ts">
  import { ref } from 'vue'
  import {
    NButton,
    NButtonGroup,
    NSlider,
    NCollapse,
    NCollapseItem,
    NSelect,
    NInputNumber
  } from 'naive-ui'
  import type { GeometricShape } from '~/composables/useGeometricMeasurements'
  import type { MeasurementUnit } from '~/utils/measurements'
  withDefaults(defineProps<{
    isDarkMode: boolean
    isCropping?: boolean
    windowWidth?: number
    windowCenter?: number
    windowRange?: { min: number, max: number }
    pixelSpacing?: number
  }>(), {
    pixelSpacing: 1,
    isCropping: false,
    windowWidth: 256,
    windowCenter: 128,
    windowRange: () => ({ min: 0, max: 255 })
  })
  const activeTool = ref<GeometricShape | null>(null)
  const brightnessValue = ref(0)
  const contrastValue = ref(0)
  const measurementUnit = ref<MeasurementUnit>('px')
  const setMeasurementTool = (tool: GeometricShape) => {
    activeTool.value = activeTool.value === tool ? null : tool
    emit('measure', activeTool.value)
  }
  /** Called by the parent after Reset so the controls match the canvas again. */
  const resetControls = () => {
    activeTool.value = null
    brightnessValue.value = 0
    contrastValue.value = 0
  }
  defineExpose({ resetControls })
  const emit = defineEmits<{
    (e: 'zoom', direction: 'in' | 'out'): void
    (e: 'reset'): void
    (e: 'measure', tool: GeometricShape | null): void
    (e: 'crop'): void
    (e: 'brightness-change', value: number): void
    (e: 'contrast-change', value: number): void
    (e: 'window-width-change', value: number): void
    (e: 'window-center-change', value: number): void
    (e: 'unit-change', value: MeasurementUnit): void
    (e: 'pixel-spacing-change', value: number): void
    (e: 'toggle-theme'): void
  }>()
  </script>





