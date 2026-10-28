import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { TokenService, TokenVerificationError } from '../../Auth/TokenService';
import { HttpException } from '../../Exceptions/HttpException';
import { AuthService } from '../../Services/AuthService';

const BEARER_PREFIX = 'Bearer ';

function readBearerToken(req: Request): string {
    const header = req.header('authorization');
    if (!header || !header.startsWith(BEARER_PREFIX)) {
        throw new HttpException(401, 'Authentication required', 'UNAUTHORIZED');
    }

    const token = header.slice(BEARER_PREFIX.length).trim();
    if (token.length === 0) {
        throw new HttpException(401, 'Authentication required', 'UNAUTHORIZED');
    }
    return token;
}

function toHttpException(error: unknown): unknown {
    if (!(error instanceof TokenVerificationError)) {
        return error;
    }

    return error.reason === 'expired'
        ? new HttpException(401, 'Token has expired', 'TOKEN_EXPIRED')
        : new HttpException(401, 'Token is invalid', 'INVALID_TOKEN');
}

export function authenticate(tokens: TokenService, auth: AuthService): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const claims = tokens.verify(readBearerToken(req));
            res.locals.user = await auth.currentUser(claims.userId, claims.tokenVersion);
            next();
        } catch (error) {
            next(toHttpException(error));
        }
    };
}
