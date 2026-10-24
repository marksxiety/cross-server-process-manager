/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')

type Rgb = [number, number, number]
type Cvd = 'deuter' | 'protan' | 'tritan'

const PALETTE_SIZE = 8
const DARK_CARD: Rgb = [0x26 / 255, 0x26 / 255, 0x26 / 255]

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? ''
}

function paletteFrom(scheme: string): string[] {
  const source = block(scheme)
  const colors: string[] = []

  for (let index = 1; index <= PALETTE_SIZE; index += 1) {
    const match = new RegExp(
      `--chart-series-${index}:\\s*(#[0-9a-fA-F]{6})`,
    ).exec(source)
    expect(match?.[1], `--chart-series-${index} in ${scheme}`).toBeTruthy()
    colors.push(match![1]!)
  }

  return colors
}

function hexToRgb(hex: string): Rgb {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ]
}

function linearize(value: number): number {
  return value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4)
}

function delinearize(value: number): number {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
}

function luminance([r, g, b]: Rgb): number {
  return (
    0.2126 * linearize(r) +
    0.7152 * linearize(g) +
    0.0722 * linearize(b)
  )
}

function contrast(a: Rgb, b: Rgb): number {
  const l1 = luminance(a)
  const l2 = luminance(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

const LMS = [
  [0.31399022, 0.63951294, 0.04649755],
  [0.15537241, 0.75789446, 0.08670142],
  [0.01775239, 0.10944209, 0.87256922],
]

const LMS_INVERSE = [
  [5.47221206, -4.6419601, 0.16963708],
  [-1.1252419, 2.29317094, -0.1678952],
  [0.02980165, -0.19318073, 1.16364789],
]

const CVD_MATRICES: Record<Cvd, number[][]> = {
  deuter: [
    [1, 0, 0],
    [0.9513092, 0, 0.04866992],
    [0, 0, 1],
  ],
  protan: [
    [0, 1.05118294, -0.05116099],
    [0, 1, 0],
    [0, 0, 1],
  ],
  tritan: [
    [1, 0, 0],
    [0, 1, 0],
    [-0.86744736, 1.86727089, 0],
  ],
}

function multiply(matrix: number[][], vector: Rgb): Rgb {
  return matrix.map(
    (row) => row[0]! * vector[0] + row[1]! * vector[1] + row[2]! * vector[2],
  ) as Rgb
}

function simulate(rgb: Rgb, cvd: Cvd | null): Rgb {
  if (cvd === null) return rgb

  const lms = multiply(LMS, rgb.map(linearize) as Rgb)
  const shifted = multiply(CVD_MATRICES[cvd], lms)
  const back = multiply(LMS_INVERSE, shifted)

  return back.map(delinearize) as Rgb
}

function toLab(rgb: Rgb): Rgb {
  const [r, g, b] = rgb.map(linearize)
  const x = (0.4124564 * r! + 0.3575761 * g! + 0.1804375 * b!) / 0.95047
  const y = 0.2126729 * r! + 0.7151522 * g! + 0.072175 * b!
  const z = (0.0193339 * r! + 0.119192 * g! + 0.9503041 * b!) / 1.08883
  const f = (value: number) =>
    value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116
  const fx = f(x)
  const fy = f(y)
  const fz = f(z)

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

function deltaE(a: Rgb, b: Rgb): number {
  const labA = toLab(a)
  const labB = toLab(b)
  return Math.hypot(
    labA[0] - labB[0],
    labA[1] - labB[1],
    labA[2] - labB[2],
  )
}

function minimumPairwiseDeltaE(colors: string[]): number {
  let minimum = Infinity

  for (const cvd of [null, 'deuter', 'protan', 'tritan'] as const) {
    const simulated = colors.map((color) => simulate(hexToRgb(color), cvd))

    for (let i = 0; i < simulated.length; i += 1) {
      for (let j = i + 1; j < simulated.length; j += 1) {
        minimum = Math.min(minimum, deltaE(simulated[i]!, simulated[j]!))
      }
    }
  }

  return minimum
}

describe('categorical chart palette', () => {
  const light = paletteFrom(':root')
  const dark = paletteFrom('.dark')

  test('defines eight colors in both schemes', () => {
    expect(light).toHaveLength(PALETTE_SIZE)
    expect(dark).toHaveLength(PALETTE_SIZE)
  })

  test('meets non-text contrast against the card background', () => {
    const white: Rgb = [1, 1, 1]

    for (const color of light) {
      expect(contrast(hexToRgb(color), white), color).toBeGreaterThanOrEqual(3)
    }

    for (const color of dark) {
      expect(contrast(hexToRgb(color), DARK_CARD), color).toBeGreaterThanOrEqual(
        3,
      )
    }
  })

  test('keeps colors separated under simulated color-vision deficiency', () => {
    expect(minimumPairwiseDeltaE(light)).toBeGreaterThanOrEqual(5)
    expect(minimumPairwiseDeltaE(dark)).toBeGreaterThanOrEqual(5)
  })
})
