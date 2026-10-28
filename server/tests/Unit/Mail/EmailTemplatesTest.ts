import { describe, expect, it } from 'vitest';
import {
    passwordResetEmail,
    verificationEmail,
    type LinkEmailInput,
} from '../../../src/Mail/emailTemplates';

const INPUT: LinkEmailInput = {
    name: 'Mark',
    email: 'mark@example.com',
    link: 'https://app.test/verify-email?token=raw-token',
    expiresInMinutes: 30,
};

describe('verificationEmail', () => {
    const email = verificationEmail(INPUT);

    it('uses the verification copy and CTA', () => {
        expect(email.subject).toBe('Verify your email address for XPM');
        expect(email.html).toContain('Verify your email');
        expect(email.html).toContain('>Verify email</a>');
        expect(email.html).toContain('Open the button below');
        expect(email.html).toContain('This link expires in 30 minutes');
    });

    it('hides the URL behind the button and omits the redundant description', () => {
        expect(email.html).not.toContain('We sent a verification link');
        expect(email.text).not.toContain('We sent a verification link');
        expect(email.html).toContain(`href="${INPUT.link}"`);
        expect(email.html).not.toContain(`>${INPUT.link}<`);
        expect(email.text).toContain(INPUT.link);
        expect(email.html).not.toContain('<img');
    });
});

describe('passwordResetEmail', () => {
    const email = passwordResetEmail({
        ...INPUT,
        link: 'https://app.test/reset-password?token=raw-token',
    });

    it('uses the reset copy and CTA', () => {
        expect(email.subject).toBe('Reset your XPM password');
        expect(email.html).toContain('Reset your password');
        expect(email.html).toContain('>Reset password</a>');
        expect(email.html).toContain(
            'We received a request to reset the password for mark@example.com.'
        );
        expect(email.html).toContain('This link expires in 30 minutes');
    });

    it('keeps the reset URL out of the visible HTML and in plain text', () => {
        expect(email.html).toContain(
            'href="https://app.test/reset-password?token=raw-token"'
        );
        expect(email.html).not.toContain(
            '>https://app.test/reset-password?token=raw-token<'
        );
        expect(email.text).toContain('https://app.test/reset-password?token=raw-token');
    });
});

describe('greeting', () => {
    it('escapes a dangerous name in HTML', () => {
        const email = verificationEmail({
            ...INPUT,
            name: '<script>alert(1)</script>',
        });

        expect(email.html).toContain(
            'Hi &lt;script&gt;alert(1)&lt;/script&gt;,'
        );
        expect(email.html).not.toContain('<script>');
    });

    it('falls back to a neutral greeting for a blank name', () => {
        expect(verificationEmail({ ...INPUT, name: '   ' }).text).toContain('Hi,');
    });
});
