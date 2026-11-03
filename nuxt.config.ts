export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/styles/main.css'],
  app: {
    head: {
      title: 'Medical Image Analysis'
    }
  },
  // The analyzer is canvas/Konva based and only makes sense in the browser.
  routeRules: {
    '/analyze': { ssr: false }
  },
  // No hard-coded Nitro preset: `nuxt build` targets node-server (Docker / `npm start`) by
  // default and auto-detects Netlify when built there (NETLIFY env var).
  experimental: {
    payloadExtraction: false
  }
})
