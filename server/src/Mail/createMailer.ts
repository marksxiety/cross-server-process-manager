import type { MailConfig } from '../../config/mail';
import { ConsoleMailer } from './ConsoleMailer';
import type { Mailer } from './Mailer';
import { SmtpMailer } from './SmtpMailer';

export function createMailer(config: MailConfig): Mailer {
    if (!config.smtp) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error(
                'MAIL_HOST is not set - verification and password reset emails cannot be sent in production'
            );
        }
        console.warn(
            'MAIL_HOST is not set - verification and password reset links will be logged to the console.'
        );
        return new ConsoleMailer();
    }
    return new SmtpMailer(config.smtp);
}
