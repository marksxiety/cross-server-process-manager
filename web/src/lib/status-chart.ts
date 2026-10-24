import type { EffectiveStatus } from '@/types/process'

/**
 * CSS custom properties that hold the canonical status colors.
 * The chart layer resolves these through `useChartTheme` so the timeline,
 * badges, and thresholds all share one palette.
 */
export const STATUS_COLOR_VAR: Record<EffectiveStatus, string> = {
  errored: '--status-errored',
  failed_exit: '--status-failed-exit',
  degraded: '--status-degraded',
  waiting_restart: '--status-waiting-restart',
  transitioning: '--status-transitioning',
  stopped_manual: '--status-stopped-manual',
  scheduled_idle: '--status-scheduled-idle',
  completed: '--status-completed',
  online: '--status-online',
  unknown: '--status-unknown',
}

export const STATUS_TEXT_COLOR_VAR: Record<EffectiveStatus, string> = {
  errored: '--status-errored-text',
  failed_exit: '--status-failed-exit-text',
  degraded: '--status-degraded-text',
  waiting_restart: '--status-waiting-restart-text',
  transitioning: '--status-transitioning-text',
  stopped_manual: '--status-stopped-manual-text',
  scheduled_idle: '--status-scheduled-idle-text',
  completed: '--status-completed-text',
  online: '--status-online-text',
  unknown: '--status-unknown-text',
}
