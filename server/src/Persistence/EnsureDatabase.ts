import type { ConnectionPool } from 'mssql';
import { isDatabaseAlreadyExistsError } from './DatabaseError';
import { quoteIdentifier } from './Sql';

export type EnsureDatabaseResult = 'created' | 'existed';

/**
 * Idempotently ensures the application database exists.
 * Returns 'existed' when the database is already there (or wins a
 * concurrent CREATE race via SQL Server error 1801), 'created' otherwise.
 * Takes the pool as an argument so tests can inject a mock.
 */
export async function ensureDatabaseExists(
    pool: ConnectionPool,
    database: string
): Promise<EnsureDatabaseResult> {
    const existing = await pool
        .request()
        .input('name', database)
        .query<{ name: string }>('SELECT name FROM sys.databases WHERE name = @name');

    if (existing.recordset.length > 0) {
        return 'existed';
    }

    try {
        await pool.request().query(`CREATE DATABASE ${quoteIdentifier(database)}`);
    } catch (error) {
        if (isDatabaseAlreadyExistsError(error)) {
            return 'existed';
        }
        throw error;
    }

    return 'created';
}
