import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/Models/AuditLog', () => ({
    AuditLog: { record: vi.fn() },
}));

import type { Response } from 'express';
import { AuditLog } from '../../../src/Models/AuditLog';
import { auditAfter, recordAudit } from '../../../src/Services/AuditService';

function responseEmitter(): { res: Response; emitter: EventEmitter } {
    const emitter = new EventEmitter();
    const res = { once: emitter.once.bind(emitter) } as unknown as Response;
    return { res, emitter };
}

beforeEach(() => {
    vi.mocked(AuditLog.record).mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('recordAudit', () => {
    it('writes the event', async () => {
        recordAudit({
            userId: 3,
            category: 'auth',
            action: 'login',
            details: 'Signed in',
            ip: '127.0.0.1',
        });
        await Promise.resolve();

        expect(AuditLog.record).toHaveBeenCalledWith({
            userId: 3,
            category: 'auth',
            action: 'login',
            details: 'Signed in',
            ip: '127.0.0.1',
        });
    });

    it('never rejects when the insert fails', async () => {
        vi.mocked(AuditLog.record).mockRejectedValueOnce(new Error('db down'));
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        expect(() =>
            recordAudit({ category: 'auth', action: 'logout', details: 'Signed out' })
        ).not.toThrow();
        await Promise.resolve();

        expect(error).toHaveBeenCalled();
    });
});

describe('auditAfter', () => {
    it('waits for the response to finish before writing', async () => {
        const { res, emitter } = responseEmitter();

        auditAfter(res, {
            category: 'server',
            action: 'create',
            details: 'Registered server LOCAL (10.0.0.5:5638)',
        });
        expect(AuditLog.record).not.toHaveBeenCalled();

        emitter.emit('finish');
        await Promise.resolve();

        expect(AuditLog.record).toHaveBeenCalledWith({
            category: 'server',
            action: 'create',
            details: 'Registered server LOCAL (10.0.0.5:5638)',
        });
    });
});
