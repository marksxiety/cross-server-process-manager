import type { Request, Response } from 'express';
import { z } from 'zod';
import db from '../config/db';
import { serverInputSchema } from '../schemas/serverSchema';
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
const DUPLICATE_SERVER_CODE = 'DUPLICATE_SERVER';
const DUPLICATE_HOST_CODE = 'DUPLICATE_HOST';
const VALIDATION_FAILED_CODE = 'VALIDATION_FAILED';
const SERVER_UNIQUE_CONSTRAINT = 'servers_server_key';
const HOST_UNIQUE_CONSTRAINT = 'servers_host_unique';
const INVALID_ID_MESSAGE = 'Server id must be a positive integer';
const NOT_FOUND_MESSAGE = 'Server not found';

function parseIdParam(value: string | string[] | undefined): number | null {
    if (typeof value !== 'string') return null;
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function duplicateServerMessage(name: string): string {
    return `Server "${name}" is already registered`;
}

function duplicateHostMessage(host: string): string {
    return `Host "${host}" is already registered`;
}

function duplicateResponse(
    constraint: string | undefined,
    values: { server: string; host: string }
): { code: string; message: string } | null {
    if (constraint === SERVER_UNIQUE_CONSTRAINT) {
        return { code: DUPLICATE_SERVER_CODE, message: duplicateServerMessage(values.server) };
    }
    if (constraint === HOST_UNIQUE_CONSTRAINT) {
        return { code: DUPLICATE_HOST_CODE, message: duplicateHostMessage(values.host) };
    }
    return null;
}

function sendValidationError(res: Response, error: z.ZodError): void {
    fail(
        res,
        400,
        'Invalid server payload',
        VALIDATION_FAILED_CODE,
        z.flattenError(error).fieldErrors
    );
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
    const parsed = serverInputSchema.safeParse(req.body);
    if (!parsed.success) {
        sendValidationError(res, parsed.error);
        return;
    }

    const { server, protocol, host, port, is_active } = parsed.data;
    const active = is_active ?? true;

    try {
        const { rows } = await db.query<ServerRecord>(
            'INSERT INTO servers (server, protocol, host, port, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [server, protocol, host, port, active]
        );
        ok(res, 'Server registered successfully', rows[0]);
    } catch (err) {
        console.error(err);
        const dbError = err as { detail?: string; code?: string; constraint?: string; message?: string };

        if (dbError.code === DUPLICATE_KEY_CODE) {
            const duplicate = duplicateResponse(dbError.constraint, { server, host }) ?? {
                code: DUPLICATE_SERVER_CODE,
                message: duplicateServerMessage(server),
            };
            fail(res, 409, duplicate.message, duplicate.code);
            return;
        }

        fail(
            res,
            500,
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

    const parsed = serverInputSchema.safeParse(req.body);
    if (!parsed.success) {
        sendValidationError(res, parsed.error);
        return;
    }

    const { server, protocol, host, port, is_active } = parsed.data;
    const active = is_active ?? null;

    try {
        const { rows: stateRows } = await db.query<{
            target_exists: boolean;
            name_taken: boolean;
            host_taken: boolean;
        }>(
            `SELECT EXISTS (SELECT 1 FROM servers WHERE id = $2) AS target_exists,
                    EXISTS (SELECT 1 FROM servers WHERE server = $1 AND id <> $2) AS name_taken,
                    EXISTS (SELECT 1 FROM servers WHERE host = $3 AND id <> $2) AS host_taken`,
            [server, id, host]
        );

        const state = stateRows[0];
        if (!state || !state.target_exists) {
            fail(res, 404, NOT_FOUND_MESSAGE, 'NOT_FOUND');
            return;
        }
        if (state.name_taken) {
            fail(res, 409, duplicateServerMessage(server), DUPLICATE_SERVER_CODE);
            return;
        }
        if (state.host_taken) {
            fail(res, 409, duplicateHostMessage(host), DUPLICATE_HOST_CODE);
            return;
        }

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
        const dbError = err as { detail?: string; code?: string; constraint?: string; message?: string };

        if (dbError.code === DUPLICATE_KEY_CODE) {
            const duplicate = duplicateResponse(dbError.constraint, { server, host }) ?? {
                code: DUPLICATE_SERVER_CODE,
                message: duplicateServerMessage(server),
            };
            fail(res, 409, duplicate.message, duplicate.code);
            return;
        }

        fail(
            res,
            500,
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
