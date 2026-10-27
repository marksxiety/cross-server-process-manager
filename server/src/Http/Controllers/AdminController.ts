import type { Request, Response } from 'express';
import { HttpException } from '../../Exceptions/HttpException';
import { AdminService } from '../../Services/AdminService';
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
        const user = await this.admin.updateUser(userId(req), data);
        ok(res, 'User updated successfully', user);
    };

    updateAccess = async (req: Request, res: Response): Promise<void> => {
        const data = UpdateAccessRequest.validate(req.body);
        const user = await this.admin.replaceAccess(userId(req), data.pages, data.events);
        ok(res, 'User access updated successfully', user);
    };
}
