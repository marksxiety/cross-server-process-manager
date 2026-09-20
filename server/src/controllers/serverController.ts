import type { Request, Response } from 'express';
import db from '../config/db';
import { fail, ok } from '../utils/response';

export interface ServerRecord {
    id: number;
    server: string;
    protocol: string;
    host: string;
    port: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export const index = async (_req: Request, res: Response): Promise<void> => {
    try {
        const { rows } = await db.query<ServerRecord>('SELECT * FROM servers ORDER BY id ASC');
        ok(res, 'Servers retrieved successfully', rows);
    } catch (err) {
        console.error(err);
        fail(res, 500, 'Failed to retrieve servers', 'INTERNAL_SERVER_ERROR');
    }
};
