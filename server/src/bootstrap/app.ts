import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import apiRoutes from '../../routes/api';
import { handleException } from '../Exceptions/Handler';
import { fail } from '../Http/Responses/ApiResponse';

function trustProxySetting(): boolean | number | string {
    const raw = process.env.TRUST_PROXY?.trim();
    if (!raw) return false;
    if (raw === 'true') return true;
    if (raw === 'false') return false;

    const hops = Number(raw);
    return Number.isInteger(hops) && hops >= 0 ? hops : raw;
}

export function createApp(): express.Express {
    const app = express();

    app.set('trust proxy', trustProxySetting());
    app.use(cors());
    app.use(express.json());
    app.use(apiRoutes);

    app.use((req: Request, res: Response) => {
        fail(res, 404, `Route ${req.method} ${req.originalUrl} not found`, 'NOT_FOUND');
    });

    app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
        handleException(err, req, res, next);
    });

    return app;
}
