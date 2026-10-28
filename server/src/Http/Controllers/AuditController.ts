import type { Request, Response } from 'express';
import { logsCleared, processCommand, processCreated } from '../../Audit/AuditMessages';
import { HttpException } from '../../Exceptions/HttpException';
import { AuditLog } from '../../Models/AuditLog';
import type { PublicUser } from '../../Models/User';
import { auditAfter } from '../../Services/AuditService';
import { ServerService } from '../../Services/ServerService';
import { clientIp } from '../../Support/ClientIp';
import {
    AuditEventRequest,
    PERMISSION_BY_ACTION,
} from '../Requests/AuditEventRequest';
import { ok } from '../Responses/ApiResponse';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

function authenticatedUser(res: Response): PublicUser {
    const locals = res.locals as Record<string, unknown> | undefined;
    const user = locals?.user as PublicUser | undefined;
    if (!user) {
        throw new HttpException(401, 'Authentication required', 'UNAUTHORIZED');
    }
    return user;
}

function parseLimit(value: unknown): number {
    const raw = Array.isArray(value) ? value[0] : value;
    const limit = Number(raw ?? DEFAULT_LIMIT);
    if (!Number.isInteger(limit) || limit <= 0) return DEFAULT_LIMIT;
    return Math.min(limit, MAX_LIMIT);
}

export class AuditController {
    constructor(private readonly servers: ServerService) {}

    recordEvent = async (req: Request, res: Response): Promise<void> => {
        const data = AuditEventRequest.validate(req.body);
        const user = authenticatedUser(res);

        const permission = PERMISSION_BY_ACTION[data.action];
        if (!user.is_admin && !user.events.includes(permission)) {
            throw new HttpException(
                403,
                'You do not have access to this resource',
                'FORBIDDEN'
            );
        }

        const server = await this.servers.findById(data.server_id);
        if (!server) {
            throw new HttpException(404, 'Server not found', 'NOT_FOUND');
        }

        const action = data.action.split('.')[1] ?? data.action;

        const details =
            data.action === 'process.create'
                ? processCreated(server.server, data.process_name, data.pm_id)
                : data.action === 'logs.flush'
                  ? logsCleared(
                        server.server,
                        data.process_name,
                        data.pm_id,
                        data.stream ?? 'all',
                        data.scope ?? 'active',
                        data.bytes_freed
                    )
                  : processCommand(
                        action,
                        server.server,
                        data.process_name,
                        data.pm_id
                    );

        auditAfter(res, {
            userId: user.id,
            category: 'process',
            action,
            details,
            ip: clientIp(req),
        });

        ok(res, 'Audit event recorded', null);
    };

    recent = async (req: Request, res: Response): Promise<void> => {
        const rows = await AuditLog.recent(parseLimit(req.query.limit));
        ok(res, 'Audit log retrieved successfully', rows);
    };
}
