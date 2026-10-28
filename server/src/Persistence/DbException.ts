import { DatabaseException } from '../Exceptions/DatabaseException';
import { describeDbError } from './DatabaseError';

/** Wraps a driver error in a DatabaseException with its SQL Server error number. */
export function databaseException(error: unknown, fallback: string): DatabaseException {
    const dbError = describeDbError(error);
    return new DatabaseException(
        dbError.message || fallback,
        dbError.number !== undefined ? String(dbError.number) : 'INTERNAL_SERVER_ERROR',
        { cause: error }
    );
}
