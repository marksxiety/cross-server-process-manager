import nodemailer, { type Transporter } from 'nodemailer';
import type { SmtpConfig } from '../../config/mail';
import type { Mailer, MailMessage } from './Mailer';

export class SmtpMailer implements Mailer {
    private readonly transporter: Transporter;

    constructor(private readonly settings: SmtpConfig) {
        this.transporter = nodemailer.createTransport({
            host: settings.host,
            port: settings.port,
            secure: settings.secure,
            requireTLS: !settings.secure,
            auth: {
                user: settings.user,
                pass: settings.password,
            },
        });
    }

    async send(message: MailMessage): Promise<void> {
        await this.transporter.sendMail({
            from: this.settings.from,
            to: message.to,
            subject: message.subject,
            text: message.text,
        });
    }
}
