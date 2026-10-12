import {
    Bit,
    ConnectionPool,
    DateTime2,
    Float,
    Int,
    MAX,
    NVarChar,
    Request,
    Transaction,
    type ISqlType,
    type IResult,
} from 'mssql';
import { buildConfig } from './databaseConfig';
import './env';

export interface QueryResult<T> {
    rows: T[];
    rowCount: number;
}

export interface DbSession {
    query<T>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}

const pool = new ConnectionPool(buildConfig());

pool.on('error', (err) => {
    console.error('Unexpected error on idle SQL Server client', err);
    process.exit(-1);
});

let connecting: Promise<void> | null = null;

export async function getPool(): Promise<ConnectionPool> {
    if (!connecting) {
        connecting = pool
            .connect()
            .then(() => undefined)
            .catch((error: unknown) => {
                connecting = null;
                throw error;
            });
    }
    await connecting;
    return pool;
}

/**
 * Binds values positionally as @p1..@pn. Types are pinned so nulls and
 * booleans never fall back to surprising driver inference.
 */
function toSqlType(value: unknown): (() => ISqlType) | ISqlType {
    if (typeof value === 'boolean') return Bit;
    if (typeof value === 'number') return Number.isInteger(value) ? Int : Float;
    if (value instanceof Date) return DateTime2;
    return NVarChar(MAX);
}

function bindParams(request: Request, params: unknown[]): void {
    params.forEach((value, index) => {
        request.input(`p${index + 1}`, toSqlType(value), value ?? null);
    });
}

function toQueryResult<T>(result: IResult<unknown>): QueryResult<T> {
    return {
        rows: (result.recordset ?? []) as T[],
        rowCount: result.rowsAffected[0] ?? 0,
    };
}

async function runQuery<T>(
    request: Request,
    text: string,
    params: unknown[]
): Promise<QueryResult<T>> {
    bindParams(request, params);
    return toQueryResult<T>(await request.query(text));
}

export async function query<T>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const connection = await getPool();
    return runQuery<T>(connection.request(), text, params);
}

/**
 * Opens a transaction and returns a session whose queries run inside it.
 * Callers decide commit/rollback so 404-style early exits can roll back.
 */
export async function beginTransaction(): Promise<DbSession> {
    const connection = await getPool();
    const transaction = new Transaction(connection);
    await transaction.begin();

    return {
        query<T>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
            return runQuery<T>(transaction.request(), text, params);
        },
        commit: () => transaction.commit(),
        rollback: () => transaction.rollback(),
    };
}

export async function close(): Promise<void> {
    connecting = null;
    await pool.close().catch(() => undefined);
}

const db = { query, beginTransaction, getPool, close };

export default db;
