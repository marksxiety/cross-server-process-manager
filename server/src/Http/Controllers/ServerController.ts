import type { Request, Response } from 'express';
import { serverCreated, serverDeleted, serverUpdated } from '../../Audit/AuditMessages';
import { HttpException } from '../../Exceptions/HttpException';
import type { PublicUser } from '../../Models/User';
import { auditAfter } from '../../Services/AuditService';
import { ServerService } from '../../Services/ServerService';
import { clientIp } from '../../Support/ClientIp';
import { parseIdParam } from '../../Support/Id';
import { StoreServerRequest } from '../Requests/StoreServerRequest';
import { UpdateServerRequest } from '../Requests/UpdateServerRequest';
import { ok } from '../Responses/ApiResponse';

const INVALID_ID_MESSAGE = 'Server id must be a positive integer';

function actorId(res: Response): number | null {
    const locals = res.locals as Record<string, unknown> | undefined;
    const user = locals?.user as PublicUser | undefined;
    return user?.id ?? null;
}

export class ServerController {
    constructor(private readonly servers: ServerService) {}

    index = async (req: Request, res: Response): Promise<void> => {
        const withInactive = req.query.with_inactive === 'true';
        const servers = await this.servers.list(withInactive);
        ok(res, 'Servers retrieved successfully', servers);
    };

    store = async (req: Request, res: Response): Promise<void> => {
        const data = StoreServerRequest.validate(req.body);
        const server = await this.servers.create(data);

        auditAfter(res, {
            userId: actorId(res),
            category: 'server',
            action: 'create',
            details: serverCreated(server),
            ip: clientIp(req),
        });

        ok(res, 'Server registered successfully', server);
    };

    update = async (req: Request, res: Response): Promise<void> => {
        const id = parseIdParam(req.params.id);
        if (id === null) {
            throw new HttpException(400, INVALID_ID_MESSAGE, 'INVALID_ID');
        }

        const data = UpdateServerRequest.validate(req.body);
        const result = await this.servers.update(id, data);

        auditAfter(res, {
            userId: actorId(res),
            category: 'server',
            action: 'update',
            details: serverUpdated(result.server, result.changes),
            ip: clientIp(req),
        });

        ok(res, 'Server updated successfully', result.server);
    };

    destroy = async (req: Request, res: Response): Promise<void> => {
        const id = parseIdParam(req.params.id);
        if (id === null) {
            throw new HttpException(400, INVALID_ID_MESSAGE, 'INVALID_ID');
        }

        const server = await this.servers.delete(id);

        auditAfter(res, {
            userId: actorId(res),
            category: 'server',
            action: 'delete',
            details: serverDeleted(server),
            ip: clientIp(req),
        });

        ok(res, 'Server removed successfully', server);
    };
}
