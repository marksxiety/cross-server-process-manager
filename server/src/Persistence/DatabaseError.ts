export interface DbErrorInfo {
    number: number | undefined;
    constraint: string | undefined;
    message: string;
}

const CONSTRAINT_PATTERN = /constraint\s+['"]([^'"]+)['"]/i;
const UNIQUE_VIOLATION_NUMBERS = new Set([2627, 2601]);
const CHECK_VIOLATION_NUMBER = 547;

interface SqlErrorShape {
    number?: unknown;
    message?: unknown;
    originalError?: { info?: { number?: unknown; message?: unknown } };
}

function readNumber(value: unknown): number | undefined {
    return typeof value === 'number' ? value : undefined;
}

function readMessage(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Normalizes a driver error into the pieces the API layer maps to user-facing
 * error codes: the SQL Server error number and the violated constraint name.
 */
export function describeDbError(error: unknown): DbErrorInfo {
    const sqlError = (
        typeof error === 'object' && error !== null ? error : {}
    ) as SqlErrorShape;
    const originalInfo = sqlError.originalError?.info;

    const message =
        readMessage(sqlError.message) ??
        readMessage(originalInfo?.message) ??
        'Unknown database error';

    return {
        number: readNumber(sqlError.number) ?? readNumber(originalInfo?.number),
        constraint: CONSTRAINT_PATTERN.exec(message)?.[1],
        message,
    };
}

export function isUniqueViolation(error: DbErrorInfo): boolean {
    return error.number !== undefined && UNIQUE_VIOLATION_NUMBERS.has(error.number);
}

export function isCheckViolation(error: DbErrorInfo): boolean {
    return error.number === CHECK_VIOLATION_NUMBER;
}

const DATABASE_ALREADY_EXISTS_NUMBER = 1801;
const OBJECT_ALREADY_EXISTS_NUMBERS = new Set([1913, 2705, 2714]);

/** True when CREATE DATABASE lost a race and the database now exists. */
export function isDatabaseAlreadyExistsError(error: unknown): boolean {
    return describeDbError(error).number === DATABASE_ALREADY_EXISTS_NUMBER;
}

/** True when DDL failed because the table, column, or constraint already exists. */
export function isObjectAlreadyExistsError(error: unknown): boolean {
    const number = describeDbError(error).number;
    return number !== undefined && OBJECT_ALREADY_EXISTS_NUMBERS.has(number);
}
