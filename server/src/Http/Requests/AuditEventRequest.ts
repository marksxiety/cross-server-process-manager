import { z } from 'zod';
import { ValidationException } from '../../Exceptions/ValidationException';
import type { EventKey } from '../../Security/AccessCatalog';

export const CLIENT_AUDIT_ACTIONS = [
    'process.create',
    'process.start',
    'process.stop',
    'process.restart',
    'process.reload',
    'process.delete',
    'logs.flush',
] as const;

export type ClientAuditAction = (typeof CLIENT_AUDIT_ACTIONS)[number];

/** Client-reported actions map to the existing access-catalog permission. */
export const PERMISSION_BY_ACTION: Record<ClientAuditAction, EventKey> = {
    'process.create': 'process.start',
    'process.start': 'process.start',
    'process.stop': 'process.stop',
    'process.restart': 'process.restart',
    'process.reload': 'process.reload',
    'process.delete': 'process.delete',
    'logs.flush': 'logs.flush',
};

const MAX_PROCESS_NAME_LENGTH = 100;
const MAX_SERVER_ID = 2_147_483_647;

export const auditEventSchema = z.object({
    action: z.enum(CLIENT_AUDIT_ACTIONS),
    server_id: z
        .number({ message: 'Server id is required' })
        .int({ message: 'Server id must be an integer' })
        .positive({ message: 'Server id must be a positive integer' })
        .max(MAX_SERVER_ID),
    pm_id: z
        .number({ message: 'Process id is required' })
        .int({ message: 'Process id must be an integer' })
        .nonnegative({ message: 'Process id cannot be negative' }),
    process_name: z
        .string()
        .trim()
        .max(MAX_PROCESS_NAME_LENGTH, {
            message: `Process name must be ${MAX_PROCESS_NAME_LENGTH} characters or less`,
        })
        .optional(),
    stream: z.enum(['all', 'out', 'err']).optional(),
    scope: z.enum(['active', 'rotated', 'all']).optional(),
    bytes_freed: z.number().int().nonnegative().optional(),
});

export type AuditEventData = z.infer<typeof auditEventSchema>;

export class AuditEventRequest {
    static validate(body: unknown): AuditEventData {
        const parsed = auditEventSchema.safeParse(body);
        if (!parsed.success) {
            throw new ValidationException(
                'Invalid audit event payload',
                z.flattenError(parsed.error).fieldErrors
            );
        }
        return parsed.data;
    }
}
