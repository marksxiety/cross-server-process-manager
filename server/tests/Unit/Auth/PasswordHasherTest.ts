import { describe, expect, it } from 'vitest';
import {
    hashPassword,
    verifyPassword,
    type ScryptParams,
} from '../../../src/Auth/PasswordHasher';

const FAST_PARAMS: ScryptParams = { N: 1024, r: 8, p: 1, keylen: 32 };

describe('hashPassword', () => {
    it('produces a scrypt-encoded hash that verifies', async () => {
        const hash = await hashPassword('correct-horse', FAST_PARAMS);

        expect(hash.startsWith('scrypt$1024$8$1$')).toBe(true);
        await expect(verifyPassword('correct-horse', hash)).resolves.toBe(true);
    });

    it('rejects the wrong password', async () => {
        const hash = await hashPassword('correct-horse', FAST_PARAMS);

        await expect(verifyPassword('wrong-horse', hash)).resolves.toBe(false);
    });

    it('uses a unique salt per hash', async () => {
        const first = await hashPassword('same-password', FAST_PARAMS);
        const second = await hashPassword('same-password', FAST_PARAMS);

        expect(first).not.toBe(second);
    });

    it('never stores the plaintext password', async () => {
        const hash = await hashPassword('correct-horse', FAST_PARAMS);

        expect(hash).not.toContain('correct-horse');
    });

    it('rejects malformed stored hashes without throwing', async () => {
        await expect(verifyPassword('anything', 'not-a-hash')).resolves.toBe(false);
        await expect(verifyPassword('anything', 'scrypt$0$8$1$abc$def')).resolves.toBe(false);
        await expect(verifyPassword('anything', 'bcrypt$16384$8$1$abc$def')).resolves.toBe(false);
    });

    it('fits the users.password_hash column at default cost', async () => {
        const hash = await hashPassword('correct-horse');

        expect(hash.length).toBeLessThanOrEqual(255);
    });

    it('rejects invalid parameters', async () => {
        await expect(
            hashPassword('correct-horse', { N: 0, r: 8, p: 1, keylen: 32 })
        ).rejects.toThrow(TypeError);
    });
});
