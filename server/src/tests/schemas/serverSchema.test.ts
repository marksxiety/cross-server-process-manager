import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { serverInputSchema } from '../../schemas/serverSchema';

const VALID_INPUT = {
    server: 'app-1',
    protocol: 'http',
    host: '127.0.0.1',
    port: 4000,
};

function fieldErrors(input: unknown): Record<string, string[] | undefined> {
    const result = serverInputSchema.safeParse(input);
    if (result.success) {
        throw new Error('Expected parsing to fail, but it succeeded');
    }
    return z.flattenError(result.error).fieldErrors;
}

describe('serverInputSchema', () => {
    it('accepts a valid payload and leaves is_active undefined', () => {
        const result = serverInputSchema.safeParse(VALID_INPUT);

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data).toEqual({ ...VALID_INPUT, is_active: undefined });
    });

    it('trims server and host', () => {
        const result = serverInputSchema.safeParse({
            ...VALID_INPUT,
            server: '  app-1  ',
            host: '  10.0.0.1  ',
        });

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.server).toBe('app-1');
        expect(result.data.host).toBe('10.0.0.1');
    });

    it('coerces a numeric string port', () => {
        const result = serverInputSchema.safeParse({ ...VALID_INPUT, port: '4000' });

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.port).toBe(4000);
    });

    it('accepts a boolean is_active', () => {
        const result = serverInputSchema.safeParse({ ...VALID_INPUT, is_active: false });

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.is_active).toBe(false);
    });

    it('rejects a missing server name', () => {
        expect(fieldErrors({ ...VALID_INPUT, server: undefined }).server).toContain(
            'Server name is required'
        );
    });

    it('rejects a server name that is empty after trimming', () => {
        expect(fieldErrors({ ...VALID_INPUT, server: '   ' }).server).toContain(
            'Server name is required'
        );
    });

    it('rejects a server name longer than 100 characters', () => {
        expect(fieldErrors({ ...VALID_INPUT, server: 'x'.repeat(101) }).server).toContain(
            'Server name must be 100 characters or less'
        );
    });

    it('rejects a missing host', () => {
        expect(fieldErrors({ ...VALID_INPUT, host: undefined }).host).toContain(
            'Host is required'
        );
    });

    it('rejects a host that is empty after trimming', () => {
        expect(fieldErrors({ ...VALID_INPUT, host: '   ' }).host).toContain('Host is required');
    });

    it('rejects a host longer than 255 characters', () => {
        expect(fieldErrors({ ...VALID_INPUT, host: 'x'.repeat(256) }).host).toContain(
            'Host must be 255 characters or less'
        );
    });

    it('rejects a protocol outside http/https', () => {
        expect(fieldErrors({ ...VALID_INPUT, protocol: 'ftp' }).protocol).toContain(
            'Protocol must be either http or https'
        );
    });

    it('rejects a missing protocol', () => {
        expect(fieldErrors({ ...VALID_INPUT, protocol: undefined }).protocol).toBeDefined();
    });

    it('rejects a non-numeric port', () => {
        expect(fieldErrors({ ...VALID_INPUT, port: 'abc' }).port).toContain(
            'Port must be a number'
        );
    });

    it('rejects a fractional port', () => {
        expect(fieldErrors({ ...VALID_INPUT, port: 80.5 }).port).toContain(
            'Port must be a whole number'
        );
    });

    it('rejects a port below 1', () => {
        expect(fieldErrors({ ...VALID_INPUT, port: 0 }).port).toContain(
            'Port must be at least 1'
        );
    });

    it('rejects a port above 65535', () => {
        expect(fieldErrors({ ...VALID_INPUT, port: 65536 }).port).toContain(
            'Port must be 65535 or less'
        );
    });

    it('rejects a non-boolean is_active', () => {
        expect(fieldErrors({ ...VALID_INPUT, is_active: 'true' }).is_active).toContain(
            'Active must be a boolean'
        );
    });
});
