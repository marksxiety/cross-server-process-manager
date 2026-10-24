/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? ''
}

const light = block(':root')
const dark = block('.dark')

const STATUS_SLUGS = [
  'errored',
  'failed-exit',
  'degraded',
  'waiting-restart',
  'transitioning',
  'stopped-manual',
  'scheduled-idle',
  'completed',
  'online',
  'unknown',
]

const BASE_ROLES = ['', '-surface', '-text', '-border']
const THRESHOLD_TRACKS = ['online', 'waiting-restart', 'errored']

describe('status color tokens', () => {
  test('defines base, surface, text, and border roles in light and dark', () => {
    for (const slug of STATUS_SLUGS) {
      for (const role of BASE_ROLES) {
        const token = `--status-${slug}${role}:`

        expect(light, token).toContain(token)
        expect(dark, token).toContain(token)
      }
    }
  })

  test('defines donut track tokens for threshold statuses', () => {
    for (const slug of THRESHOLD_TRACKS) {
      const token = `--status-${slug}-track:`

      expect(light, token).toContain(token)
      expect(dark, token).toContain(token)
    }
  })
})
