import type { Request, Response } from 'express';
import { auditMessage, loginFailed } from '../../Audit/AuditMessages';
import { HttpException } from '../../Exceptions/HttpException';
import type { PublicUser } from '../../Models/User';
import { auditAfter } from '../../Services/AuditService';
import { AuthService, type AuthResult } from '../../Services/AuthService';
import { clientIp } from '../../Support/ClientIp';
import { LoginRequest } from '../Requests/LoginRequest';
import { RefreshTokenRequest } from '../Requests/RefreshTokenRequest';
import { ok } from '../Responses/ApiResponse';

function authInfo(result: AuthResult): Record<string, unknown> {
    return {
        token: result.token,
        token_type: result.tokenType,
        expires_in: result.expiresIn,
        refresh_token: result.refreshToken,
        refresh_expires_in: result.refreshExpiresIn,
        user: result.user,
    };
}

export class AuthController {
    constructor(private readonly auth: AuthService) {}

    login = async (req: Request, res: Response): Promise<void> => {
        const data = LoginRequest.validate(req.body);

        let result: AuthResult;
        try {
            result = await this.auth.login(data);
        } catch (error) {
            const reason = error instanceof HttpException ? error.code : 'INTERNAL_SERVER_ERROR';
            auditAfter(res, {
                category: 'auth',
                action: 'login_failed',
                details: loginFailed(reason),
                ip: clientIp(req),
            });
            throw error;
        }

        auditAfter(res, {
            userId: result.user.id,
            category: 'auth',
            action: 'login',
            details: auditMessage.login,
            ip: clientIp(req),
        });
        ok(res, 'Login successful', authInfo(result));
    };

    refresh = async (req: Request, res: Response): Promise<void> => {
        const data = RefreshTokenRequest.validate(req.body);

        let result: AuthResult;
        try {
            result = await this.auth.refresh(data.refreshToken);
        } catch (error) {
            if (error instanceof HttpException && error.code === 'REFRESH_TOKEN_REUSED') {
                auditAfter(res, {
                    category: 'auth',
                    action: 'refresh_reuse',
                    details: auditMessage.refreshReuse,
                    ip: clientIp(req),
                });
            }
            throw error;
        }

        ok(res, 'Session refreshed', authInfo(result));
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

        auditAfter(res, {
            userId: user.id,
            category: 'auth',
            action: 'logout',
            details: auditMessage.logout,
            ip: clientIp(_req),
        });
        await this.auth.logout(user.id);
        ok(res, 'Signed out successfully', null);
    };
}
