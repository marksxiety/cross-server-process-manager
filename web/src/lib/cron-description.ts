import { toString as cronToString } from 'cronstrue'

export type CronDescription =
  | { status: 'empty' }
  | { status: 'valid'; text: string }
  | { status: 'invalid' }

/**
 * Translates a cron expression into words ("Every 5 minutes", "At 10:00 AM,
 * only on Sunday and Saturday"). Pure: blank or non-string input is `empty`,
 * and anything the parser rejects is `invalid` instead of throwing. Used by
 * the Schedule field preview and by submit validation.
 */
export function describeCron(expression: unknown): CronDescription {
  if (typeof expression !== 'string' || expression.trim() === '') {
    return { status: 'empty' }
  }

  try {
    return { status: 'valid', text: cronToString(expression.trim()) }
  } catch {
    return { status: 'invalid' }
  }
}
