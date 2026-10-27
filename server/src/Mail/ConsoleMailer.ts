import type { Mailer, MailMessage } from './Mailer';

/** Development fallback: writes the email body (including links) to the console. */
export class ConsoleMailer implements Mailer {
    async send(message: MailMessage): Promise<void> {
        console.log(
            `[mail] to=${message.to} subject="${message.subject}"\n${message.text}`
        );
    }
}
