import { hashPassword } from '../Auth/PasswordHasher';
import { AuthTokenService } from '../Auth/AuthTokenService';
import { linkAlreadyUsed, linkExpired, linkInvalid } from '../Auth/LinkErrors';
import { passwordResetEmail } from '../Mail/emailTemplates';
import type { Mailer } from '../Mail/Mailer';
import { User } from '../Models/User';
import { databaseException } from '../Persistence/DbException';

const RESET_PURPOSE = 'reset' as const;

export const PASSWORD_RESET_GENERIC_MESSAGE =
    'If an account exists for that email, we sent a password reset link.';

export interface PasswordResetRequestResult {
    userId: number | null;
    sent: boolean;
}

export interface PasswordResetResult {
    userId: number;
}

export class PasswordResetService {
    constructor(
        private readonly tokens: AuthTokenService,
        private readonly mailer: Mailer,
        private readonly linkBaseUrl: string,
        private readonly linkTtlMinutes: number
    ) {}

    /** Requests a reset link without revealing whether the account exists. */
    async request(email: string): Promise<PasswordResetRequestResult> {
        let user;
        try {
            user = await User.findByEmail(email);
        } catch (error) {
            throw databaseException(error, 'Failed to request a password reset');
        }

        if (!user || !user.is_active) {
            return { userId: null, sent: false };
        }

        const token = await this.tokens.issue(user.id, RESET_PURPOSE);
        const link = `${this.linkBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
        const rendered = passwordResetEmail({
            name: user.name,
            email: user.email,
            link,
            expiresInMinutes: this.linkTtlMinutes,
        });

        try {
            await this.mailer.send({ to: user.email, ...rendered });
            return { userId: user.id, sent: true };
        } catch (error) {
            console.error('Failed to send the password reset email', error);
            return { userId: user.id, sent: false };
        }
    }

    async reset(token: string, password: string): Promise<PasswordResetResult> {
        const result = await this.tokens.consume(token, RESET_PURPOSE);

        if (result.status !== 'consumed') {
            switch (result.status) {
                case 'invalid':
                    throw linkInvalid();
                case 'expired':
                    throw linkExpired();
                case 'used':
                    throw linkAlreadyUsed();
            }
        }

        const passwordHash = await hashPassword(password);
        const user = await User.updatePassword(result.userId, passwordHash);
        if (!user) {
            throw linkInvalid();
        }

        await this.tokens.invalidate(result.userId, RESET_PURPOSE);
        return { userId: result.userId };
    }
}
