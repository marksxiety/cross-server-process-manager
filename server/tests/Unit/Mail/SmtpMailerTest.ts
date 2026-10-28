import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('nodemailer', () => ({
    default: { createTransport: vi.fn() },
}));

import nodemailer from 'nodemailer';
import { SmtpMailer } from '../../../src/Mail/SmtpMailer';

const sendMail = vi.fn();
const createTransport = vi.mocked(nodemailer.createTransport);

const SETTINGS = {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    user: 'mailer@example.com',
    password: 'secret',
    from: 'XPM <mailer@example.com>',
};

beforeEach(() => {
    sendMail.mockReset().mockResolvedValue(undefined);
    createTransport
        .mockReset()
        .mockReturnValue({ sendMail } as unknown as ReturnType<typeof nodemailer.createTransport>);
});

describe('SmtpMailer', () => {
    it('passes both text and html to the transporter', async () => {
        const mailer = new SmtpMailer(SETTINGS);

        await mailer.send({
            to: 'user@example.com',
            subject: 'Subject',
            text: 'Plain text',
            html: '<p>HTML</p>',
        });

        expect(sendMail).toHaveBeenCalledWith({
            from: SETTINGS.from,
            to: 'user@example.com',
            subject: 'Subject',
            text: 'Plain text',
            html: '<p>HTML</p>',
        });
    });

    it('leaves html undefined when no HTML is supplied', async () => {
        const mailer = new SmtpMailer(SETTINGS);

        await mailer.send({
            to: 'user@example.com',
            subject: 'Subject',
            text: 'Plain text',
        });

        expect(sendMail).toHaveBeenCalledWith(
            expect.objectContaining({ html: undefined })
        );
    });

    it('forces STARTTLS for port 587', () => {
        new SmtpMailer(SETTINGS);

        expect(createTransport).toHaveBeenCalledWith(
            expect.objectContaining({
                host: 'smtp.example.com',
                port: 587,
                secure: false,
                requireTLS: true,
            })
        );
    });
});
