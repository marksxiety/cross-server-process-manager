import { describe, expect, test } from 'vitest'
import { findRestartTimestamps } from '../../lib/metric-restart'
import type { MetricsData, PrometheusSeries } from '../../types/prometheus'

function series(
    metric: string,
    name: string,
    values: number[],
): PrometheusSeries {
    return {
        metric: { __name__: metric, name, namespace: 'XPM' },
        points: values.map((value, index) => ({
            timestamp: index * 15_000,
            value,
        })),
    }
}

describe('findRestartTimestamps', () => {
    test('detects a restart when uptime decreases', () => {
        const data: MetricsData = {
            pm2_uptime: [series('pm2_uptime', 'api', [3600, 3615, 2])],
        }

        expect(findRestartTimestamps(data)).toEqual(
            new Map([['name="api",namespace="XPM"', [30_000]]]),
        )
    })

    test('detects a restart when the start time changes', () => {
        const data: MetricsData = {
            pm2_start_time_seconds: [
                series('pm2_start_time_seconds', 'api', [1000, 1000, 2000]),
            ],
        }

        expect(findRestartTimestamps(data)).toEqual(
            new Map([['name="api",namespace="XPM"', [30_000]]]),
        )
    })

    test('merges and deduplicates signals for the same series', () => {
        const data: MetricsData = {
            pm2_uptime: [series('pm2_uptime', 'api', [3600, 3615, 2])],
            pm2_start_time_seconds: [
                series('pm2_start_time_seconds', 'api', [1000, 1000, 2000]),
            ],
        }

        expect(findRestartTimestamps(data)).toEqual(
            new Map([['name="api",namespace="XPM"', [30_000]]]),
        )
    })

    test('keeps restarts scoped to their own series', () => {
        const data: MetricsData = {
            pm2_uptime: [
                series('pm2_uptime', 'api', [3600, 2, 17]),
                series('pm2_uptime', 'worker', [10, 25, 40]),
            ],
        }

        expect(findRestartTimestamps(data)).toEqual(
            new Map([['name="api",namespace="XPM"', [15_000]]]),
        )
    })

    test('ignores unknown start times reported as zero', () => {
        const data: MetricsData = {
            pm2_start_time_seconds: [
                series('pm2_start_time_seconds', 'api', [1000, 0, 1000]),
            ],
        }

        expect(findRestartTimestamps(data)).toEqual(new Map())
    })

    test('ignores missing metrics and the first sample', () => {
        expect(findRestartTimestamps({})).toEqual(new Map())
        expect(
            findRestartTimestamps({
                pm2_uptime: [series('pm2_uptime', 'api', [42])],
            }),
        ).toEqual(new Map())
    })

    test('does not report restarts for steady signals', () => {
        const data: MetricsData = {
            pm2_uptime: [series('pm2_uptime', 'api', [10, 25, 40])],
            pm2_start_time_seconds: [
                series('pm2_start_time_seconds', 'api', [1000, 1000, 1000]),
            ],
        }

        expect(findRestartTimestamps(data)).toEqual(new Map())
    })
})
