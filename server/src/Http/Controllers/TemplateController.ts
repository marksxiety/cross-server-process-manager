import type { Request, Response } from 'express';
import { HttpException } from '../../Exceptions/HttpException';
import { TemplateService } from '../../Services/TemplateService';
import { parseIdParam } from '../../Support/Id';
import { StoreTemplateRequest } from '../Requests/StoreTemplateRequest';
import { UpdateTemplateRequest } from '../Requests/UpdateTemplateRequest';
import { ok } from '../Responses/ApiResponse';

const INVALID_ID_MESSAGE = 'Template id must be a positive integer';

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
        ok(res, 'Template registered successfully', template);
    };

    update = async (req: Request, res: Response): Promise<void> => {
        const id = parseIdParam(req.params.id);
        if (id === null) {
            throw new HttpException(400, INVALID_ID_MESSAGE, 'INVALID_ID');
        }

        const { values } = UpdateTemplateRequest.validate(req.body);
        const template = await this.templates.update(id, values);
        ok(res, 'Template updated successfully', template);
    };

    destroy = async (req: Request, res: Response): Promise<void> => {
        const id = parseIdParam(req.params.id);
        if (id === null) {
            throw new HttpException(400, INVALID_ID_MESSAGE, 'INVALID_ID');
        }

        const template = await this.templates.delete(id);
        ok(res, 'Template removed successfully', template);
    };
}
