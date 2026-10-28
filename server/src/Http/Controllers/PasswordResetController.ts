import type { Request, Response } from 'express';
import { auditMessage, mailFailed } from '../../Audit/AuditMessages';
import {
    PASSWORD_RESET_GENERIC_MESSAGE,
    PasswordResetService,
} from '../../Services/PasswordResetService';
import { auditAfter } from '../../Services/AuditService';
import { clientIp } from '../../Support/ClientIp';
import { EmailAddressRequest } from '../Requests/EmailAddressRequest';
import { ResetPasswordRequest } from '../Requests/ResetPasswordRequest';
import { ok } from '../Responses/ApiResponse';

export class PasswordResetController {
    constructor(private readonly passwordReset: PasswordResetService) {}

    request = async (req: Request, res: Response): Promise<void> => {
        const { email } = EmailAddressRequest.validate(
            req.body,
            'Invalid password reset request payload'
        );
        const result = await this.passwordReset.request(email);
        const ip = clientIp(req);

        auditAfter(res, {
            userId: result.userId,
            category: 'auth',
            action: 'request_password_reset',
            details: auditMessage.passwordResetRequested,
            ip,
        });

        if (result.userId !== null && !result.sent) {
            auditAfter(res, {
                userId: result.userId,
                category: 'mail',
                action: 'send_failed',
                details: mailFailed('password_reset'),
                ip,
            });
        }

        ok(res, PASSWORD_RESET_GENERIC_MESSAGE, null);
    };

    reset = async (req: Request, res: Response): Promise<void> => {
        const data = ResetPasswordRequest.validate(req.body);
        const result = await this.passwordReset.reset(data.token, data.password);

        auditAfter(res, {
            userId: result.userId,
            category: 'auth',
            action: 'password_changed',
            details: auditMessage.passwordChanged,
            ip: clientIp(req),
        });

        ok(res, 'Password updated successfully. Sign in with your new password.', null);
    };
}
