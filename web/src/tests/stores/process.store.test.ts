import { beforeEach, describe, expect, it } from 'vitest'
import { clearDisabledValues, createDefaultValues } from '@/lib/process-fields'
import { useProcessStore } from '@/stores/process.store'
import type { ProcessTemplate } from '@/types/template'

function templateWith(values: Record<string, unknown>): ProcessTemplate {
  return {
    id: 1,
    template_name: 'fixture',
    category: null,
    description: null,
    preview: null,
    is_active: true,
    values,
  }
}

beforeEach(() => {
  useProcessStore.setState({
    step: 1,
    server: null,
    template: 'none',
    values: clearDisabledValues(createDefaultValues()),
    dirtyKeys: new Set<string>(),
    status: 'idle',
    requestError: null,
    issues: [],
    started: null,
  })
})

describe('process store defaults', () => {
  it('starts from the seeded PM2 defaults, dimmed fields excluded', () => {
    expect(useProcessStore.getState().values).toEqual(clearDisabledValues(createDefaultValues()))
    expect(useProcessStore.getState().values).toMatchObject({
      autorestart: true,
      max_restarts: 5,
      min_uptime: 1000,
      restart_delay: 0,
      kill_timeout: 1600,
      watch: false,
      windowsHide: true,
      exec_mode: 'fork',
    })
  })

  it('restores dependent defaults when a toggle is turned back on', () => {
    const { setValue } = useProcessStore.getState()

    setValue('autorestart', false)
    expect(useProcessStore.getState().values.max_restarts).toBeUndefined()

    setValue('autorestart', true)
    expect(useProcessStore.getState().values).toMatchObject({
      max_restarts: 5,
      min_uptime: 1000,
      restart_delay: 0,
    })

    setValue('watch', true)
    expect(useProcessStore.getState().values.watch_delay).toBe(0)
  })

  it('keeps defaults a template does not override', () => {
    useProcessStore.getState().selectTemplate(templateWith({ script: 'app.py' }))

    const { values } = useProcessStore.getState()
    expect(values.script).toBe('app.py')
    expect(values.kill_timeout).toBe(1600)
    expect(values.windowsHide).toBe(true)
    expect(values.exec_mode).toBe('fork')
  })
})

describe('process store disabled-value clearing', () => {
  it('clears dependent values and their dirty marks when a toggle turns them off', () => {
    const { setValue } = useProcessStore.getState()

    setValue('restart_delay', '4000')
    setValue('autorestart', false)

    const { values, dirtyKeys } = useProcessStore.getState()
    expect(values).toEqual({
      autorestart: false,
      kill_timeout: 1600,
      watch: false,
      windowsHide: true,
      exec_mode: 'fork',
    })
    expect(dirtyKeys.has('restart_delay')).toBe(false)
    expect(dirtyKeys.has('autorestart')).toBe(true)
  })

  it('drops conflicting values when a template is selected', () => {
    useProcessStore
      .getState()
      .selectTemplate(templateWith({ autorestart: true, cron_restart: '*/5 * * * *' }))

    const { values } = useProcessStore.getState()
    expect(values.cron_restart).toBeUndefined()
    expect(values.autorestart).toBe(true)
    expect(values.max_restarts).toBe(5)
  })

  it('lets a later template prefill a key whose value the rules cleared', () => {
    const { setValue, selectTemplate } = useProcessStore.getState()

    setValue('restart_delay', 'soon')
    selectTemplate(templateWith({ autorestart: false }))
    selectTemplate(templateWith({ autorestart: true, restart_delay: 2000 }))

    const { values } = useProcessStore.getState()
    expect(values.autorestart).toBe(true)
    expect(values.restart_delay).toBe(2000)
    expect(values.max_restarts).toBe(5)
  })

  it('does not restore conflicting template values on reset', () => {
    useProcessStore.setState({ template: templateWith({ exec_mode: 'fork', instances: 4 }) })

    useProcessStore.getState().reset()

    const { values } = useProcessStore.getState()
    expect(values.instances).toBeUndefined()
    expect(values.exec_mode).toBe('fork')
    expect(values.max_restarts).toBe(5)
  })
})
