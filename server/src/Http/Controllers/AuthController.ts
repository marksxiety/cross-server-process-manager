import type { Request, Response } from 'express';
import { HttpException } from '../../Exceptions/HttpException';
import type { PublicUser } from '../../Models/User';
import { AuthService, type AuthResult } from '../../Services/AuthService';
import { LoginRequest } from '../Requests/LoginRequest';
import { ok } from '../Responses/ApiResponse';

function authInfo(result: AuthResult): Record<string, unknown> {
    return {
        token: result.token,
        token_type: result.tokenType,
        expires_in: result.expiresIn,
        user: result.user,
    };
}

export class AuthController {
    constructor(private readonly auth: AuthService) {}

    login = async (req: Request, res: Response): Promise<void> => {
        const data = LoginRequest.validate(req.body);
        const result = await this.auth.login(data);
        ok(res, 'Login successful', authInfo(result));
    };

    me = async (_req: Request, res: Response): Promise<void> => {
        const user = res.locals.user as PublicUser | undefined;
        if (!user) {
            throw new HttpException(401, 'Authentication required', 'UNAUTHORIZED');
        }
        ok(res, 'Authenticated user retrieved', user);
    };

    logout = async (_req: Request, res: Response): Promise<void> => {
        const user = res.locals.user as PublicUser | undefined;
        if (!user) {
            throw new HttpException(401, 'Authentication required', 'UNAUTHORIZED');
        }
        await this.auth.logout(user.id);
        ok(res, 'Signed out successfully', null);
    };
}
