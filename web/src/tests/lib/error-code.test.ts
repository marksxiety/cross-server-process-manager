import { describe, expect, test } from 'vitest'
import {
  errorCodeLabel,
  toApiError,
  toUnreachableError,
  UNKNOWN_ERROR_CODE,
  UNREACHABLE_ERROR_CODE,
} from '../../lib/error-code'

describe('toApiError', () => {
  test('keeps the server-provided code, message and status', () => {
    const error = toApiError({
      code: 'DUPLICATE_SERVER',
      message: 'Server "alpha" is already registered',
      status: 409,
    })

    expect(error).toEqual({
      code: 'DUPLICATE_SERVER',
      message: 'Server "alpha" is already registered',
      status: 409,
    })
  })

  test('synthesizes UNREACHABLE when the envelope has no code and status is 0', () => {
    const error = toApiError({ code: undefined, message: 'fetch failed', status: 0 })

    expect(error.code).toBe(UNREACHABLE_ERROR_CODE)
    expect(error.message).toBe('fetch failed')
    expect(error.status).toBe(0)
  })

  test('synthesizes UNKNOWN when the envelope has no code and status is non-zero', () => {
    const error = toApiError({ code: undefined, message: 'Bad gateway', status: 502 })

    expect(error.code).toBe(UNKNOWN_ERROR_CODE)
    expect(error.status).toBe(502)
  })
})

describe('toUnreachableError', () => {
  test('wraps an Error cause with the UNREACHABLE code and status 0', () => {
    const error = toUnreachableError(new Error('Network error reaching host:4000'))

    expect(error).toEqual({
      code: UNREACHABLE_ERROR_CODE,
      message: 'Network error reaching host:4000',
      status: 0,
    })
  })

  test('stringifies a non-Error cause', () => {
    const error = toUnreachableError('socket closed')

    expect(error.code).toBe(UNREACHABLE_ERROR_CODE)
    expect(error.message).toBe('socket closed')
  })
})

describe('errorCodeLabel', () => {
  test('labels codes emitted by the manager server', () => {
    expect(errorCodeLabel('INVALID_ID')).toBe('Invalid id')
    expect(errorCodeLabel('DUPLICATE_SERVER')).toBe('Server already registered')
    expect(errorCodeLabel('DUPLICATE_HOST')).toBe('Host already registered')
    expect(errorCodeLabel('DUPLICATE_TEMPLATE')).toBe('Template already registered')
    expect(errorCodeLabel('DATABASE_UNAVAILABLE')).toBe('Database unavailable')
  })

  test('falls back to the code itself when no label exists', () => {
    expect(errorCodeLabel('SOME_NEW_CODE')).toBe('SOME_NEW_CODE')
  })

  test('falls back to a connection error label when the code is missing', () => {
    expect(errorCodeLabel(undefined)).toBe('Connection error')
  })
})
