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

export const index = async (req: Request, res: Response): Promise<void> => {
    const withInactive = req.query.with_inactive === 'true';
    const sql = withInactive
        ? 'SELECT * FROM servers ORDER BY id ASC'
        : 'SELECT * FROM servers WHERE is_active = TRUE ORDER BY id ASC';

    try {
        const { rows } = await db.query<ServerRecord>(sql);
        ok(res, 'Servers retrieved successfully', rows);
    } catch (err) {
        console.error(err);
        fail(res, 500, 'Failed to retrieve servers', 'INTERNAL_SERVER_ERROR');
    }
};

export const register = async (req: Request, res: Response): Promise<void> => {
    const { server, protocol, host, port, is_active } = req.body;
    const active = typeof is_active === 'boolean' ? is_active : true;

    try {
        const { rows } = await db.query<ServerRecord>(
            'INSERT INTO servers (server, protocol, host, port, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [server, protocol, host, port, active]
        );
        ok(res, 'Server registered successfully', rows[0]);
    } catch (err) {
        console.error(err);
        fail(res, 500, 'Failed to register server', 'INTERNAL_SERVER_ERROR');
    }
};