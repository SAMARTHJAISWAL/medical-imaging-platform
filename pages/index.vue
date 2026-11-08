<template>
  <div class="max-w-4xl mx-auto p-4">
    <h2 class="text-2xl font-bold mb-2">Medical Image Analysis</h2>
    <p class="mb-4 text-gray-600">
      Open a PNG/JPEG image or an uncompressed DICOM (.dcm) file to zoom, pan, crop, adjust
      brightness/contrast and window/level, and take line, circle, ellipse and angle measurements.
      Files are processed entirely in your browser and are never uploaded to a server.
    </p>
    <NuxtLink to="/analyze">
      <n-button type="primary">Open the analyzer</n-button>
    </NuxtLink>
  </div>
</template>
<script setup lang="ts">
import { NButton } from 'naive-ui'
</script>
