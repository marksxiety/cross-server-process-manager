import type { Response } from 'express';

export interface ApiEnvelope<T = unknown> {
    success: boolean;
    message: string;
    code?: string;
    info: T | null;
}

export function ok<T>(res: Response, message: string, info: T): void {
    const body: ApiEnvelope<T> = { success: true, message, info };
    res.json(body);
}

export function fail(
    res: Response,
    status: number,
    message: string,
    code: string,
    info: unknown = null
): void {
    const body: ApiEnvelope = { success: false, message, code, info };
    res.status(status).json(body);
}
