import { linkAlreadyUsed, linkExpired, linkInvalid } from '../Auth/LinkErrors';
import { generateLinkToken, hashLinkToken } from '../Auth/LinkTokens';
import { hashPassword } from '../Auth/PasswordHasher';
import { DuplicateResourceException } from '../Exceptions/DuplicateResourceException';
import { HttpException } from '../Exceptions/HttpException';
import { verificationEmail } from '../Mail/emailTemplates';
import type { Mailer } from '../Mail/Mailer';
import { RegistrationRequest } from '../Models/RegistrationRequest';
import { User } from '../Models/User';
import db from '../Persistence/Connection';
import { describeDbError, isUniqueViolation } from '../Persistence/DatabaseError';
import { databaseException } from '../Persistence/DbException';
import { AccessService } from './AccessService';

const EMAIL_TAKEN_CODE = 'EMAIL_TAKEN';
const EMAIL_TAKEN_MESSAGE =
    'An account with this email already exists. Sign in or reset your password.';
const MAIL_DELIVERY_FAILED_CODE = 'MAIL_DELIVERY_FAILED';
const MAIL_DELIVERY_FAILED_MESSAGE =
    'Verification email not sent. We could not send the verification email. ' +
    'Check your connection and try again, or contact your administrator.';

export interface RegistrationInput {
    email: string;
    name: string;
}

export interface RegistrationResult {
    email: string;
    /** Present once an account exists; used for audit attribution only. */
    userId?: number;
}

export class RegistrationService {
    constructor(
        private readonly access: AccessService,
        private readonly mailer: Mailer,
        private readonly linkBaseUrl: string,
        private readonly linkTtlMinutes: number
    ) {}

    async request(data: RegistrationInput): Promise<RegistrationResult> {
        let user;
        try {
            user = await User.findByEmail(data.email);
        } catch (error) {
            throw databaseException(error, 'Failed to start registration');
        }

        if (user) {
            throw new DuplicateResourceException(EMAIL_TAKEN_MESSAGE, EMAIL_TAKEN_CODE);
        }

        const token = generateLinkToken();
        try {
            await RegistrationRequest.upsert({
                email: data.email,
                name: data.name,
                tokenHash: hashLinkToken(token),
                ttlMinutes: this.linkTtlMinutes,
            });
        } catch (error) {
            throw databaseException(error, 'Failed to start registration');
        }

        const sent = await this.sendEmail(data.name, data.email, token);
        if (!sent) {
            throw new HttpException(
                502,
                MAIL_DELIVERY_FAILED_MESSAGE,
                MAIL_DELIVERY_FAILED_CODE
            );
        }

        return { email: data.email };
    }

    /** Reissues a link without revealing whether a pending registration exists. */
    async resend(email: string): Promise<void> {
        let user;
        try {
            user = await User.findByEmail(email);
        } catch (error) {
            throw databaseException(error, 'Failed to resend the registration email');
        }
        if (user) {
            return;
        }

        let pending;
        try {
            pending = await RegistrationRequest.findByEmail(email);
        } catch (error) {
            throw databaseException(error, 'Failed to resend the registration email');
        }
        if (!pending) {
            return;
        }

        const token = generateLinkToken();
        try {
            await RegistrationRequest.upsert({
                email: pending.email,
                name: pending.name,
                tokenHash: hashLinkToken(token),
                ttlMinutes: this.linkTtlMinutes,
            });
        } catch (error) {
            throw databaseException(error, 'Failed to resend the registration email');
        }

        await this.sendEmail(pending.name, pending.email, token);
    }

    async verify(token: string, password: string): Promise<RegistrationResult> {
        const tokenHash = hashLinkToken(token);
        const passwordHash = await hashPassword(password);

        let session;
        try {
            session = await db.beginTransaction();
        } catch (error) {
            throw databaseException(error, 'Failed to complete registration');
        }

        try {
            const pending = await RegistrationRequest.consume(tokenHash, session);
            if (!pending) {
                await session.rollback().catch(() => undefined);
                return this.handleConsumeFailure(tokenHash);
            }

            const existing = await User.findByEmail(pending.email, session);
            if (existing) {
                await RegistrationRequest.attachUser(pending.id, existing.id, session);
                await session.commit();
                return { email: existing.email, userId: existing.id };
            }

            const user = await User.createVerified(
                {
                    email: pending.email,
                    name: pending.name,
                    password_hash: passwordHash,
                    is_active: true,
                    is_admin: false,
                },
                session
            );

            if (!user) {
                throw new Error('Failed to create the registered account');
            }

            await this.access.grantDefaults(user.id, session);
            await RegistrationRequest.attachUser(pending.id, user.id, session);
            await session.commit();
            return { email: user.email, userId: user.id };
        } catch (error) {
            await session.rollback().catch(() => undefined);

            if (error instanceof HttpException) {
                throw error;
            }

            if (isUniqueViolation(describeDbError(error))) {
                const pending = await RegistrationRequest.findByTokenHash(tokenHash);
                if (pending) {
                    const existing = await User.findByEmail(pending.email);
                    if (existing) {
                        return { email: existing.email, userId: existing.id };
                    }
                }
                throw new DuplicateResourceException(EMAIL_TAKEN_MESSAGE, EMAIL_TAKEN_CODE);
            }

            throw databaseException(error, 'Failed to complete registration');
        }
    }

    private async handleConsumeFailure(tokenHash: string): Promise<RegistrationResult> {
        let pending;
        try {
            pending = await RegistrationRequest.findByTokenHash(tokenHash);
        } catch (error) {
            throw databaseException(error, 'Failed to complete registration');
        }

        if (!pending) {
            throw linkInvalid();
        }
        if (pending.used_at !== null) {
            if (pending.user_id !== null) {
                const user = await User.findById(pending.user_id);
                if (user) {
                    return { email: user.email, userId: user.id };
                }
            }
            throw linkAlreadyUsed();
        }
        if (pending.is_expired) {
            throw linkExpired();
        }
        throw linkInvalid();
    }

    private async sendEmail(name: string, email: string, token: string): Promise<boolean> {
        const link = `${this.linkBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;
        const rendered = verificationEmail({
            name,
            email,
            link,
            expiresInMinutes: this.linkTtlMinutes,
        });

        try {
            await this.mailer.send({ to: email, ...rendered });
            return true;
        } catch (error) {
            console.error('Failed to send the registration email', error);
            return false;
        }
    }
}
