import type { Request, Response } from 'express';
import { auditMessage, mailFailed } from '../../Audit/AuditMessages';
import { HttpException } from '../../Exceptions/HttpException';
import { auditAfter } from '../../Services/AuditService';
import { RegistrationService } from '../../Services/RegistrationService';
import { clientIp } from '../../Support/ClientIp';
import { EmailAddressRequest } from '../Requests/EmailAddressRequest';
import { RegisterRequest } from '../Requests/RegisterRequest';
import { VerifyEmailRequest } from '../Requests/VerifyEmailRequest';
import { ok } from '../Responses/ApiResponse';

const RESEND_MESSAGE = 'If a registration is pending for that email, we sent a new link.';

export class RegistrationController {
    constructor(private readonly registration: RegistrationService) {}

    register = async (req: Request, res: Response): Promise<void> => {
        const data = RegisterRequest.validate(req.body);
        const ip = clientIp(req);

        let result;
        try {
            result = await this.registration.request(data);
        } catch (error) {
            if (error instanceof HttpException && error.code === 'MAIL_DELIVERY_FAILED') {
                auditAfter(res, {
                    category: 'mail',
                    action: 'send_failed',
                    details: mailFailed('verification'),
                    ip,
                });
            }
            throw error;
        }

        auditAfter(res, {
            category: 'auth',
            action: 'register',
            details: auditMessage.register,
            ip,
        });

        ok(res, 'Check your email to continue creating your account.', result);
    };

    resend = async (req: Request, res: Response): Promise<void> => {
        const { email } = EmailAddressRequest.validate(
            req.body,
            'Invalid registration request payload'
        );
        await this.registration.resend(email);

        auditAfter(res, {
            category: 'auth',
            action: 'resend_verification',
            details: auditMessage.resendVerification,
            ip: clientIp(req),
        });

        ok(res, RESEND_MESSAGE, null);
    };

    verify = async (req: Request, res: Response): Promise<void> => {
        const { token, password } = VerifyEmailRequest.validate(req.body);
        const result = await this.registration.verify(token, password);

        auditAfter(res, {
            userId: result.userId ?? null,
            category: 'auth',
            action: 'verify_email',
            details: auditMessage.emailVerified,
            ip: clientIp(req),
        });

        ok(
            res,
            'Account created successfully. Sign in with your new password.',
            { email: result.email }
        );
    };
}
