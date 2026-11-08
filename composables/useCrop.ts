import Konva from 'konva'

const EVENTS = 'mousedown.crop touchstart.crop mousemove.crop touchmove.crop mouseup.crop touchend.crop'

/** Drag a crop rectangle on the stage, then cut that region out of the image at full resolution. */
export const useCrop = () => {
  let cropBox: Konva.Rect | null = null

  const cancelCrop = (stage: Konva.Stage) => {
    stage.off(EVENTS)
    cropBox?.destroy()
    cropBox = null
  }

  const initCrop = (stage: Konva.Stage, layer: Konva.Layer) => {
    cancelCrop(stage)
    let isDrawing = false
    let start = { x: 0, y: 0 }
    stage.on('mousedown.crop touchstart.crop', () => {
      const pos = layer.getRelativePointerPosition()
      if (!pos) return
      isDrawing = true
      start = pos
      cropBox?.destroy()
      cropBox = new Konva.Rect({ x: pos.x, y: pos.y, width: 0, height: 0, stroke: '#00ff00', strokeWidth: 2, dash: [5, 5] })
      layer.add(cropBox)
      layer.batchDraw()
    })
    stage.on('mousemove.crop touchmove.crop', () => {
      if (!isDrawing || !cropBox) return
      const pos = layer.getRelativePointerPosition()
      if (!pos) return
      cropBox.width(pos.x - start.x)
      cropBox.height(pos.y - start.y)
      layer.batchDraw()
    })
    stage.on('mouseup.crop touchend.crop', () => {
      isDrawing = false
    })
  }

  /** Returns the cropped image, or null when no (non-empty) crop box has been drawn. */
  const applyCrop = (stage: Konva.Stage, konvaImage: Konva.Image): Promise<HTMLImageElement | null> => {
    const imageObj = konvaImage.image() as CanvasImageSource | undefined
    if (!cropBox || !imageObj) return Promise.resolve(null)
    // Normalise negative width/height, then convert layer coords -> source image pixels.
    const x0 = Math.min(cropBox.x(), cropBox.x() + cropBox.width())
    const y0 = Math.min(cropBox.y(), cropBox.y() + cropBox.height())
    const w = Math.abs(cropBox.width())
    const h = Math.abs(cropBox.height())
    const sx = (x0 - konvaImage.x()) / konvaImage.scaleX()
    const sy = (y0 - konvaImage.y()) / konvaImage.scaleY()
    const sw = Math.round(w / konvaImage.scaleX())
    const sh = Math.round(h / konvaImage.scaleY())
    cancelCrop(stage)
    if (sw < 1 || sh < 1) return Promise.resolve(null)
    const canvas = document.createElement('canvas')
    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d')
    if (!ctx) return Promise.resolve(null)
    ctx.drawImage(imageObj, sx, sy, sw, sh, 0, 0, sw, sh)
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = canvas.toDataURL()
    })
  }

  return { initCrop, applyCrop, cancelCrop, getCropBox: () => cropBox }
}
