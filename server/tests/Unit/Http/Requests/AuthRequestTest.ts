import { describe, expect, it } from 'vitest';
import { z, type ZodObject } from 'zod';
import { loginSchema } from '../../../../src/Http/Requests/LoginRequest';
import { registerSchema } from '../../../../src/Http/Requests/RegisterRequest';

const VALID_REGISTER = {
    email: 'admin@example.com',
    name: 'Admin',
    password: 'correct-horse-battery',
};

function fieldErrors(
    schema: ZodObject,
    input: unknown
): Record<string, string[] | undefined> {
    const result = schema.safeParse(input);
    if (result.success) {
        throw new Error('Expected parsing to fail, but it succeeded');
    }
    return z.flattenError(result.error).fieldErrors;
}

describe('registerSchema', () => {
    it('accepts a valid payload', () => {
        const result = registerSchema.safeParse(VALID_REGISTER);

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data).toEqual(VALID_REGISTER);
    });

    it('trims and lowercases email and trims name', () => {
        const result = registerSchema.safeParse({
            ...VALID_REGISTER,
            email: '  Admin@Example.com  ',
            name: '  Admin  ',
        });

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.email).toBe('admin@example.com');
        expect(result.data.name).toBe('Admin');
    });

    it('does not trim the password', () => {
        const result = registerSchema.safeParse({
            ...VALID_REGISTER,
            password: '  spaced  ',
        });

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.password).toBe('  spaced  ');
    });

    it('strips unknown fields such as role', () => {
        const result = registerSchema.safeParse({ ...VALID_REGISTER, role: 'admin' });

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data).not.toHaveProperty('role');
    });

    it('rejects a missing email', () => {
        expect(fieldErrors(registerSchema, { ...VALID_REGISTER, email: undefined }).email).toContain(
            'Email is required'
        );
    });

    it('rejects a malformed email', () => {
        expect(
            fieldErrors(registerSchema, { ...VALID_REGISTER, email: 'not-an-email' }).email
        ).toContain('Email must be a valid email address');
    });

    it('rejects an email longer than 255 characters', () => {
        const email = `${'a'.repeat(246)}@example.com`;

        expect(fieldErrors(registerSchema, { ...VALID_REGISTER, email }).email).toContain(
            'Email must be 255 characters or less'
        );
    });

    it('rejects a blank name', () => {
        expect(
            fieldErrors(registerSchema, { ...VALID_REGISTER, name: '   ' }).name
        ).toContain('Name is required');
    });

    it('rejects a name longer than 100 characters', () => {
        expect(
            fieldErrors(registerSchema, { ...VALID_REGISTER, name: 'x'.repeat(101) }).name
        ).toContain('Name must be 100 characters or less');
    });

    it('rejects a password shorter than 8 characters', () => {
        expect(
            fieldErrors(registerSchema, { ...VALID_REGISTER, password: 'short12' }).password
        ).toContain('Password must be at least 8 characters');
    });

    it('rejects a password longer than 128 characters', () => {
        expect(
            fieldErrors(registerSchema, {
                ...VALID_REGISTER,
                password: 'x'.repeat(129),
            }).password
        ).toContain('Password must be 128 characters or less');
    });
});

describe('loginSchema', () => {
    it('accepts valid credentials and normalizes the email', () => {
        const result = loginSchema.safeParse({
            email: '  Admin@Example.com ',
            password: 'correct-horse-battery',
        });

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.email).toBe('admin@example.com');
    });

    it('rejects a blank password', () => {
        expect(
            fieldErrors(loginSchema, { email: 'admin@example.com', password: '' }).password
        ).toContain('Password is required');
    });

    it('rejects a malformed email', () => {
        expect(
            fieldErrors(loginSchema, { email: 'nope', password: 'secret-password' }).email
        ).toContain('Email must be a valid email address');
    });
});
