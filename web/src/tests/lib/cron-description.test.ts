import { describe, expect, it } from 'vitest'
import { describeCron } from '@/lib/cron-description'

describe('describeCron', () => {
  it('returns empty for blank or non-string input', () => {
    expect(describeCron('')).toEqual({ status: 'empty' })
    expect(describeCron('   ')).toEqual({ status: 'empty' })
    expect(describeCron(undefined)).toEqual({ status: 'empty' })
    expect(describeCron(5)).toEqual({ status: 'empty' })
  })

  it('translates common expressions into words', () => {
    expect(describeCron('*/5 * * * *')).toEqual({ status: 'valid', text: 'Every 5 minutes' })
    expect(describeCron('0 10 * * 0,6')).toEqual({
      status: 'valid',
      text: 'At 10:00 AM, only on Sunday and Saturday',
    })
    expect(describeCron('0 2 * * *')).toEqual({ status: 'valid', text: 'At 02:00 AM' })
  })

  it('reports invalid expressions instead of throwing', () => {
    expect(describeCron('not-a-cron')).toEqual({ status: 'invalid' })
    expect(describeCron('99 99 * * *')).toEqual({ status: 'invalid' })
  })
})
