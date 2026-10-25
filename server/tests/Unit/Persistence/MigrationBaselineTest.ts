import { describe, expect, it } from 'vitest';
import { selectBaselineNames } from '../../../src/Persistence/MigrationBaseline';

const available = ['001_create-a.js', '002_create-b.js', '003_create-c.js'];

describe('selectBaselineNames', () => {
    it('should return every missing migration for --all', () => {
        expect(selectBaselineNames(available, new Set(['001_create-a.js']), '--all')).toEqual([
            '002_create-b.js',
            '003_create-c.js',
        ]);
    });

    it('should return no names when --all has nothing missing', () => {
        expect(selectBaselineNames(available, new Set(available), '--all')).toEqual([]);
    });

    it('should return the named migration when it is pending', () => {
        expect(selectBaselineNames(available, new Set(), '002_create-b.js')).toEqual([
            '002_create-b.js',
        ]);
    });

    it('should return no names when the named migration is already applied', () => {
        expect(selectBaselineNames(available, new Set(['002_create-b.js']), '002_create-b.js')).toEqual(
            []
        );
    });

    it('should reject a missing target', () => {
        expect(() => selectBaselineNames(available, new Set(), undefined)).toThrow(/Usage/);
    });

    it('should reject an unknown migration', () => {
        expect(() => selectBaselineNames(available, new Set(), '999_missing.js')).toThrow(
            /Unknown migration/
        );
    });
});
