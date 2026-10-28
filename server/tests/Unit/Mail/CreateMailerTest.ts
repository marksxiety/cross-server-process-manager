import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MailConfig } from '../../../config/mail';
import { ConsoleMailer } from '../../../src/Mail/ConsoleMailer';
import { createMailer } from '../../../src/Mail/createMailer';
import { SmtpMailer } from '../../../src/Mail/SmtpMailer';

const BASE: MailConfig = {
    linkBaseUrl: 'https://xpm.example.com',
    linkTtlMinutes: 30,
    smtp: null,
};

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe('createMailer', () => {
    it('uses SMTP when it is configured', () => {
        const mailer = createMailer({
            ...BASE,
            smtp: {
                host: 'smtp.example.com',
                port: 587,
                secure: false,
                user: 'mailer@example.com',
                password: 'secret',
                from: 'mailer@example.com',
            },
        });

        expect(mailer).toBeInstanceOf(SmtpMailer);
    });

    it('falls back to the console outside production', () => {
        vi.stubEnv('NODE_ENV', 'development');
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        expect(createMailer(BASE)).toBeInstanceOf(ConsoleMailer);
    });

    it('refuses to run without SMTP in production', () => {
        vi.stubEnv('NODE_ENV', 'production');

        expect(() => createMailer(BASE)).toThrow(/MAIL_HOST is not set/);
    });
});
