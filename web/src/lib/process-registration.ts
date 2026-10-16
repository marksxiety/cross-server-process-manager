import {
  advancedGroupFields,
  basicFields,
  type AdvancedGroupId,
  type ProcessFieldSpec,
} from './process-fields'
import type { ProcessDescribe } from '@/types/process'

/**
 * Maps each displayable registration field (the form/template catalog in
 * `process-fields.ts`, minus `UNMAPPED_FIELD_KEYS`) to where PM2 reports its
 * effective value in a `/pm2/describe/:id` payload, plus the agent/PM2 runtime
 * default used to flag values the user never set.
 *
 * `defaults` lists every raw value PM2 may report while the runtime default is
 * in effect (the first entry is the canonical one shown in the UI). Mappings
 * without `defaults` have no meaningful default and read as "not configured"
 * when PM2 reports no value.
 */
interface RegistrationMapping {
  source: 'summary' | 'describe'
  key: string
  defaults?: readonly unknown[]
}

const REGISTRATION_MAPPINGS: Record<string, RegistrationMapping> = {
  name: { source: 'summary', key: 'name' },
  namespace: { source: 'summary', key: 'namespace', defaults: ['default'] },
  cwd: { source: 'summary', key: 'cwd' },
  interpreter: { source: 'summary', key: 'interpreter' },
  script: { source: 'describe', key: 'script_path' },
  args: { source: 'describe', key: 'script_args' },

  autorestart: { source: 'summary', key: 'autorestart', defaults: [true] },
  max_restarts: { source: 'describe', key: 'max_restarts', defaults: [16] },
  min_uptime: { source: 'describe', key: 'min_uptime', defaults: [1000] },
  restart_delay: { source: 'describe', key: 'restart_delay', defaults: [0] },
  cron_restart: { source: 'summary', key: 'cron_restart' },
  max_memory_restart: { source: 'describe', key: 'max_memory_restart' },
  kill_timeout: { source: 'describe', key: 'kill_timeout', defaults: [1600] },
  watch: { source: 'summary', key: 'watch', defaults: [false] },
  ignore_watch: { source: 'describe', key: 'ignore_watch' },
  watch_delay: { source: 'describe', key: 'watch_delay', defaults: [0] },
  interpreter_args: { source: 'describe', key: 'interpreter_args' },
  // The agent registers windowsHide as true unless explicitly disabled.
  windowsHide: { source: 'describe', key: 'windowsHide', defaults: [true] },
  // PM2 reports "fork_mode"/"cluster_mode"; the form registers "fork"/"cluster".
  exec_mode: { source: 'summary', key: 'exec_mode', defaults: ['fork', 'fork_mode'] },
  instances: { source: 'summary', key: 'instances', defaults: [1] },
}

const REGISTRATION_MAPPING_KEYS: ReadonlySet<string> = new Set(
  Object.keys(REGISTRATION_MAPPINGS),
)

/**
 * Catalog fields deliberately left out of the registration view because PM2
 * does not report them in a readable form — `env` values are never exposed.
 */
const UNMAPPED_FIELD_KEYS: ReadonlySet<string> = new Set(['env'])

export { REGISTRATION_MAPPING_KEYS, UNMAPPED_FIELD_KEYS }

export interface RegistrationField {
  spec: ProcessFieldSpec
  /** Effective value: what PM2 reports, or the canonical default when unset. */
  value: unknown
  /** True when the user never set it — the agent/PM2 default is in effect. */
  isDefault: boolean
}

function reportedValue(mapping: RegistrationMapping, data: ProcessDescribe): unknown {
  const source =
    mapping.source === 'summary'
      ? (data.summary as unknown as Record<string, unknown>)
      : (data.describe as unknown as Record<string, unknown>)
  return source[mapping.key]
}

export function resolveRegistrationField(
  spec: ProcessFieldSpec,
  data: ProcessDescribe,
): RegistrationField {
  const mapping = REGISTRATION_MAPPINGS[spec.key]
  if (mapping === undefined) return { spec, value: undefined, isDefault: false }

  const reported = reportedValue(mapping, data)
  if (mapping.defaults !== undefined) {
    const isDefault =
      reported === undefined || reported === null || mapping.defaults.includes(reported)
    if (isDefault) return { spec, value: mapping.defaults[0], isDefault: true }
  }

  return { spec, value: reported ?? undefined, isDefault: false }
}

/** Registration fields of the Basic card, in catalog order. */
export function basicRegistrationFields(data: ProcessDescribe): RegistrationField[] {
  return basicFields()
    .filter((spec) => !UNMAPPED_FIELD_KEYS.has(spec.key))
    .map((spec) => resolveRegistrationField(spec, data))
}

/** Registration fields of one Advanced sub-group, in catalog order. */
export function advancedRegistrationFields(
  group: AdvancedGroupId,
  data: ProcessDescribe,
): RegistrationField[] {
  return advancedGroupFields(group)
    .filter((spec) => !UNMAPPED_FIELD_KEYS.has(spec.key))
    .map((spec) => resolveRegistrationField(spec, data))
}
