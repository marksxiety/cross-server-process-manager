import type { Request, Response } from 'express';
import { RegistrationService } from '../../Services/RegistrationService';
import { EmailAddressRequest } from '../Requests/EmailAddressRequest';
import { RegisterRequest } from '../Requests/RegisterRequest';
import { VerifyEmailRequest } from '../Requests/VerifyEmailRequest';
import { ok } from '../Responses/ApiResponse';

const RESEND_MESSAGE = 'If a registration is pending for that email, we sent a new link.';

export class RegistrationController {
    constructor(private readonly registration: RegistrationService) {}

    register = async (req: Request, res: Response): Promise<void> => {
        const data = RegisterRequest.validate(req.body);
        const result = await this.registration.request(data);
        ok(res, 'Check your email to continue creating your account.', result);
    };

    resend = async (req: Request, res: Response): Promise<void> => {
        const { email } = EmailAddressRequest.validate(
            req.body,
            'Invalid registration request payload'
        );
        await this.registration.resend(email);
        ok(res, RESEND_MESSAGE, null);
    };

    verify = async (req: Request, res: Response): Promise<void> => {
        const { token, password } = VerifyEmailRequest.validate(req.body);
        const result = await this.registration.verify(token, password);
        ok(res, 'Account created successfully. Sign in with your new password.', result);
    };
}
