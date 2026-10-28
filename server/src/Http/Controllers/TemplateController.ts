import type { Request, Response } from 'express';
import {
    templateCreated,
    templateDeleted,
    templateUpdated,
} from '../../Audit/AuditMessages';
import { HttpException } from '../../Exceptions/HttpException';
import { NotFoundException } from '../../Exceptions/NotFoundException';
import type { PublicUser } from '../../Models/User';
import { auditAfter } from '../../Services/AuditService';
import { TemplateService } from '../../Services/TemplateService';
import { clientIp } from '../../Support/ClientIp';
import { parseIdParam } from '../../Support/Id';
import { StoreTemplateRequest } from '../Requests/StoreTemplateRequest';
import { UpdateTemplateRequest } from '../Requests/UpdateTemplateRequest';
import { ok } from '../Responses/ApiResponse';

const INVALID_ID_MESSAGE = 'Template id must be a positive integer';

function actorId(res: Response): number | null {
    const locals = res.locals as Record<string, unknown> | undefined;
    const user = locals?.user as PublicUser | undefined;
    return user?.id ?? null;
}

export class TemplateController {
    constructor(private readonly templates: TemplateService) {}

    index = async (req: Request, res: Response): Promise<void> => {
        const withInactive = req.query.with_inactive === 'true';
        const templates = await this.templates.list(withInactive);
        ok(res, 'Templates retrieved successfully', templates);
    };

    store = async (req: Request, res: Response): Promise<void> => {
        const data = StoreTemplateRequest.validate(req.body);
        const template = await this.templates.create(data);

        auditAfter(res, {
            userId: actorId(res),
            category: 'template',
            action: 'create',
            details: templateCreated(template),
            ip: clientIp(req),
        });

        ok(res, 'Template registered successfully', template);
    };

    update = async (req: Request, res: Response): Promise<void> => {
        const id = parseIdParam(req.params.id);
        if (id === null) {
            throw new HttpException(400, INVALID_ID_MESSAGE, 'INVALID_ID');
        }

        const { values } = UpdateTemplateRequest.validate(req.body);
        const result = await this.templates.update(id, values);
        if (!result) {
            throw new NotFoundException('Template');
        }

        auditAfter(res, {
            userId: actorId(res),
            category: 'template',
            action: 'update',
            details: templateUpdated(result.template, result.changes),
            ip: clientIp(req),
        });

        ok(res, 'Template updated successfully', result.template);
    };

    destroy = async (req: Request, res: Response): Promise<void> => {
        const id = parseIdParam(req.params.id);
        if (id === null) {
            throw new HttpException(400, INVALID_ID_MESSAGE, 'INVALID_ID');
        }

        const template = await this.templates.delete(id);

        auditAfter(res, {
            userId: actorId(res),
            category: 'template',
            action: 'delete',
            details: templateDeleted(template),
            ip: clientIp(req),
        });

        ok(res, 'Template removed successfully', template);
    };
}
