import type { Request, Response } from 'express';
import { accessUpdated, userUpdated } from '../../Audit/AuditMessages';
import { HttpException } from '../../Exceptions/HttpException';
import type { PublicUser } from '../../Models/User';
import { AdminService } from '../../Services/AdminService';
import { auditAfter } from '../../Services/AuditService';
import { clientIp } from '../../Support/ClientIp';
import { parseIdParam } from '../../Support/Id';
import { UpdateAccessRequest } from '../Requests/UpdateAccessRequest';
import { UpdateAdminUserRequest } from '../Requests/UpdateAdminUserRequest';
import { ok } from '../Responses/ApiResponse';

const INVALID_ID_MESSAGE = 'User id must be a positive integer';

function userId(req: Request): number {
    const id = parseIdParam(req.params.id);
    if (id === null) {
        throw new HttpException(400, INVALID_ID_MESSAGE, 'INVALID_ID');
    }
    return id;
}

function actorId(res: Response): number | null {
    const locals = res.locals as Record<string, unknown> | undefined;
    const user = locals?.user as PublicUser | undefined;
    return user?.id ?? null;
}

export class AdminController {
    constructor(private readonly admin: AdminService) {}

    index = async (_req: Request, res: Response): Promise<void> => {
        ok(res, 'Users retrieved successfully', await this.admin.listUsers());
    };

    catalog = async (_req: Request, res: Response): Promise<void> => {
        ok(res, 'Access catalog retrieved successfully', this.admin.catalog());
    };

    updateUser = async (req: Request, res: Response): Promise<void> => {
        const data = UpdateAdminUserRequest.validate(req.body);
        const result = await this.admin.updateUser(userId(req), data);

        auditAfter(res, {
            userId: actorId(res),
            category: 'admin',
            action: 'update_user',
            details: userUpdated(result.previous, result.view),
            ip: clientIp(req),
        });

        ok(res, 'User updated successfully', result.view);
    };

    updateAccess = async (req: Request, res: Response): Promise<void> => {
        const data = UpdateAccessRequest.validate(req.body);
        const result = await this.admin.replaceAccess(
            userId(req),
            data.pages,
            data.events
        );

        auditAfter(res, {
            userId: actorId(res),
            category: 'admin',
            action: 'update_access',
            details: accessUpdated(result.view, result.previous, result.view),
            ip: clientIp(req),
        });

        ok(res, 'User access updated successfully', result.view);
    };
}
