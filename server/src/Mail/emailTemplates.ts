import { renderEmail, type EmailContent, type RenderedEmail } from './emailHtml';

export interface LinkEmailInput {
    name: string;
    email: string;
    link: string;
    expiresInMinutes: number;
}

function greetingFor(name: string): string {
    const trimmed = name.trim();
    return trimmed === '' ? 'Hi,' : `Hi ${trimmed},`;
}

export function verificationEmail(input: LinkEmailInput): RenderedEmail {
    const content: EmailContent = {
        subject: 'Verify your email address for XPM',
        preheader: 'Finish creating your XPM account.',
        heading: 'Verify your email',
        description: '',
        greeting: greetingFor(input.name),
        paragraphs: [
            'Open the button below to set your password and finish creating your account.',
        ],
        ctaLabel: 'Verify email',
        link: input.link,
        note: `This link expires in ${input.expiresInMinutes} minutes and can only be used once.`,
    };

    return renderEmail(content);
}

export function passwordResetEmail(input: LinkEmailInput): RenderedEmail {
    const content: EmailContent = {
        subject: 'Reset your XPM password',
        preheader: 'Use this link to choose a new password.',
        heading: 'Reset your password',
        description: `We received a request to reset the password for ${input.email}.`,
        greeting: greetingFor(input.name),
        paragraphs: ['Open the button below to choose a new password.'],
        ctaLabel: 'Reset password',
        link: input.link,
        note: `This link expires in ${input.expiresInMinutes} minutes and can only be used once.`,
    };

    return renderEmail(content);
}
