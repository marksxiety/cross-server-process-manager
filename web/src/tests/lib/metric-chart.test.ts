import { describe, expect, test } from 'vitest'
import {
    maxNumericValue,
    niceCpuProcessMax,
    nicePercentMax,
    percentAxisFormatter,
    toMetricChartSeries,
} from '../../lib/metric-chart'
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

describe('chart axis helpers', () => {
    test('finds the maximum numeric value', () => {
        const chartSeries = toMetricChartSeries(
            [series('a', [1, 9]), series('b', [3, 4])],
            { color: '#000' },
        )

        expect(maxNumericValue(chartSeries)).toBe(9)
        expect(maxNumericValue([])).toBe(0)
    })

    test('rounds percentage axes to a readable maximum', () => {
        expect(nicePercentMax(0.6)).toBe(1)
        expect(nicePercentMax(18)).toBe(20)
        expect(nicePercentMax(95)).toBe(100)
        expect(nicePercentMax(0, 5)).toBe(5)
    })

    test('uses decimals only for small percentage axes', () => {
        expect(percentAxisFormatter(1)(0.5)).toBe('0.5%')
        expect(percentAxisFormatter(20)(10)).toBe('10%')
    })

    test('allows process CPU axes above 100', () => {
        expect(niceCpuProcessMax(80)).toBe(100)
        expect(niceCpuProcessMax(320)).toBe(400)
        expect(niceCpuProcessMax(700)).toBe(1000)
    })
})
