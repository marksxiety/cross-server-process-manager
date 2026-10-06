import { describe, expect, test } from 'vitest'
import {
  canRunProcessCommand,
  isNodeClusterProcess,
  isTransientProcessStatus,
} from '../../lib/process-runtime'
import type { ProcessCommand, ProcessCommandTarget, ProcessStatus } from '../../types/process'

function target(overrides: Partial<ProcessCommandTarget> = {}): ProcessCommandTarget {
  return {
    pm_id: 3,
    status: 'online',
    interpreter: 'C:\\Program Files\\nodejs\\node.exe',
    exec_mode: 'cluster_mode',
    ...overrides,
  }
}

describe('isTransientProcessStatus', () => {
  test('is true only for stopping and launching', () => {
    expect(isTransientProcessStatus('stopping')).toBe(true)
    expect(isTransientProcessStatus('launching')).toBe(true)
    expect(isTransientProcessStatus('online')).toBe(false)
    expect(isTransientProcessStatus('stopped')).toBe(false)
    expect(isTransientProcessStatus('errored')).toBe(false)
  })
})

describe('isNodeClusterProcess', () => {
  test('accepts node/node.exe on any path case-insensitively', () => {
    expect(isNodeClusterProcess(target())).toBe(true)
    expect(isNodeClusterProcess(target({ interpreter: '/usr/bin/node' }))).toBe(true)
    expect(isNodeClusterProcess(target({ interpreter: 'C:\\NODEJS\\NODE.EXE' }))).toBe(true)
  })

  test('rejects non-node interpreters and fork mode', () => {
    expect(isNodeClusterProcess(target({ interpreter: 'C:\\bun\\bun.exe' }))).toBe(false)
    expect(isNodeClusterProcess(target({ interpreter: 'C:\\Python312\\python.exe' }))).toBe(false)
    expect(isNodeClusterProcess(target({ interpreter: 'none' }))).toBe(false)
    expect(isNodeClusterProcess(target({ exec_mode: 'fork_mode' }))).toBe(false)
  })
})

describe('canRunProcessCommand', () => {
  const cases: Array<[ProcessStatus, ProcessCommand, boolean]> = [
    ['online', 'start', false],
    ['online', 'stop', true],
    ['online', 'restart', true],
    ['online', 'reload', true],
    ['online', 'delete', true],
    ['stopped', 'start', true],
    ['stopped', 'stop', false],
    ['stopped', 'restart', true],
    ['stopped', 'reload', false],
    ['stopped', 'delete', true],
    ['errored', 'start', true],
    ['errored', 'stop', false],
    ['errored', 'restart', true],
    ['errored', 'reload', false],
    ['errored', 'delete', true],
    ['stopping', 'start', false],
    ['stopping', 'stop', false],
    ['stopping', 'restart', false],
    ['stopping', 'reload', false],
    ['stopping', 'delete', true],
    ['launching', 'start', false],
    ['launching', 'stop', false],
    ['launching', 'restart', false],
    ['launching', 'reload', false],
    ['launching', 'delete', true],
  ]

  test.each(cases)('status %s allows %s → %s', (status, command, expected) => {
    expect(canRunProcessCommand(target({ status }), command)).toBe(expected)
  })

  test('reload is hidden for online node processes in fork mode', () => {
    expect(canRunProcessCommand(target({ exec_mode: 'fork_mode' }), 'reload')).toBe(false)
    expect(canRunProcessCommand(target({ interpreter: '/usr/bin/python3' }), 'reload')).toBe(false)
  })
})
