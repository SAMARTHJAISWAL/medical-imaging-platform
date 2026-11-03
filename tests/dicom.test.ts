import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  autoWindow,
  firstNumber,
  formatDicomDate,
  readModalityValues,
  windowToRgba,
  type DicomPixelInfo
} from '../utils/dicom.ts'

const info = (over: Partial<DicomPixelInfo> = {}): DicomPixelInfo => ({
  rows: 1,
  columns: 2,
  bitsAllocated: 16,
  pixelRepresentation: 0,
  samplesPerPixel: 1,
  photometricInterpretation: 'MONOCHROME2',
  rescaleSlope: 1,
  rescaleIntercept: 0,
  ...over
})

test('formatDicomDate', () => {
  assert.equal(formatDicomDate('20240131'), '2024-01-31')
  assert.equal(formatDicomDate(undefined), 'N/A')
  assert.equal(formatDicomDate('2024'), '2024')
})

test('firstNumber takes the first of multiple values', () => {
  assert.equal(firstNumber('40\\400'), 40)
  assert.equal(firstNumber('0.5\\0.5'), 0.5)
  assert.equal(firstNumber('N/A'), undefined)
  assert.equal(firstNumber(undefined), undefined)
})

test('readModalityValues: unsigned 16-bit little endian with rescale', () => {
  const bytes = new Uint8Array([0x00, 0x04, 0x01, 0x00]) // 1024, 1
  const v = readModalityValues(bytes, info({ rescaleSlope: 1, rescaleIntercept: -1024 }))
  assert.deepEqual(Array.from(v), [0, -1023])
})

test('readModalityValues: signed 16-bit and 8-bit', () => {
  const signed = readModalityValues(new Uint8Array([0xff, 0xff, 0x00, 0x80]), info({ pixelRepresentation: 1 }))
  assert.deepEqual(Array.from(signed), [-1, -32768])
  const eight = readModalityValues(new Uint8Array([7, 200]), info({ bitsAllocated: 8 }))
  assert.deepEqual(Array.from(eight), [7, 200])
})

test('readModalityValues rejects unsupported bit depth', () => {
  assert.throws(() => readModalityValues(new Uint8Array(8), info({ bitsAllocated: 32 })))
})

test('autoWindow spans the value range', () => {
  assert.deepEqual(autoWindow(new Float32Array([-100, 300])), { center: 100, width: 400 })
  assert.deepEqual(autoWindow(new Float32Array([5, 5])), { center: 5, width: 1 })
})

test('windowToRgba maps linearly, clamps and inverts', () => {
  const out = windowToRgba(new Float32Array([-1000, 0, 50, 1000]), 50, 100)
  assert.deepEqual(Array.from(out.filter((_, i) => i % 4 === 0)), [0, 0, 128, 255])
  assert.ok(out.filter((_, i) => i % 4 === 3).every((a) => a === 255))
  const inv = windowToRgba(new Float32Array([0, 100]), 50, 100, true)
  assert.deepEqual([inv[0], inv[4]], [255, 0])
})
