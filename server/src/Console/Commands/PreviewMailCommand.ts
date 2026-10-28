import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
    passwordResetEmail,
    verificationEmail,
} from '../../Mail/emailTemplates';

const OUTPUT_DIR = path.resolve(process.cwd(), 'tmp/mail');

async function main(): Promise<void> {
    await mkdir(OUTPUT_DIR, { recursive: true });

    const shared = {
        name: 'Mark',
        email: 'mark@example.com',
        expiresInMinutes: 30,
    };

    const verification = verificationEmail({
        ...shared,
        link: 'http://localhost:3502/verify-email?token=preview-token',
    });
    const reset = passwordResetEmail({
        ...shared,
        link: 'http://localhost:3502/reset-password?token=preview-token',
    });

    await Promise.all([
        writeFile(path.join(OUTPUT_DIR, 'verification.html'), verification.html, 'utf8'),
        writeFile(path.join(OUTPUT_DIR, 'verification.txt'), verification.text, 'utf8'),
        writeFile(path.join(OUTPUT_DIR, 'password-reset.html'), reset.html, 'utf8'),
        writeFile(path.join(OUTPUT_DIR, 'password-reset.txt'), reset.text, 'utf8'),
    ]);

    console.log(`Mail previews written to ${OUTPUT_DIR}`);
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
