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

const DUPLICATE_KEY_CODE = '23505';
const INVALID_ID_MESSAGE = 'Server id must be a positive integer';
const NOT_FOUND_MESSAGE = 'Server not found';

function parseIdParam(value: string | string[] | undefined): number | null {
    if (typeof value !== 'string') return null;
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
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
        const dbError = err as { detail?: string; code?: string; message?: string };
        fail(
            res,
            dbError.code === DUPLICATE_KEY_CODE ? 409 : 500,
            dbError.detail ?? dbError.message ?? 'Failed to register server',
            dbError.code ?? 'INTERNAL_SERVER_ERROR'
        );
    }
};

export const update = async (req: Request, res: Response): Promise<void> => {
    const id = parseIdParam(req.params.id);
    if (id === null) {
        fail(res, 400, INVALID_ID_MESSAGE, 'INVALID_ID');
        return;
    }

    const { server, protocol, host, port, is_active } = req.body;
    const active = typeof is_active === 'boolean' ? is_active : null;

    try {
        const { rows } = await db.query<ServerRecord>(
            `UPDATE servers
             SET server = $1,
                 protocol = $2,
                 host = $3,
                 port = $4,
                 is_active = COALESCE($5, is_active),
                 updated_at = current_timestamp
             WHERE id = $6
             RETURNING *`,
            [server, protocol, host, port, active, id]
        );

        const updated = rows[0];
        if (!updated) {
            fail(res, 404, NOT_FOUND_MESSAGE, 'NOT_FOUND');
            return;
        }

        ok(res, 'Server updated successfully', updated);
    } catch (err) {
        console.error(err);
        const dbError = err as { detail?: string; code?: string; message?: string };
        fail(
            res,
            dbError.code === DUPLICATE_KEY_CODE ? 409 : 500,
            dbError.detail ?? dbError.message ?? 'Failed to update server',
            dbError.code ?? 'INTERNAL_SERVER_ERROR'
        );
    }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
    const id = parseIdParam(req.params.id);
    if (id === null) {
        fail(res, 400, INVALID_ID_MESSAGE, 'INVALID_ID');
        return;
    }

    try {
        const { rows } = await db.query<ServerRecord>(
            'DELETE FROM servers WHERE id = $1 RETURNING *',
            [id]
        );

        const removed = rows[0];
        if (!removed) {
            fail(res, 404, NOT_FOUND_MESSAGE, 'NOT_FOUND');
            return;
        }

        ok(res, 'Server removed successfully', removed);
    } catch (err) {
        console.error(err);
        const dbError = err as { detail?: string; code?: string; message?: string };
        fail(
            res,
            500,
            dbError.detail ?? dbError.message ?? 'Failed to remove server',
            dbError.code ?? 'INTERNAL_SERVER_ERROR'
        );
    }
};
