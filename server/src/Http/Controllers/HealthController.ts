import type { Request, Response } from 'express';
import db from '../../Persistence/Connection';
import { fail, ok } from '../Responses/ApiResponse';

const MESSAGE_OK = 'XPM health check passed';
const MESSAGE_FAIL = 'XPM health check failed';

export class HealthController {
    check = async (_req: Request, res: Response): Promise<void> => {
        const uptime = process.uptime();
        const timestamp = Date.now();

        try {
            await db.query('SELECT 1');
            ok(res, MESSAGE_OK, { status: 'ok', uptime, timestamp });
        } catch (err) {
            console.error(err);
            fail(res, 503, MESSAGE_FAIL, 'DATABASE_UNAVAILABLE', {
                status: 'error',
                uptime,
                timestamp,
            });
        }
    };
}
