import { describe, expect, it } from 'vitest';
import { loadAuthConfig } from '../../../config/auth';

const SECRET = 'x'.repeat(32);

describe('loadAuthConfig', () => {
    it('returns the secret and the default lifetime', () => {
        expect(loadAuthConfig({ JWT_SECRET: SECRET })).toEqual({
            jwtSecret: SECRET,
            jwtExpiresInSeconds: 3600,
        });
    });

    it('reads a custom lifetime', () => {
        expect(
            loadAuthConfig({ JWT_SECRET: SECRET, JWT_EXPIRES_IN: '120' }).jwtExpiresInSeconds
        ).toBe(120);
    });

    it('treats a blank lifetime as the default', () => {
        expect(
            loadAuthConfig({ JWT_SECRET: SECRET, JWT_EXPIRES_IN: '   ' }).jwtExpiresInSeconds
        ).toBe(3600);
    });

    it('rejects a missing secret', () => {
        expect(() => loadAuthConfig({})).toThrow(/JWT_SECRET is not set/);
    });

    it('rejects a short secret', () => {
        expect(() => loadAuthConfig({ JWT_SECRET: 'too-short' })).toThrow(
            /at least 32 characters/
        );
    });

    it.each(['abc', '0', '-1', '1.5', '604801'])(
        'rejects an invalid lifetime (%s)',
        (jwtExpiresIn) => {
            expect(() =>
                loadAuthConfig({ JWT_SECRET: SECRET, JWT_EXPIRES_IN: jwtExpiresIn })
            ).toThrow(/JWT_EXPIRES_IN/);
        }
    );
});
