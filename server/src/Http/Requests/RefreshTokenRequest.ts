import { z } from 'zod';
import { ValidationException } from '../../Exceptions/ValidationException';

const MAX_REFRESH_TOKEN_LENGTH = 512;

export const refreshTokenSchema = z.object({
    refresh_token: z
        .string({ message: 'Refresh token is required' })
        .min(1, { message: 'Refresh token is required' })
        .max(MAX_REFRESH_TOKEN_LENGTH, {
            message: `Refresh token must be ${MAX_REFRESH_TOKEN_LENGTH} characters or less`,
        }),
});

export interface RefreshTokenData {
    refreshToken: string;
}

export class RefreshTokenRequest {
    static validate(body: unknown): RefreshTokenData {
        const parsed = refreshTokenSchema.safeParse(body);
        if (!parsed.success) {
            throw new ValidationException(
                'Invalid refresh token payload',
                z.flattenError(parsed.error).fieldErrors
            );
        }
        return { refreshToken: parsed.data.refresh_token };
    }
}
