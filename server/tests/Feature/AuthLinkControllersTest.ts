import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PasswordResetController } from '../../src/Http/Controllers/PasswordResetController';
import { RegistrationController } from '../../src/Http/Controllers/RegistrationController';
import type { PasswordResetService } from '../../src/Services/PasswordResetService';
import type { RegistrationService } from '../../src/Services/RegistrationService';
import {
    createRequest,
    createResponse,
    invoke,
    responseBody,
} from '../Support/Http';

const registrationFns = {
    request: vi.fn(),
    resend: vi.fn(),
    verify: vi.fn(),
};
const resetFns = {
    request: vi.fn(),
    reset: vi.fn(),
};

const registration = new RegistrationController(
    registrationFns as unknown as RegistrationService
);
const reset = new PasswordResetController(resetFns as unknown as PasswordResetService);

beforeEach(() => {
    registrationFns.request.mockReset().mockResolvedValue({ email: 'user@example.com' });
    registrationFns.resend.mockReset().mockResolvedValue(undefined);
    registrationFns.verify.mockReset().mockResolvedValue({ email: 'user@example.com' });
    resetFns.request.mockReset().mockResolvedValue(undefined);
    resetFns.reset.mockReset().mockResolvedValue(undefined);
});

describe('RegistrationController', () => {
    it('starts a pending registration', async () => {
        const res = createResponse();

        await invoke(
            registration.register,
            createRequest({ body: { email: ' User@Example.com ', name: 'User' } }),
            res
        );

        expect(registrationFns.request).toHaveBeenCalledWith({
            email: 'user@example.com',
            name: 'User',
        });
        expect(responseBody(res).success).toBe(true);
        expect(responseBody(res).message).toMatch(/Check your email/);
    });

    it('always returns the generic resend response', async () => {
        const res = createResponse();

        await invoke(
            registration.resend,
            createRequest({ body: { email: ' User@Example.com ' } }),
            res
        );

        expect(registrationFns.resend).toHaveBeenCalledWith('user@example.com');
        expect(responseBody(res).success).toBe(true);
        expect(responseBody(res).message).toMatch(/If a registration is pending/);
    });

    it('verifies a token and password', async () => {
        const res = createResponse();

        await invoke(
            registration.verify,
            createRequest({ body: { token: 'raw-token', password: 'new-password' } }),
            res
        );

        expect(registrationFns.verify).toHaveBeenCalledWith('raw-token', 'new-password');
        expect(responseBody(res).message).toBe(
            'Account created successfully. Sign in with your new password.'
        );
    });

    it('rejects a malformed verification payload', async () => {
        const res = createResponse();

        await invoke(
            registration.verify,
            createRequest({ body: { token: 'raw-token', password: 'short' } }),
            res
        );

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('VALIDATION_FAILED');
        expect(registrationFns.verify).not.toHaveBeenCalled();
    });
});

describe('PasswordResetController', () => {
    it('always returns the generic reset request response', async () => {
        const res = createResponse();

        await invoke(
            reset.request,
            createRequest({ body: { email: 'user@example.com' } }),
            res
        );

        expect(resetFns.request).toHaveBeenCalledWith('user@example.com');
        expect(responseBody(res).message).toMatch(/If an account exists/);
    });

    it('resets a password', async () => {
        const res = createResponse();

        await invoke(
            reset.reset,
            createRequest({ body: { token: 'raw-token', password: 'new-password' } }),
            res
        );

        expect(resetFns.reset).toHaveBeenCalledWith('raw-token', 'new-password');
        expect(responseBody(res).success).toBe(true);
    });

    it('rejects a short password before calling the service', async () => {
        const res = createResponse();

        await invoke(
            reset.reset,
            createRequest({ body: { token: 'raw-token', password: 'short' } }),
            res
        );

        expect(res.status).toHaveBeenCalledWith(400);
        expect(resetFns.reset).not.toHaveBeenCalled();
    });
});
