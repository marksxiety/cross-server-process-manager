import type { Request, Response } from 'express';
import { HttpException } from '../../Exceptions/HttpException';
import { ServerService } from '../../Services/ServerService';
import { parseIdParam } from '../../Support/Id';
import { StoreServerRequest } from '../Requests/StoreServerRequest';
import { UpdateServerRequest } from '../Requests/UpdateServerRequest';
import { ok } from '../Responses/ApiResponse';

const INVALID_ID_MESSAGE = 'Server id must be a positive integer';

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
        ok(res, 'Server registered successfully', server);
    };

    update = async (req: Request, res: Response): Promise<void> => {
        const id = parseIdParam(req.params.id);
        if (id === null) {
            throw new HttpException(400, INVALID_ID_MESSAGE, 'INVALID_ID');
        }

        const data = UpdateServerRequest.validate(req.body);
        const server = await this.servers.update(id, data);
        ok(res, 'Server updated successfully', server);
    };

    destroy = async (req: Request, res: Response): Promise<void> => {
        const id = parseIdParam(req.params.id);
        if (id === null) {
            throw new HttpException(400, INVALID_ID_MESSAGE, 'INVALID_ID');
        }

        const server = await this.servers.delete(id);
        ok(res, 'Server removed successfully', server);
    };
}
