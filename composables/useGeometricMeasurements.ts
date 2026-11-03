import Konva from 'konva'
import {
  angleAt,
  circleMetrics,
  distance,
  ellipseMetrics,
  formatArea,
  formatLength,
  type MeasurementUnit,
  type Point
} from '~/utils/measurements'

export type GeometricShape = 'line' | 'circle' | 'ellipse' | 'angle'

export interface MeasurementOptions {
  unit: MeasurementUnit
  /** mm per image pixel */
  pixelSpacing: number
  /** canvas units per image pixel (the fit-to-view scale of the displayed image) */
  imageScale: number
}

const EVENTS = 'mousedown.measure touchstart.measure mousemove.measure touchmove.measure mouseup.measure touchend.measure'
const STROKE = '#00ff00'

const label = (pos: Point) =>
  new Konva.Text({ x: pos.x, y: pos.y - 20, text: '', fontSize: 14, fill: STROKE, listening: false })

/**
 * Attaches drawing handlers for one measurement tool to a Konva stage.
 * Shapes are drawn in layer coordinates (so they follow zoom/pan) and measurements are
 * reported in image pixels converted to the selected unit.
 */
export const useGeometricMeasurements = () => {
  const detach = (stage: Konva.Stage) => {
    stage.off(EVENTS)
  }

  const attach = (stage: Konva.Stage, layer: Konva.Layer, tool: GeometricShape, opts: MeasurementOptions) => {
    detach(stage)
    const pointer = (): Point | null => layer.getRelativePointerPosition()
    const toImagePx = (canvasLength: number) => canvasLength / opts.imageScale
    const len = (canvasLength: number) => formatLength(toImagePx(canvasLength), opts.unit, opts.pixelSpacing)
    const area = (canvasArea: number) =>
      formatArea(canvasArea / opts.imageScale ** 2, opts.unit, opts.pixelSpacing)

    if (tool === 'angle') {
      // Click-drag the first arm, then click-drag the second arm from the vertex.
      let pts: Point[] = []
      let arm1: Konva.Line | null = null
      let arm2: Konva.Line | null = null
      let text: Konva.Text | null = null
      let dragging = false
      stage.on('mousedown.measure touchstart.measure', () => {
        const pos = pointer()
        if (!pos) return
        dragging = true
        if (pts.length === 0) {
          pts = [pos]
          arm1 = new Konva.Line({ points: [pos.x, pos.y, pos.x, pos.y], stroke: STROKE, strokeWidth: 2 })
          layer.add(arm1)
        } else if (pts.length === 2) {
          const v = pts[1]
          arm2 = new Konva.Line({ points: [v.x, v.y, pos.x, pos.y], stroke: STROKE, strokeWidth: 2 })
          text = label({ x: v.x + 10, y: v.y })
          layer.add(arm2, text)
        }
        layer.batchDraw()
      })
      stage.on('mousemove.measure touchmove.measure', () => {
        const pos = pointer()
        if (!pos || !dragging) return
        if (pts.length === 1 && arm1) {
          arm1.points([pts[0].x, pts[0].y, pos.x, pos.y])
        } else if (pts.length === 2 && arm2 && text) {
          const v = pts[1]
          arm2.points([v.x, v.y, pos.x, pos.y])
          text.text(`${Math.round(angleAt(pts[0], v, pos))}°`)
        }
        layer.batchDraw()
      })
      stage.on('mouseup.measure touchend.measure', () => {
        const pos = pointer()
        dragging = false
        if (!pos) return
        if (pts.length === 1) pts.push(pos) // end of arm 1 becomes the vertex
        else pts = [] // angle finished; next click starts a new one
      })
      return
    }

    let drawing = false
    let start: Point = { x: 0, y: 0 }
    let shape: Konva.Shape | null = null
    let text: Konva.Text | null = null

    stage.on('mousedown.measure touchstart.measure', () => {
      const pos = pointer()
      if (!pos) return
      drawing = true
      start = pos
      const common = { x: pos.x, y: pos.y, stroke: STROKE, strokeWidth: 2 }
      if (tool === 'line') shape = new Konva.Line({ ...common, x: 0, y: 0, points: [pos.x, pos.y, pos.x, pos.y] })
      else if (tool === 'circle') shape = new Konva.Circle({ ...common, radius: 0, dash: [5, 5] })
      else shape = new Konva.Ellipse({ ...common, radiusX: 0, radiusY: 0, dash: [5, 5] })
      text = label(pos)
      layer.add(shape, text)
      layer.batchDraw()
    })

    stage.on('mousemove.measure touchmove.measure', () => {
      if (!drawing || !shape || !text) return
      const pos = pointer()
      if (!pos) return
      if (shape instanceof Konva.Line) {
        shape.points([start.x, start.y, pos.x, pos.y])
        text.text(len(distance(start, pos)))
        text.position({ x: (start.x + pos.x) / 2, y: (start.y + pos.y) / 2 - 20 })
      } else if (shape instanceof Konva.Circle) {
        const m = circleMetrics(distance(start, pos))
        shape.radius(m.radius)
        text.text(`Radius: ${len(m.radius)}\nCircumference: ${len(m.circumference)}\nArea: ${area(m.area)}`)
        text.position({ x: start.x - text.width() / 2, y: start.y - m.radius - 50 })
      } else if (shape instanceof Konva.Ellipse) {
        const m = ellipseMetrics(Math.abs(pos.x - start.x), Math.abs(pos.y - start.y))
        shape.radiusX(m.radiusX)
        shape.radiusY(m.radiusY)
        text.text(
          `Radius X: ${len(m.radiusX)}\nRadius Y: ${len(m.radiusY)}\n` +
            `Circumference: ${len(m.circumference)}\nArea: ${area(m.area)}`
        )
        text.position({ x: start.x - text.width() / 2, y: start.y - m.radiusY - 70 })
      }
      layer.batchDraw()
    })

    stage.on('mouseup.measure touchend.measure', () => {
      drawing = false
      shape = null
      text = null
    })
  }

  return { attach, detach }
}
