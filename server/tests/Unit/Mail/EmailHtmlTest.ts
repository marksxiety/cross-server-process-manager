import { describe, expect, it } from 'vitest';
import { escapeHtml, renderEmail, type EmailContent } from '../../../src/Mail/emailHtml';

const CONTENT: EmailContent = {
    subject: 'Verify your email address for XPM',
    preheader: 'Finish creating your XPM account.',
    heading: 'Verify your email',
    description: 'We sent a verification link to mark@example.com.',
    greeting: 'Hi <Mark>,',
    paragraphs: ['Open the button below to set your password.'],
    ctaLabel: 'Verify email',
    link: 'https://app.test/verify-email?token=raw-token',
    note: 'This link expires in 30 minutes and can only be used once.',
};

describe('escapeHtml', () => {
    it('escapes HTML-sensitive characters', () => {
        expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
            '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;'
        );
    });

    it('leaves safe text unchanged', () => {
        expect(escapeHtml('Hi Mark,')).toBe('Hi Mark,');
    });
});

describe('renderEmail', () => {
    const rendered = renderEmail(CONTENT);

    it('renders the subject, text and html', () => {
        expect(rendered.subject).toBe(CONTENT.subject);
        expect(rendered.text).toContain(CONTENT.heading);
        expect(rendered.text).toContain(CONTENT.description);
        expect(rendered.html).toContain(`<title>${CONTENT.subject}</title>`);
    });

    it('renders the compact app-style card without an image', () => {
        expect(rendered.html).toContain('width="384"');
        expect(rendered.html).toContain('max-width:384px');
        expect(rendered.html).toContain('>XPM</p>');
        expect(rendered.html).toContain('>Verify your email</h1>');
        expect(rendered.html).toContain(CONTENT.description);
        expect(rendered.html).not.toContain('<img');
    });

    it('renders the full-width button and footer', () => {
        expect(rendered.html).toContain(`href="${CONTENT.link}"`);
        expect(rendered.html).toContain('>Verify email</a>');
        expect(rendered.html).toContain('width:100%');
        expect(rendered.html).toContain(
            'This is an automated message from XPM. Please do not reply.'
        );
    });

    it('keeps the URL in the href but not as visible text', () => {
        expect(rendered.html).toContain(`href="${CONTENT.link}"`);
        expect(rendered.html).not.toContain(`>${CONTENT.link}<`);
        expect(rendered.text).toContain(CONTENT.link);
    });

    it('escapes dynamic values in HTML but keeps them readable in plain text', () => {
        const dangerous = renderEmail({
            ...CONTENT,
            greeting: 'Hi <script>alert("x")</script>,',
        });

        expect(dangerous.html).toContain(
            'Hi &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;,'
        );
        expect(dangerous.html).not.toContain('<script>');
        expect(dangerous.text).toContain('<script>alert("x")</script>');
    });

    it('includes the preheader and expiry note', () => {
        expect(rendered.html).toContain(CONTENT.preheader);
        expect(rendered.html).toContain(CONTENT.note);
    });

    it('omits an empty description', () => {
        const email = renderEmail({ ...CONTENT, description: '' });

        expect(email.html).not.toContain(CONTENT.description);
        expect(email.text).not.toContain(CONTENT.description);
    });
});
