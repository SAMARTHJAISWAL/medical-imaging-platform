import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  angleAt,
  circleMetrics,
  convertLength,
  distance,
  ellipseMetrics,
  formatArea,
  formatLength
} from '../utils/measurements.ts'

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`)

test('distance is euclidean', () => {
  assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5)
})

test('convertLength applies pixel spacing', () => {
  assert.equal(convertLength(100, 'px', 0.5), 100)
  assert.equal(convertLength(100, 'mm', 0.5), 50)
  assert.equal(convertLength(100, 'cm', 0.5), 5)
})

test('formatLength / formatArea', () => {
  assert.equal(formatLength(10.4, 'px'), '10 px')
  assert.equal(formatLength(10, 'mm', 0.25), '2.5 mm')
  assert.equal(formatLength(100, 'cm', 0.5), '5.00 cm')
  assert.equal(formatArea(100, 'mm', 0.5), '25.0 mm²')
  assert.equal(formatArea(400, 'cm', 1), '4.00 cm²')
})

test('circleMetrics', () => {
  const m = circleMetrics(2)
  close(m.circumference, 4 * Math.PI)
  close(m.area, 4 * Math.PI)
})

test('ellipseMetrics reduces to a circle and handles zero size', () => {
  const m = ellipseMetrics(3, 3)
  close(m.circumference, 6 * Math.PI)
  close(m.area, 9 * Math.PI)
  assert.deepEqual(ellipseMetrics(0, 0), { radiusX: 0, radiusY: 0, circumference: 0, area: 0 })
  // Ramanujan II is within 1e-4 relative for a 2:1 ellipse (exact ≈ 9.688448)
  close(ellipseMetrics(2, 1).circumference, 9.688448, 1e-3)
})

test('angleAt returns the interior angle in degrees', () => {
  const v = { x: 0, y: 0 }
  close(angleAt({ x: 1, y: 0 }, v, { x: 0, y: 1 }), 90)
  close(angleAt({ x: 1, y: 0 }, v, { x: -1, y: 0 }), 180)
  close(angleAt({ x: 1, y: 0 }, v, { x: 1, y: -1 }), 45)
  // wraps across the ±180° seam
  close(angleAt({ x: -1, y: 0.0001 }, v, { x: -1, y: -0.0001 }), 0.011459, 1e-4)
})
