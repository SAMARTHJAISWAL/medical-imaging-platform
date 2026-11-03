<!-- components/DicomViewer.vue -->
<template>
    <div class="dicom-viewer p-4 rounded-lg" :class="{ 'bg-gray-800 text-white': isDarkMode, 'bg-white': !isDarkMode }">
      <div v-if="metadata" class="metadata-grid">
        <div class="metadata-item" v-for="(value, key) in metadata" :key="key">
          <span class="label">{{ formatLabel(key) }}:</span>
          <span class="value">{{ value }}</span>
        </div>
      </div>
      <div v-if="error" class="error-message" role="alert">
        {{ error }}
      </div>
      <div v-if="!metadata && !error" class="loading">
        Reading DICOM data...
      </div>
    </div>
  </template>
  <script setup lang="ts">
  import type { DicomMetadata } from '~/types/imageTypes'
  defineProps<{
    isDarkMode: boolean
    metadata: DicomMetadata | null
    error: string | null
  }>()
  const formatLabel = (key: string | number): string => {
    return String(key)
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
  }
  </script>
  <style scoped>
  .dicom-viewer {
    height: 100%;
    min-height: 400px;
  }
  .metadata-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }
  .metadata-item {
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    background-color: var(--card-bg);
  }
  .label {
    display: block;
    font-weight: 500;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
    color: var(--text);
  }
  .value {
    font-size: 0.875rem;
    color: var(--text);
  }
  .error-message {
    padding: 1rem;
    border-radius: 0.375rem;
    background-color: rgb(254, 226, 226);
    color: rgb(185, 28, 28);
    margin: 1rem 0;
  }
  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    font-size: 0.875rem;
    color: var(--text);
  }
  :deep(.dark) {
    .metadata-item {
      border-color: #4a5568;
      background-color: #2d3748;
    }
    .error-message {
      background-color: rgb(127, 29, 29);
      color: rgb(254, 226, 226);
    }
  }
  </style>