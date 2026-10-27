import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { HttpException } from '../../Exceptions/HttpException';
import type { PublicUser } from '../../Models/User';
import type { EventKey } from '../../Security/AccessCatalog';

const FORBIDDEN_CODE = 'FORBIDDEN';
const FORBIDDEN_MESSAGE = 'You do not have access to this resource';
const UNAUTHORIZED_MESSAGE = 'Authentication required';

function authenticatedUser(res: Response): PublicUser {
    const user = res.locals.user as PublicUser | undefined;
    if (!user) {
        throw new HttpException(401, UNAUTHORIZED_MESSAGE, 'UNAUTHORIZED');
    }
    return user;
}

function forbid(): HttpException {
    return new HttpException(403, FORBIDDEN_MESSAGE, FORBIDDEN_CODE);
}

export function requireAdmin(): RequestHandler {
    return (_req: Request, res: Response, next: NextFunction): void => {
        try {
            if (!authenticatedUser(res).is_admin) {
                throw forbid();
            }
            next();
        } catch (error) {
            next(error);
        }
    };
}

export function requireEvent(event: EventKey): RequestHandler {
    return (_req: Request, res: Response, next: NextFunction): void => {
        try {
            const user = authenticatedUser(res);
            if (!user.is_admin && !user.events.includes(event)) {
                throw forbid();
            }
            next();
        } catch (error) {
            next(error);
        }
    };
}
