import { describe, expect, test } from 'vitest'
import { toMetricChartSeries } from '../../lib/metric-chart'
import type { PrometheusSeries } from '../../types/prometheus'

function series(name: string, values: number[]): PrometheusSeries {
    return {
        metric: { name, namespace: 'XPM' },
        points: values.map((value, index) => ({
            timestamp: index * 15_000,
            value,
        })),
    }
}

describe('toMetricChartSeries', () => {
    test('uses the resolved label as a stable id', () => {
        const result = toMetricChartSeries([series('api', [1, 2])], {
            color: '#3b82f6',
            label: () => 'XPM · api',
        })

        expect(result).toEqual([
            {
                id: 'XPM · api',
                name: 'XPM · api',
                color: '#3b82f6',
                stepped: undefined,
                filled: undefined,
                dashed: undefined,
                points: [
                    [0, 1],
                    [15_000, 2],
                ],
            },
        ])
    })

    test('falls back to the metric name and maps values', () => {
        const result = toMetricChartSeries([series('worker', [10, 20])], {
            color: () => '#f59e0b',
            valueMapper: (value) => value * 2,
        })

        expect(result[0]).toMatchObject({
            id: 'worker',
            name: 'worker',
            color: '#f59e0b',
            points: [
                [0, 20],
                [15_000, 40],
            ],
        })
    })

    test('skips series without points', () => {
        expect(
            toMetricChartSeries([series('empty', [])], { color: '#000' }),
        ).toEqual([])
        expect(toMetricChartSeries(undefined, { color: '#000' })).toEqual([])
    })
})
