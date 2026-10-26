import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

const ALGORITHM = 'HS256';
const ISSUER = 'xpm-server';

export interface AccessTokenInput {
    id: number;
    role: string;
    tokenVersion: number;
}

export interface AccessTokenClaims {
    userId: number;
    role: string;
    tokenVersion: number;
}

export interface SignedAccessToken {
    token: string;
    expiresIn: number;
}

export type TokenFailureReason = 'expired' | 'invalid';

export class TokenVerificationError extends Error {
    constructor(
        public readonly reason: TokenFailureReason,
        options?: ErrorOptions
    ) {
        super(reason === 'expired' ? 'Token has expired' : 'Token is invalid', options);
        this.name = 'TokenVerificationError';
    }
}

export class TokenService {
    constructor(
        private readonly secret: string,
        private readonly expiresInSeconds: number
    ) {}

    sign(user: AccessTokenInput): SignedAccessToken {
        const options: SignOptions = {
            algorithm: ALGORITHM,
            issuer: ISSUER,
            subject: String(user.id),
            expiresIn: this.expiresInSeconds,
        };

        const token = jwt.sign({ role: user.role, tv: user.tokenVersion }, this.secret, options);
        return { token, expiresIn: this.expiresInSeconds };
    }

    verify(token: string): AccessTokenClaims {
        let payload: string | JwtPayload;
        try {
            payload = jwt.verify(token, this.secret, {
                algorithms: [ALGORITHM],
                issuer: ISSUER,
            });
        } catch (error) {
            const reason: TokenFailureReason =
                error instanceof jwt.TokenExpiredError ? 'expired' : 'invalid';
            throw new TokenVerificationError(reason, { cause: error });
        }

        if (typeof payload === 'string') {
            throw new TokenVerificationError('invalid');
        }

        const userId = Number(payload.sub);
        const role: unknown = payload.role;
        const tokenVersion: unknown = payload.tv;

        if (
            !Number.isInteger(userId) ||
            userId <= 0 ||
            typeof role !== 'string' ||
            role.length === 0 ||
            typeof tokenVersion !== 'number' ||
            !Number.isInteger(tokenVersion) ||
            tokenVersion < 0
        ) {
            throw new TokenVerificationError('invalid');
        }

        return { userId, role, tokenVersion };
    }
}
