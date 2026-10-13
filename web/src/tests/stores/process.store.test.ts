import { beforeEach, describe, expect, it } from 'vitest'
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
    values: {},
    dirtyKeys: new Set<string>(),
    status: 'idle',
    requestError: null,
    issues: [],
    started: null,
  })
})

describe('process store disabled-value clearing', () => {
  it('clears dependent values and their dirty marks when a toggle turns them off', () => {
    const { setValue } = useProcessStore.getState()

    setValue('restart_delay', '4000')
    setValue('autorestart', false)

    const { values, dirtyKeys } = useProcessStore.getState()
    expect(values).toEqual({ autorestart: false })
    expect(dirtyKeys.has('restart_delay')).toBe(false)
    expect(dirtyKeys.has('autorestart')).toBe(true)
  })

  it('drops conflicting values when a template is selected', () => {
    useProcessStore
      .getState()
      .selectTemplate(templateWith({ autorestart: true, cron_restart: '*/5 * * * *' }))

    expect(useProcessStore.getState().values).toEqual({ autorestart: true })
  })

  it('lets a later template prefill a key whose value the rules cleared', () => {
    const { setValue, selectTemplate } = useProcessStore.getState()

    setValue('restart_delay', 'soon')
    selectTemplate(templateWith({ autorestart: false }))
    selectTemplate(templateWith({ autorestart: true, restart_delay: 2000 }))

    expect(useProcessStore.getState().values).toEqual({ autorestart: true, restart_delay: 2000 })
  })

  it('does not restore conflicting template values on reset', () => {
    useProcessStore.setState({ template: templateWith({ exec_mode: 'fork', instances: 4 }) })

    useProcessStore.getState().reset()

    expect(useProcessStore.getState().values).toEqual({ exec_mode: 'fork' })
  })
})
