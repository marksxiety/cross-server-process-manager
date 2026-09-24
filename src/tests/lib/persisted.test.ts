import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { persistedStore } from '@/lib/persisted'

interface TestState {
  items: number[]
  fetchedAt: number | null
  status: string
  load: () => void
}

const testSchema = z.object({
  items: z.array(z.number()),
  fetchedAt: z.number().nullable(),
})

function options() {
  return persistedStore<TestState, typeof testSchema>({ name: 'test-cache', schema: testSchema })
}

function currentState(): TestState {
  return { items: [], fetchedAt: null, status: 'idle', load: () => {} }
}

describe('persistedStore', () => {
  it('partializes only the schema keys', () => {
    const state: TestState = { items: [1, 2], fetchedAt: 123, status: 'success', load: () => {} }

    expect(options().partialize?.(state)).toEqual({ items: [1, 2], fetchedAt: 123 })
  })

  it('merges a valid persisted slice over the current state', () => {
    const current = currentState()

    const merged = options().merge?.({ items: [3], fetchedAt: 456 }, current)

    expect(merged).toMatchObject({ items: [3], fetchedAt: 456 })
    expect(merged?.status).toBe('idle')
  })

  it('falls back to the current state when the persisted slice is invalid', () => {
    const current: TestState = { items: [1], fetchedAt: 123, status: 'success', load: () => {} }

    expect(options().merge?.({ items: { nope: true } }, current)).toBe(current)
  })

  it('falls back to the current state when the persisted value is not an object', () => {
    const current = currentState()

    expect(options().merge?.('not-an-object', current)).toBe(current)
  })

  it('logs when rehydration reports an error', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const onRehydrate = options().onRehydrateStorage?.(currentState())
    if (typeof onRehydrate === 'function') onRehydrate(undefined, new Error('boom'))

    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
