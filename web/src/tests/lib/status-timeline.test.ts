import { describe, expect, test } from 'vitest'
import {
    buildStatusTimeline,
    hasStatusTimelineData,
    type BuildStatusTimelineOptions,
} from '../../lib/status-timeline'
import { formatSeriesLabel, seriesIdentity } from '../../lib/prometheus'
import { STATUS_COLOR_VAR, STATUS_TEXT_COLOR_VAR } from '../../lib/status-chart'
import { STATUS_ORDER } from '../../lib/status-catalog'
import type {
    PrometheusSeries,
    ResolvedMetricsRange,
    StatusTimelineData,
    StatusTimelineKind,
    StatusTimelineProcess,
    StatusTimelineSegment,
} from '../../types/prometheus'

const STEP_MS = 15_000

function range(endMs: number, startMs = 0): ResolvedMetricsRange {
    return { start: startMs, end: endMs, step: STEP_MS / 1000 }
}

function seriesAt(
    name: string,
    points: Array<[timestamp: number, value: number]>,
): PrometheusSeries {
    return {
        metric: { name, namespace: 'XPM' },
        points: points.map(([timestamp, value]) => ({ timestamp, value })),
    }
}

function series(name: string, values: number[], startMs = 0): PrometheusSeries {
    return seriesAt(
        name,
        values.map((value, index) => [startMs + index * STEP_MS, value]),
    )
}

function asProcess(series: PrometheusSeries): StatusTimelineProcess {
    return {
        label: formatSeriesLabel(series),
        identity: seriesIdentity(series.metric),
    }
}

function build(
    seriesList: PrometheusSeries[],
    processes: StatusTimelineProcess[],
    options: BuildStatusTimelineOptions,
) {
    return buildStatusTimeline(seriesList, processes, options)
}

function summary(seriesList: PrometheusSeries[]) {
    const process = seriesList[0]!
    return build(seriesList, [asProcess(process)], {
        range: range(90_000),
    }).segments.map(({ kind, start, end }) => ({ kind, start, end }))
}

describe('buildStatusTimeline', () => {
    test('builds a lane per process and one segment per status sample', () => {
        const entry = series('api', [9, 9, 9, 9])

        const data = build([entry], [asProcess(entry)], {
            range: range(60_000),
        })

        expect(data.lanes).toEqual([
            {
                id: seriesIdentity(entry.metric),
                label: 'XPM · api',
                index: 0,
            },
        ])
        expect(data.segments).toEqual([
            {
                laneId: seriesIdentity(entry.metric),
                laneIndex: 0,
                kind: 'online',
                code: 9,
                start: 0,
                end: 15_000,
            },
            {
                laneId: seriesIdentity(entry.metric),
                laneIndex: 0,
                kind: 'online',
                code: 9,
                start: 15_000,
                end: 30_000,
            },
            {
                laneId: seriesIdentity(entry.metric),
                laneIndex: 0,
                kind: 'online',
                code: 9,
                start: 30_000,
                end: 45_000,
            },
            {
                laneId: seriesIdentity(entry.metric),
                laneIndex: 0,
                kind: 'online',
                code: 9,
                start: 45_000,
                end: 60_000,
            },
        ])
    })

    test('turns a scrape gap into a no-data segment', () => {
        const entry = seriesAt('api', [
            [0, 9],
            [15_000, 9],
            [60_000, 9],
            [75_000, 9],
        ])

        expect(summary([entry])).toEqual([
            { kind: 'online', start: 0, end: 15_000 },
            { kind: 'online', start: 15_000, end: 30_000 },
            { kind: 'no_data', start: 30_000, end: 60_000 },
            { kind: 'online', start: 60_000, end: 75_000 },
            { kind: 'online', start: 75_000, end: 90_000 },
        ])
    })

    test('marks leading and trailing missing data', () => {
        const entry = seriesAt('api', [
            [30_000, 9],
            [45_000, 9],
        ])

        const data = build([entry], [asProcess(entry)], {
            range: range(120_000),
        })

        expect(
            data.segments.map(({ kind, start, end }) => ({ kind, start, end })),
        ).toEqual([
            { kind: 'no_data', start: 0, end: 30_000 },
            { kind: 'online', start: 30_000, end: 45_000 },
            { kind: 'online', start: 45_000, end: 60_000 },
            { kind: 'no_data', start: 60_000, end: 120_000 },
        ])
    })

    test('reports a restart marker without merging status samples', () => {
        const entry = series('api', [9, 9, 9])
        const identity = seriesIdentity(entry.metric)

        const data = build([entry], [asProcess(entry)], {
            range: range(45_000),
            restarts: new Map([[identity, [15_000]]]),
        })

        expect(
            data.segments.map(({ kind, start, end }) => ({ kind, start, end })),
        ).toEqual([
            { kind: 'online', start: 0, end: 15_000 },
            { kind: 'online', start: 15_000, end: 30_000 },
            { kind: 'online', start: 30_000, end: 45_000 },
        ])
        expect(data.restarts).toEqual([
            {
                laneId: identity,
                laneIndex: 0,
                timestamp: 15_000,
            },
        ])
    })

    test('maps out-of-catalog status codes to unknown', () => {
        const entry = series('api', [42, 42])

        const data = build([entry], [asProcess(entry)], {
            range: range(30_000),
        })

        expect(data.segments[0]).toMatchObject({
            kind: 'unknown',
            code: 42,
        })
    })

    test('adds a no-data lane for processes without status samples', () => {
        const entry = series('api', [9, 9])

        const data = build(
            [entry],
            [
                asProcess(entry),
                { label: 'XPM · worker', identity: 'worker-identity' },
            ],
            { range: range(30_000) },
        )

        expect(data.lanes.map((lane) => lane.label)).toEqual([
            'XPM · api',
            'XPM · worker',
        ])
        expect(data.segments).toEqual([
            {
                laneId: seriesIdentity(entry.metric),
                laneIndex: 0,
                kind: 'online',
                code: 9,
                start: 0,
                end: 15_000,
            },
            {
                laneId: seriesIdentity(entry.metric),
                laneIndex: 0,
                kind: 'online',
                code: 9,
                start: 15_000,
                end: 30_000,
            },
            {
                laneId: 'worker-identity',
                laneIndex: 1,
                kind: 'no_data',
                code: null,
                start: 0,
                end: 30_000,
            },
        ])
    })

    test('clamps segments to the requested range', () => {
        const entry = seriesAt('api', [
            [0, 9],
            [15_000, 9],
            [30_000, 9],
            [45_000, 9],
            [60_000, 9],
            [75_000, 9],
        ])

        const data = build([entry], [asProcess(entry)], {
            range: range(60_000, 30_000),
        })

        expect(
            data.segments.map(({ kind, start, end }) => ({ kind, start, end })),
        ).toEqual([
            { kind: 'online', start: 30_000, end: 45_000 },
            { kind: 'online', start: 45_000, end: 60_000 },
        ])
    })

    test('returns empty data when there are no lanes', () => {
        expect(build([], [], { range: range(60_000) })).toEqual({
            lanes: [],
            segments: [],
            restarts: [],
            start: 0,
            end: 0,
            stepMs: null,
        })
    })
})

function timelineWith(
    segments: StatusTimelineSegment[],
): StatusTimelineData {
    return {
        lanes: [],
        segments,
        restarts: [],
        start: 0,
        end: 1,
        stepMs: null,
    }
}

function segment(kind: StatusTimelineKind): StatusTimelineSegment {
    return {
        laneId: 'lane',
        laneIndex: 0,
        kind,
        code: kind === 'no_data' ? null : 9,
        start: 0,
        end: 1,
    }
}

describe('hasStatusTimelineData', () => {
    test('is false when there are no segments', () => {
        expect(hasStatusTimelineData(timelineWith([]))).toBe(false)
    })

    test('is false when every segment is no_data', () => {
        expect(
            hasStatusTimelineData(
                timelineWith([segment('no_data'), segment('no_data')]),
            ),
        ).toBe(false)
    })

    test('is true for a real status segment', () => {
        expect(hasStatusTimelineData(timelineWith([segment('online')]))).toBe(
            true,
        )
    })

    test('is true when real status and no_data segments are mixed', () => {
        expect(
            hasStatusTimelineData(
                timelineWith([segment('online'), segment('no_data')]),
            ),
        ).toBe(true)
    })
})

describe('status chart colors', () => {
    test('defines a color token for every effective status', () => {
        const expected = [...STATUS_ORDER].sort()

        expect(Object.keys(STATUS_COLOR_VAR).sort()).toEqual(expected)
        expect(Object.keys(STATUS_TEXT_COLOR_VAR).sort()).toEqual(expected)
    })
})
