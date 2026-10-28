import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import { vi, type Mock } from 'vitest';
import { handleException } from '../../src/Exceptions/Handler';

export type MockResponse = Response & { status: Mock; json: Mock };

export function createRequest(overrides: {
    params?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
}): Request {
    return {
        params: overrides.params ?? {},
        query: overrides.query ?? {},
        body: overrides.body ?? {},
    } as unknown as Request;
}

export function createResponse(): MockResponse {
    const emitter = new EventEmitter();
    const res = {
        status: vi.fn(),
        json: vi.fn(),
        once: emitter.once.bind(emitter),
        locals: {},
    };
    res.status.mockReturnValue(res);
    res.json.mockImplementation(() => {
        // Mirror Express: a response that has been written emits `finish`.
        emitter.emit('finish');
        return res;
    });
    return res as unknown as MockResponse;
}

export function responseBody(res: MockResponse): Record<string, unknown> {
    return res.json.mock.calls.at(-1)?.[0] as Record<string, unknown>;
}

export async function invoke(
    handler: (req: Request, res: Response) => Promise<void>,
    req: Request,
    res: MockResponse
): Promise<void> {
    try {
        await handler(req, res);
    } catch (error) {
        handleException(error, req, res, (() => undefined) as NextFunction);
    }
}
