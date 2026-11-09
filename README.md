# Medical Image Analysis

A browser-based viewer for medical and ordinary images built with Nuxt 3. Open a PNG/JPEG or
an uncompressed DICOM (`.dcm`) file, then zoom, pan, crop, adjust brightness/contrast and
window/level, and take line, circle, ellipse and angle measurements in pixels, millimetres or
centimetres.

All processing happens client-side: files are read with the browser `File` API and are never
uploaded to a server. There is no backend and no API key.

> This is a learning/demo project, not a certified medical device. Do not use it for diagnosis.

## Features

- **Open images**: PNG, JPEG and other formats the browser can decode, plus DICOM files
  (detected by the `.dcm` extension or the `DICM` signature).
- **DICOM support**
  - Metadata panel: patient name and ID, study date, modality, study/series description,
    manufacturer, pixel spacing, window center/width.
  - Pixel rendering for uncompressed little-endian transfer syntaxes (implicit and explicit VR),
    8- or 16-bit, signed or unsigned, MONOCHROME1/MONOCHROME2 (first frame), with rescale
    slope/intercept applied. Compressed (JPEG, JPEG 2000, RLE…) and colour DICOM show metadata only.
  - Pixel spacing from the file is used for mm/cm measurements.
- **View tools**: zoom in/out (around the view centre), pan by dragging the image, Reset (clears
  zoom, annotations and adjustments).
- **Crop**: click *Crop*, drag a rectangle, click *Apply Crop*. The crop is taken from the
  full-resolution image.
- **Adjustments**: brightness and contrast (Konva filters) and window width/center. For DICOM,
  window/level is applied to the raw modality values; for raster images it is applied to luminance.
- **Measurements**: line length; circle radius, circumference and area; ellipse radii,
  circumference (Ramanujan approximation) and area; angle between two arms. Units: px, mm or cm,
  using a configurable pixel spacing (mm/pixel).
- **Light/dark mode** toggle.

## Tech stack

| Area | Library |
| --- | --- |
| Framework | [Nuxt 3](https://nuxt.com) (Vue 3, Composition API), TypeScript |
| UI | [Naive UI](https://www.naiveui.com), Tailwind CSS (`@nuxtjs/tailwindcss`) |
| Canvas | [Konva](https://konvajs.org) |
| DICOM parsing | [dicom-parser](https://github.com/cornerstonejs/dicomParser) |
| Tests | Node's built-in test runner (`node --test`) |

## Architecture

```
pages/analyze.vue          page that wires the toolbar, canvas and DICOM panel together
components/Toolbar.vue     buttons, sliders and measurement settings (emits events only)
components/ImageCanvas.vue Konva stage: fit-to-view, zoom/pan, tools, crop, filters
components/DicomViewer.vue metadata panel (presentational)
composables/               canvas behaviour: measurement tools, crop, filters, window/level,
                           DICOM parsing + rendering
utils/measurements.ts      pure geometry and unit conversion (unit tested)
utils/dicom.ts             pure DICOM pixel decoding and windowing (unit tested)
```

The image is drawn at its natural size with a uniform fit-to-view scale (max 800×600), so
measurements are converted back to source-image pixels before applying pixel spacing.
`/analyze` is rendered client-side only (`routeRules: { '/analyze': { ssr: false } }`) because it
depends on canvas APIs.

## Environment variables

None are required. The production Node server honours the standard Nitro variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `0.0.0.0` (Docker) | Interface for `npm start` / Docker |
| `PORT` | `3000` (`3001` in Docker) | Port for `npm start` / Docker |

See `.env.example`.

## Getting started

Requires Node.js `^20.19.0` or `>=22.12.0` (Nuxt 3.21 requirement; `.node-version` pins 22).

```bash
npm install
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run build
npm start            # node .output/server/index.mjs
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Nuxt dev server with HMR |
| `npm run build` | Production build (`.output/`, Node server preset) |
| `npm start` | Run the production build |
| `npm run preview` | Preview the production build via Nuxt |
| `npm run generate` | Pre-render a static site |
| `npm run typecheck` | `nuxt typecheck` (vue-tsc) |
| `npm test` | Unit tests for `utils/` with `node --test` (Node 22.18+ for TS type stripping) |

## Deployment

- **Docker**: `docker compose up --build` builds a Node 22 image and serves on port 3001.
- **Netlify**: `netlify.toml` runs `npm run build`; Nitro detects Netlify automatically and emits
  the publish directory and server function, so no preset or redirect rules are hard-coded.

CI (`.github/workflows/ci.yml`) runs typecheck, tests and build on pushes and pull requests.

## Project structure

```
.
├── app.vue                 root: dark-mode state + Naive UI theme provider
├── layouts/default.vue     header + page container
├── pages/
│   ├── index.vue           landing page
│   └── analyze.vue         the analyzer
├── components/             Toolbar, ImageCanvas, DicomViewer
├── composables/            useGeometricMeasurements, useCrop, useImageProcessing,
│                           useWindowLevel, useDicomParser
├── utils/                  measurements.ts, dicom.ts (pure, tested)
├── tests/                  node:test unit tests
├── types/imageTypes.ts     shared types
├── assets/styles/main.css  Tailwind entry
├── nuxt.config.ts
├── tailwind.config.js
├── Dockerfile, docker-compose.yml, netlify.toml
└── .github/workflows/ci.yml
```

## Known limitations

- Compressed or colour DICOM pixel data is not rendered (metadata is still shown); for
  multi-frame files only the first frame is displayed.
- Measurements and annotations are not saved or exported.
- Window/level after cropping a DICOM image works on the displayed 8-bit pixels rather than the
  raw values.

## Licence

[MIT](LICENSE) © 2024–2026 Samarth Jaiswal
