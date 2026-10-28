import { describe, expect, test } from 'vitest'
import {
  isAuthPath,
  isAuthenticatedRedirectPath,
  isMemberPath,
} from '@/lib/auth-paths'

describe('isMemberPath', () => {
  test('matches the member-only pages', () => {
    expect(isMemberPath('/server')).toBe(true)
    expect(isMemberPath('/template')).toBe(true)
    expect(isMemberPath('/template/1')).toBe(true)
    expect(isMemberPath('/process')).toBe(true)
    expect(isMemberPath('/process/42')).toBe(true)
  })

  test('leaves the dashboard and guest-readable metrics page alone', () => {
    expect(isMemberPath('/')).toBe(false)
    expect(isMemberPath('/server/LOCAL/metrics')).toBe(false)
    expect(isMemberPath('/login')).toBe(false)
  })
})

describe('isAuthPath', () => {
  test('matches every public auth screen', () => {
    for (const path of [
      '/login',
      '/register',
      '/verify-email',
      '/forgot-password',
      '/reset-password',
      '/forbidden',
    ]) {
      expect(isAuthPath(path)).toBe(true)
    }
  })

  test('does not match application pages', () => {
    expect(isAuthPath('/')).toBe(false)
    expect(isAuthPath('/server')).toBe(false)
    expect(isAuthPath('/server/LOCAL/metrics')).toBe(false)
  })
})

describe('isAuthenticatedRedirectPath', () => {
  test('redirects authenticated users away from every auth screen', () => {
    for (const path of [
      '/login',
      '/register',
      '/verify-email',
      '/forgot-password',
      '/reset-password',
    ]) {
      expect(isAuthenticatedRedirectPath(path)).toBe(true)
    }
  })

  test('leaves the forbidden page and application pages alone', () => {
    expect(isAuthenticatedRedirectPath('/forbidden')).toBe(false)
    expect(isAuthenticatedRedirectPath('/')).toBe(false)
    expect(isAuthenticatedRedirectPath('/server')).toBe(false)
    expect(isAuthenticatedRedirectPath('/process')).toBe(false)
  })
})
