import type { ConnectionPool } from 'mssql';
import { describe, expect, it, vi } from 'vitest';
import { isDatabaseAlreadyExistsError } from '../../utils/dbError';
import { ensureDatabaseExists } from '../../utils/ensureDatabase';
import { quoteIdentifier } from '../../utils/sql';

function mockPool(options: {
    existingNames: string[];
    onCreate?: (text: string) => Promise<unknown>;
    seenQueries?: string[];
}): ConnectionPool {
    const seenQueries = options.seenQueries ?? [];
    const request = () => {
        const req: {
            input: (...args: unknown[]) => typeof req;
            query: (text: string) => Promise<{ recordset: { name: string }[] }>;
        } = {
            input: (..._args: unknown[]) => req,
            query: async (text: string) => {
                seenQueries.push(text);
                if (text.includes('sys.databases')) {
                    return { recordset: options.existingNames.map((name) => ({ name })) };
                }
                if (options.onCreate) {
                    await options.onCreate(text);
                }
                return { recordset: [] };
            },
        };
        return req;
    };

    return { request } as unknown as ConnectionPool;
}

describe('quoteIdentifier', () => {
    it('should wrap the name in brackets', () => {
        expect(quoteIdentifier('XPM')).toBe('[XPM]');
    });

    it('should escape closing brackets', () => {
        expect(quoteIdentifier('my]db')).toBe('[my]]db]');
    });
});

describe('isDatabaseAlreadyExistsError', () => {
    it('should return true for SQL Server error 1801', () => {
        expect(isDatabaseAlreadyExistsError({ number: 1801, message: 'exists' })).toBe(true);
    });

    it('should return true for nested originalError info', () => {
        expect(
            isDatabaseAlreadyExistsError({
                originalError: { info: { number: 1801, message: 'exists' } },
            })
        ).toBe(true);
    });

    it('should return false for other error numbers', () => {
        expect(isDatabaseAlreadyExistsError({ number: 547, message: 'check' })).toBe(false);
    });

    it('should return false when there is no error number', () => {
        expect(isDatabaseAlreadyExistsError(new Error('boom'))).toBe(false);
    });
});

describe('ensureDatabaseExists', () => {
    it('should return existed without creating when the database is listed', async () => {
        const onCreate = vi.fn(async () => undefined);
        const pool = mockPool({ existingNames: ['XPM'], onCreate });

        const result = await ensureDatabaseExists(pool, 'XPM');

        expect(result).toBe('existed');
        expect(onCreate).not.toHaveBeenCalled();
    });

    it('should create the database when it is missing', async () => {
        const seenQueries: string[] = [];
        const pool = mockPool({ existingNames: [], seenQueries });

        const result = await ensureDatabaseExists(pool, 'XPM');

        expect(result).toBe('created');
        expect(seenQueries).toContain('CREATE DATABASE [XPM]');
    });

    it('should quote the database name in CREATE DATABASE', async () => {
        const seenQueries: string[] = [];
        const pool = mockPool({ existingNames: [], seenQueries });

        await ensureDatabaseExists(pool, 'my]db');

        expect(seenQueries).toContain('CREATE DATABASE [my]]db]');
    });

    it('should return existed when CREATE loses a concurrent race (error 1801)', async () => {
        const pool = mockPool({
            existingNames: [],
            onCreate: async () => {
                throw { number: 1801, message: 'Database already exists' };
            },
        });

        const result = await ensureDatabaseExists(pool, 'XPM');

        expect(result).toBe('existed');
    });

    it('should rethrow CREATE errors other than 1801', async () => {
        const failure = { number: 2627, message: 'unique violation' };
        const pool = mockPool({
            existingNames: [],
            onCreate: async () => {
                throw failure;
            },
        });

        await expect(ensureDatabaseExists(pool, 'XPM')).rejects.toBe(failure);
    });
});
