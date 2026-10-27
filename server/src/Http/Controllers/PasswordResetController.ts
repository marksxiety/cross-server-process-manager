import type { Request, Response } from 'express';
import {
    PASSWORD_RESET_GENERIC_MESSAGE,
    PasswordResetService,
} from '../../Services/PasswordResetService';
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
        await this.passwordReset.request(email);
        ok(res, PASSWORD_RESET_GENERIC_MESSAGE, null);
    };

    reset = async (req: Request, res: Response): Promise<void> => {
        const data = ResetPasswordRequest.validate(req.body);
        await this.passwordReset.reset(data.token, data.password);
        ok(res, 'Password updated successfully. Sign in with your new password.', null);
    };
}
