import { describe, expect, it } from 'vitest';
import { loadAuthConfig } from '../../../config/auth';

const SECRET = 'x'.repeat(32);

describe('loadAuthConfig', () => {
    it('returns the secret and the default lifetimes', () => {
        expect(loadAuthConfig({ JWT_SECRET: SECRET })).toEqual({
            jwtSecret: SECRET,
            jwtExpiresInSeconds: 3600,
            refreshTokenTtlDays: 30,
            refreshReuseGraceSeconds: 30,
        });
    });

    it('reads a custom access lifetime', () => {
        expect(
            loadAuthConfig({ JWT_SECRET: SECRET, JWT_EXPIRES_IN: '120' }).jwtExpiresInSeconds
        ).toBe(120);
    });

    it('reads a custom refresh lifetime and grace window', () => {
        const config = loadAuthConfig({
            JWT_SECRET: SECRET,
            REFRESH_TOKEN_TTL_DAYS: '7',
            REFRESH_REUSE_GRACE_SECONDS: '0',
        });

        expect(config.refreshTokenTtlDays).toBe(7);
        expect(config.refreshReuseGraceSeconds).toBe(0);
    });

    it('treats blank values as defaults', () => {
        const config = loadAuthConfig({
            JWT_SECRET: SECRET,
            JWT_EXPIRES_IN: '   ',
            REFRESH_TOKEN_TTL_DAYS: ' ',
            REFRESH_REUSE_GRACE_SECONDS: '',
        });

        expect(config.jwtExpiresInSeconds).toBe(3600);
        expect(config.refreshTokenTtlDays).toBe(30);
        expect(config.refreshReuseGraceSeconds).toBe(30);
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
        'rejects an invalid access lifetime (%s)',
        (jwtExpiresIn) => {
            expect(() =>
                loadAuthConfig({ JWT_SECRET: SECRET, JWT_EXPIRES_IN: jwtExpiresIn })
            ).toThrow(/JWT_EXPIRES_IN/);
        }
    );

    it.each(['abc', '0', '-1', '1.5', '366'])(
        'rejects an invalid refresh lifetime (%s)',
        (refreshTokenTtlDays) => {
            expect(() =>
                loadAuthConfig({
                    JWT_SECRET: SECRET,
                    REFRESH_TOKEN_TTL_DAYS: refreshTokenTtlDays,
                })
            ).toThrow(/REFRESH_TOKEN_TTL_DAYS/);
        }
    );

    it.each(['abc', '-1', '1.5', '301'])(
        'rejects an invalid reuse grace window (%s)',
        (refreshReuseGraceSeconds) => {
            expect(() =>
                loadAuthConfig({
                    JWT_SECRET: SECRET,
                    REFRESH_REUSE_GRACE_SECONDS: refreshReuseGraceSeconds,
                })
            ).toThrow(/REFRESH_REUSE_GRACE_SECONDS/);
        }
    );
});
