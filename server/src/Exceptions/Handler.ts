import type { NextFunction, Request, Response } from 'express';
import { fail } from '../Http/Responses/ApiResponse';
import { DatabaseException } from './DatabaseException';
import { HttpException } from './HttpException';

export function handleException(
    err: unknown,
    _req: Request,
    res: Response,
    next: NextFunction
): void {
    if (res.headersSent) {
        next(err);
        return;
    }

    if (err instanceof HttpException) {
        fail(res, err.status, err.message, err.code, err.info);
        return;
    }

    if (err instanceof DatabaseException) {
        console.error(err.cause ?? err);
        fail(res, 500, err.message, err.code);
        return;
    }

    console.error(err);
    fail(res, 500, 'Internal server error', 'INTERNAL_SERVER_ERROR');
}
