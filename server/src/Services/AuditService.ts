import type { Response } from 'express';
import { AuditLog, type AuditEventInput } from '../Models/AuditLog';

/** Best-effort: an audit failure must never affect the user's request. */
export function recordAudit(event: AuditEventInput): void {
    void AuditLog.record(event).catch((error) => {
        console.error('Failed to write audit log', error);
    });
}

/** Runs the insert only after the response has been flushed. */
export function auditAfter(res: Response, event: AuditEventInput): void {
    res.once('finish', () => recordAudit(event));
}
