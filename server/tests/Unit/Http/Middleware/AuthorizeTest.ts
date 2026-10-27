import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { HttpException } from '../../../../src/Exceptions/HttpException';
import { requireAdmin, requireEvent } from '../../../../src/Http/Middleware/Authorize';

function responseWith(user: Record<string, unknown> | undefined): Response {
    return { locals: user ? { user } : {} } as unknown as Response;
}

function firstError(next: ReturnType<typeof vi.fn>): HttpException {
    const error = next.mock.calls[0]?.[0];
    if (!(error instanceof HttpException)) {
        throw new Error('Expected HttpException');
    }
    return error;
}

describe('requireEvent', () => {
    it('allows a user with the event grant', () => {
        const next = vi.fn();
        requireEvent('process.start')(
            {} as Request,
            responseWith({ is_admin: false, events: ['process.start'] }),
            next as unknown as NextFunction
        );

        expect(next.mock.calls[0]).toHaveLength(0);
    });

    it('allows an admin without the grant', () => {
        const next = vi.fn();
        requireEvent('process.delete')(
            {} as Request,
            responseWith({ is_admin: true, events: [] }),
            next as unknown as NextFunction
        );

        expect(next.mock.calls[0]).toHaveLength(0);
    });

    it('rejects a user without the event grant', () => {
        const next = vi.fn();
        requireEvent('process.delete')(
            {} as Request,
            responseWith({ is_admin: false, events: ['process.start'] }),
            next as unknown as NextFunction
        );

        expect(firstError(next).status).toBe(403);
        expect(firstError(next).code).toBe('FORBIDDEN');
    });

    it('rejects a request with no authenticated user', () => {
        const next = vi.fn();
        requireEvent('process.start')(
            {} as Request,
            responseWith(undefined),
            next as unknown as NextFunction
        );

        expect(firstError(next).status).toBe(401);
    });
});

describe('requireAdmin', () => {
    it('allows an admin', () => {
        const next = vi.fn();
        requireAdmin()(
            {} as Request,
            responseWith({ is_admin: true, events: [] }),
            next as unknown as NextFunction
        );

        expect(next.mock.calls[0]).toHaveLength(0);
    });

    it('rejects a non-admin', () => {
        const next = vi.fn();
        requireAdmin()(
            {} as Request,
            responseWith({ is_admin: false, events: [] }),
            next as unknown as NextFunction
        );

        expect(firstError(next).status).toBe(403);
        expect(firstError(next).code).toBe('FORBIDDEN');
    });
});
