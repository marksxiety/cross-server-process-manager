import { describe, expect, it } from 'vitest';
import { isObjectAlreadyExistsError } from '../../../src/Persistence/DatabaseError';

describe('isObjectAlreadyExistsError', () => {
    it.each([1913, 2705, 2714])('should return true for SQL Server error %i', (number) => {
        expect(isObjectAlreadyExistsError({ number, message: 'already exists' })).toBe(true);
    });

    it('should read the nested originalError info', () => {
        expect(
            isObjectAlreadyExistsError({
                originalError: { info: { number: 2714, message: 'already exists' } },
            })
        ).toBe(true);
    });

    it('should return false for unrelated errors', () => {
        expect(isObjectAlreadyExistsError({ number: 547, message: 'check violation' })).toBe(false);
        expect(isObjectAlreadyExistsError(new Error('boom'))).toBe(false);
    });
});
