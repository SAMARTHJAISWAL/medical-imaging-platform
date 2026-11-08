<!-- app.vue -->
<template>
  <n-config-provider :theme="isDarkMode ? darkTheme : null">
    <div :class="{ 'dark': isDarkMode }">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>
  </n-config-provider>
</template>
<script setup lang="ts">
import { ref, provide } from 'vue'
import { NConfigProvider, darkTheme } from 'naive-ui'
const isDarkMode = ref(false)
provide('isDarkMode', isDarkMode)
</script>
