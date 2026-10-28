export interface EmailContent {
    subject: string;
    preheader: string;
    heading: string;
    description: string;
    greeting: string;
    paragraphs: string[];
    ctaLabel: string;
    link: string;
    note: string;
}

export interface RenderedEmail {
    subject: string;
    text: string;
    html: string;
}

const FOOTER = 'This is an automated message from XPM. Please do not reply.';

const FONT = 'Arial, Helvetica, sans-serif';

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderText(content: EmailContent): string {
    const lines = ['XPM', '', content.heading];

    if (content.description.trim() !== '') {
        lines.push('', content.description);
    }

    lines.push('', content.greeting);

    for (const paragraph of content.paragraphs) {
        lines.push('', paragraph);
    }

    lines.push(
        '',
        `${content.ctaLabel}: ${content.link}`,
        '',
        content.note,
        '',
        FOOTER
    );

    return lines.join('\n');
}

function renderHtml(content: EmailContent): string {
    const subject = escapeHtml(content.subject);
    const preheader = escapeHtml(content.preheader);
    const heading = escapeHtml(content.heading);
    const description = escapeHtml(content.description);
    const greeting = escapeHtml(content.greeting);
    const cta = escapeHtml(content.ctaLabel);
    const link = escapeHtml(content.link);
    const note = escapeHtml(content.note);

    const paragraphs = content.paragraphs
        .map(
            (paragraph) =>
                `<p style="margin:0 0 12px;font-family:${FONT};font-size:14px;line-height:1.6;color:#3f3f46;">${escapeHtml(
                    paragraph
                )}</p>`
        )
        .join('');

    const descriptionHtml =
        content.description.trim() === ''
            ? ''
            : `<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:#71717a;">${description}</p>`;

    return `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f4f4f5" style="border-collapse:collapse;background-color:#f4f4f5;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="384" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:384px;border-collapse:separate;border-spacing:0;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:8px;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          <tr>
            <td style="padding:16px 16px 0;">
              <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;line-height:1.4;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;">XPM</p>
              <h1 style="margin:0 0 4px;font-family:${FONT};font-size:18px;line-height:1.3;font-weight:600;color:#18181b;">${heading}</h1>
              ${descriptionHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px;">
              <p style="margin:0 0 12px;font-family:${FONT};font-size:14px;line-height:1.6;color:#3f3f46;">${greeting}</p>
              ${paragraphs}
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" bgcolor="#18181b" style="background-color:#18181b;border-radius:6px;">
                    <a href="${link}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;box-sizing:border-box;padding:12px 20px;font-family:${FONT};font-size:14px;line-height:1.2;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;text-align:center;">${cta}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:#71717a;text-align:center;">${note}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px;border-top:1px solid #e4e4e7;font-family:${FONT};font-size:12px;line-height:1.5;color:#71717a;text-align:center;">${escapeHtml(
                FOOTER
            )}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderEmail(content: EmailContent): RenderedEmail {
    return {
        subject: content.subject,
        text: renderText(content),
        html: renderHtml(content),
    };
}
