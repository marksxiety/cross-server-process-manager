import { describe, expect, it } from 'vitest';
import { loadMailConfig } from '../../../config/mail';

const BASE_URL = 'https://xpm.example.com';

describe('loadMailConfig', () => {
    it('uses an explicit link base URL and console mail', () => {
        const config = loadMailConfig({ AUTH_LINK_BASE_URL: BASE_URL });

        expect(config).toEqual({
            linkBaseUrl: BASE_URL,
            linkTtlMinutes: 30,
            smtp: null,
        });
    });

    it('strips a trailing slash from the explicit base URL', () => {
        expect(
            loadMailConfig({ AUTH_LINK_BASE_URL: `${BASE_URL}/` }).linkBaseUrl
        ).toBe(BASE_URL);
    });

    it('derives the base URL from the VITE settings', () => {
        const config = loadMailConfig({
            VITE_SERVER_PROTOCOL: 'https',
            VITE_SERVER_HOST: 'xpm.example.com',
            VITE_WEB_PORT: '8443',
        });

        expect(config.linkBaseUrl).toBe('https://xpm.example.com:8443');
    });

    it('defaults the protocol to http when deriving', () => {
        const config = loadMailConfig({
            VITE_SERVER_HOST: 'localhost',
            VITE_WEB_PORT: '3502',
        });

        expect(config.linkBaseUrl).toBe('http://localhost:3502');
    });

    it('prefers AUTH_LINK_BASE_URL over the VITE settings', () => {
        const config = loadMailConfig({
            AUTH_LINK_BASE_URL: BASE_URL,
            VITE_SERVER_HOST: 'localhost',
            VITE_WEB_PORT: '3502',
        });

        expect(config.linkBaseUrl).toBe(BASE_URL);
    });

    it('reads an SMTP configuration and defaults the sender', () => {
        const config = loadMailConfig({
            AUTH_LINK_BASE_URL: BASE_URL,
            MAIL_HOST: 'smtp.example.com',
            MAIL_USER: 'mailer@example.com',
            MAIL_PASS: 'secret',
        });

        expect(config.smtp).toEqual({
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            user: 'mailer@example.com',
            password: 'secret',
            from: 'mailer@example.com',
        });
    });

    it('defaults secure to true for port 465', () => {
        const config = loadMailConfig({
            AUTH_LINK_BASE_URL: BASE_URL,
            MAIL_HOST: 'smtp.example.com',
            MAIL_PORT: '465',
            MAIL_USER: 'mailer@example.com',
            MAIL_PASS: 'secret',
            MAIL_FROM: 'XPM <xpm@example.com>',
        });

        expect(config.smtp?.secure).toBe(true);
        expect(config.smtp?.from).toBe('XPM <xpm@example.com>');
    });

    it('rejects an invalid explicit base URL', () => {
        expect(() => loadMailConfig({ AUTH_LINK_BASE_URL: 'xpm.example.com' })).toThrow(
            /must start with http/
        );
    });

    it('rejects a missing VITE_SERVER_HOST when deriving', () => {
        expect(() => loadMailConfig({ VITE_WEB_PORT: '3502' })).toThrow(
            /VITE_SERVER_HOST is not set/
        );
    });

    it('rejects a missing VITE_WEB_PORT when deriving', () => {
        expect(() => loadMailConfig({ VITE_SERVER_HOST: 'localhost' })).toThrow(
            /VITE_WEB_PORT is not set/
        );
    });

    it.each(['0', '-1', '1.5', '66000'])(
        'rejects an invalid VITE_WEB_PORT (%s)',
        (port) => {
            expect(() =>
                loadMailConfig({
                    VITE_SERVER_HOST: 'localhost',
                    VITE_WEB_PORT: port,
                })
            ).toThrow(/VITE_WEB_PORT/);
        }
    );

    it('rejects an invalid VITE_SERVER_PROTOCOL', () => {
        expect(() =>
            loadMailConfig({
                VITE_SERVER_HOST: 'localhost',
                VITE_WEB_PORT: '3502',
                VITE_SERVER_PROTOCOL: 'ftp',
            })
        ).toThrow(/VITE_SERVER_PROTOCOL/);
    });

    it.each(['0', '-1', '1.5', '1441'])('rejects an invalid link ttl (%s)', (ttl) => {
        expect(() =>
            loadMailConfig({ AUTH_LINK_BASE_URL: BASE_URL, AUTH_LINK_TTL_MINUTES: ttl })
        ).toThrow(/AUTH_LINK_TTL_MINUTES/);
    });

    it('rejects SMTP without credentials', () => {
        expect(() =>
            loadMailConfig({ AUTH_LINK_BASE_URL: BASE_URL, MAIL_HOST: 'smtp.example.com' })
        ).toThrow(/MAIL_USER and MAIL_PASS/);
    });
});
