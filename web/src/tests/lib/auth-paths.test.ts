import { describe, expect, test } from 'vitest'
import { isAuthPath, isCredentialPath, isMemberPath } from '@/lib/auth-paths'

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

describe('isCredentialPath', () => {
  test('only redirects authenticated users away from login and register', () => {
    expect(isCredentialPath('/login')).toBe(true)
    expect(isCredentialPath('/register')).toBe(true)
    expect(isCredentialPath('/forgot-password')).toBe(false)
    expect(isCredentialPath('/')).toBe(false)
  })
})
