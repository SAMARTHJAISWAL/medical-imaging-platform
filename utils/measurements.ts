// Pure geometry / unit helpers shared by the canvas measurement tools.
// Kept free of Vue/Konva imports so they can be unit tested with `node --test`.

export type MeasurementUnit = 'px' | 'mm' | 'cm'

export interface Point {
  x: number
  y: number
}

export const distance = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y)

/** Convert a length in image pixels to the given unit using pixel spacing (mm per pixel). */
export const convertLength = (pixels: number, unit: MeasurementUnit, pixelSpacing = 1): number => {
  switch (unit) {
    case 'mm':
      return pixels * pixelSpacing
    case 'cm':
      return (pixels * pixelSpacing) / 10
    default:
      return pixels
  }
}

export const formatLength = (pixels: number, unit: MeasurementUnit, pixelSpacing = 1): string => {
  const value = convertLength(pixels, unit, pixelSpacing)
  switch (unit) {
    case 'mm':
      return `${value.toFixed(1)} mm`
    case 'cm':
      return `${value.toFixed(2)} cm`
    default:
      return `${Math.round(value)} px`
  }
}

/** Format an area given in square pixels; spacing is squared for mm²/cm². */
export const formatArea = (pixels2: number, unit: MeasurementUnit, pixelSpacing = 1): string => {
  switch (unit) {
    case 'mm':
      return `${(pixels2 * pixelSpacing ** 2).toFixed(1)} mm²`
    case 'cm':
      return `${((pixels2 * pixelSpacing ** 2) / 100).toFixed(2)} cm²`
    default:
      return `${Math.round(pixels2)} px²`
  }
}

export const circleMetrics = (radius: number) => ({
  radius,
  circumference: 2 * Math.PI * radius,
  area: Math.PI * radius * radius
})

/** Ellipse perimeter via Ramanujan's second approximation. */
export const ellipseMetrics = (radiusX: number, radiusY: number) => {
  const sum = radiusX + radiusY
  if (sum === 0) return { radiusX, radiusY, circumference: 0, area: 0 }
  const h = ((radiusX - radiusY) / sum) ** 2
  return {
    radiusX,
    radiusY,
    circumference: Math.PI * sum * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h))),
    area: Math.PI * radiusX * radiusY
  }
}

/** Angle in degrees (0–180) at `vertex` between rays vertex→a and vertex→b. */
export const angleAt = (a: Point, vertex: Point, b: Point): number => {
  const a1 = Math.atan2(a.y - vertex.y, a.x - vertex.x)
  const a2 = Math.atan2(b.y - vertex.y, b.x - vertex.x)
  let deg = Math.abs(((a2 - a1) * 180) / Math.PI)
  if (deg > 180) deg = 360 - deg
  return deg
}
