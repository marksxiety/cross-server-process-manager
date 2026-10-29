import { randomUUID } from 'node:crypto';
import { getDummyPasswordHash, verifyPassword } from '../Auth/PasswordHasher';
import { generateRefreshToken, hashRefreshToken } from '../Auth/RefreshTokens';
import { TokenService } from '../Auth/TokenService';
import { HttpException } from '../Exceptions/HttpException';
import { toPublicUser, User, type PublicUser, type UserRecord } from '../Models/User';
import { RefreshToken, type RefreshTokenLookup } from '../Models/RefreshToken';
import { databaseException } from '../Persistence/DbException';
import type { UserAccess } from '../Security/AccessCatalog';
import { AccessService } from './AccessService';

const INVALID_CREDENTIALS_CODE = 'INVALID_CREDENTIALS';
const ACCOUNT_DISABLED_CODE = 'ACCOUNT_DISABLED';
const EMAIL_NOT_VERIFIED_CODE = 'EMAIL_NOT_VERIFIED';
const UNAUTHORIZED_CODE = 'UNAUTHORIZED';
const INVALID_REFRESH_TOKEN_CODE = 'INVALID_REFRESH_TOKEN';
const REFRESH_TOKEN_EXPIRED_CODE = 'REFRESH_TOKEN_EXPIRED';
const REFRESH_TOKEN_REUSED_CODE = 'REFRESH_TOKEN_REUSED';
const REFRESH_IN_PROGRESS_CODE = 'REFRESH_IN_PROGRESS';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const UNAUTHORIZED_MESSAGE = 'Authentication required';
const EMAIL_NOT_VERIFIED_MESSAGE = 'Please verify your email address before signing in';
const INVALID_REFRESH_TOKEN_MESSAGE = 'Invalid refresh token';
const REFRESH_TOKEN_EXPIRED_MESSAGE = 'Session has expired';
const REFRESH_TOKEN_REUSED_MESSAGE = 'Refresh token has already been used';
const REFRESH_IN_PROGRESS_MESSAGE = 'Session refresh is already in progress';

const SECONDS_PER_DAY = 24 * 60 * 60;
const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 30;
const DEFAULT_REFRESH_REUSE_GRACE_SECONDS = 30;

export interface LoginData {
    email: string;
    password: string;
}

export interface AuthResult {
    token: string;
    tokenType: 'Bearer';
    expiresIn: number;
    refreshToken: string;
    refreshExpiresIn: number;
    user: PublicUser;
}

function invalidCredentials(): HttpException {
    return new HttpException(401, INVALID_CREDENTIALS_MESSAGE, INVALID_CREDENTIALS_CODE);
}

function unauthorized(): HttpException {
    return new HttpException(401, UNAUTHORIZED_MESSAGE, UNAUTHORIZED_CODE);
}

function accountDisabled(): HttpException {
    return new HttpException(403, 'This account is disabled', ACCOUNT_DISABLED_CODE);
}

function emailNotVerified(): HttpException {
    return new HttpException(403, EMAIL_NOT_VERIFIED_MESSAGE, EMAIL_NOT_VERIFIED_CODE);
}

function invalidRefreshToken(): HttpException {
    return new HttpException(401, INVALID_REFRESH_TOKEN_MESSAGE, INVALID_REFRESH_TOKEN_CODE);
}

function refreshTokenExpired(): HttpException {
    return new HttpException(401, REFRESH_TOKEN_EXPIRED_MESSAGE, REFRESH_TOKEN_EXPIRED_CODE);
}

function refreshTokenReused(): HttpException {
    return new HttpException(401, REFRESH_TOKEN_REUSED_MESSAGE, REFRESH_TOKEN_REUSED_CODE);
}

function refreshInProgress(): HttpException {
    return new HttpException(401, REFRESH_IN_PROGRESS_MESSAGE, REFRESH_IN_PROGRESS_CODE);
}

export class AuthService {
    private readonly refreshTokenTtlSeconds: number;

    constructor(
        private readonly tokens: TokenService,
        private readonly access: AccessService = new AccessService(),
        private readonly refreshTokenTtlDays: number = DEFAULT_REFRESH_TOKEN_TTL_DAYS,
        private readonly refreshReuseGraceSeconds: number = DEFAULT_REFRESH_REUSE_GRACE_SECONDS
    ) {
        this.refreshTokenTtlSeconds = refreshTokenTtlDays * SECONDS_PER_DAY;
    }

    async login(data: LoginData): Promise<AuthResult> {
        let user: UserRecord | undefined;
        try {
            user = await User.findByEmail(data.email);
        } catch (error) {
            throw databaseException(error, 'Failed to log in');
        }

        if (!user) {
            await verifyPassword(data.password, await getDummyPasswordHash());
            throw invalidCredentials();
        }

        const passwordMatches = await verifyPassword(data.password, user.password_hash);
        if (!passwordMatches) {
            throw invalidCredentials();
        }

        if (!user.is_active) {
            throw accountDisabled();
        }

        if (user.email_verified_at === null) {
            throw emailNotVerified();
        }

        let loggedInUser: UserRecord | undefined;
        try {
            loggedInUser = await User.touchLastLogin(user.id);
        } catch (error) {
            throw databaseException(error, 'Failed to log in');
        }

        return this.authenticated(loggedInUser ?? user);
    }

    /**
     * Exchanges a refresh token for a new access/refresh pair. The old token is
     * consumed atomically; presenting it again after the grace window revokes
     * the whole family (a likely theft).
     */
    async refresh(rawToken: string): Promise<AuthResult> {
        const tokenHash = hashRefreshToken(rawToken);

        let record: RefreshTokenLookup | undefined;
        try {
            record = await RefreshToken.classify(tokenHash, this.refreshReuseGraceSeconds);
        } catch (error) {
            throw databaseException(error, 'Failed to refresh the session');
        }

        if (!record) {
            throw invalidRefreshToken();
        }

        if (record.used_at !== null) {
            if (record.is_reuse) {
                await this.revokeFamily(record.family_id);
                throw refreshTokenReused();
            }
            throw refreshInProgress();
        }

        if (record.is_expired) {
            throw refreshTokenExpired();
        }

        let user: UserRecord | undefined;
        try {
            user = await User.findById(record.user_id);
        } catch (error) {
            throw databaseException(error, 'Failed to refresh the session');
        }

        if (!user || user.token_version !== record.token_version) {
            throw invalidRefreshToken();
        }
        if (!user.is_active) {
            throw accountDisabled();
        }
        if (user.email_verified_at === null) {
            throw emailNotVerified();
        }

        const access = await this.loadAccess(user);
        const nextToken = generateRefreshToken();

        let rotated: boolean;
        try {
            rotated = await RefreshToken.rotate({
                currentHash: tokenHash,
                nextTokenHash: hashRefreshToken(nextToken),
                userId: user.id,
                familyId: record.family_id,
                tokenVersion: user.token_version,
                ttlDays: this.refreshTokenTtlDays,
            });
        } catch (error) {
            throw databaseException(error, 'Failed to refresh the session');
        }

        if (!rotated) {
            throw await this.explainLostRotation(tokenHash);
        }

        await this.purgeExpired(user.id);
        return this.result(user, access, nextToken);
    }

    async currentUser(id: number, tokenVersion: number): Promise<PublicUser> {
        let user: UserRecord | undefined;
        try {
            user = await User.findById(id);
        } catch (error) {
            throw databaseException(error, 'Failed to retrieve account');
        }

        if (!user || !user.is_active || user.token_version !== tokenVersion) {
            throw unauthorized();
        }

        if (user.email_verified_at === null) {
            throw emailNotVerified();
        }

        try {
            return await this.access.publicUser(user);
        } catch (error) {
            throw databaseException(error, 'Failed to retrieve account permissions');
        }
    }

    async logout(id: number): Promise<void> {
        try {
            await User.bumpTokenVersion(id);
        } catch (error) {
            throw databaseException(error, 'Failed to sign out');
        }
    }

    private async authenticated(user: UserRecord): Promise<AuthResult> {
        const access = await this.loadAccess(user);
        const refreshToken = generateRefreshToken();

        try {
            await RefreshToken.issue({
                userId: user.id,
                tokenHash: hashRefreshToken(refreshToken),
                familyId: randomUUID(),
                tokenVersion: user.token_version,
                ttlDays: this.refreshTokenTtlDays,
            });
        } catch (error) {
            throw databaseException(error, 'Failed to create the session');
        }

        await this.purgeExpired(user.id);
        return this.result(user, access, refreshToken);
    }

    private result(user: UserRecord, access: UserAccess, refreshToken: string): AuthResult {
        const signed = this.tokens.sign({
            id: user.id,
            tokenVersion: user.token_version,
        });

        return {
            token: signed.token,
            tokenType: 'Bearer',
            expiresIn: signed.expiresIn,
            refreshToken,
            refreshExpiresIn: this.refreshTokenTtlSeconds,
            user: toPublicUser(user, access),
        };
    }

    private async loadAccess(user: UserRecord): Promise<UserAccess> {
        try {
            return await this.access.effectiveFor(user);
        } catch (error) {
            throw databaseException(error, 'Failed to load account permissions');
        }
    }

    private async revokeFamily(familyId: string): Promise<void> {
        try {
            await RefreshToken.revokeFamily(familyId);
        } catch (error) {
            throw databaseException(error, 'Failed to refresh the session');
        }
    }

    private async explainLostRotation(tokenHash: string): Promise<HttpException> {
        let record: RefreshTokenLookup | undefined;
        try {
            record = await RefreshToken.classify(tokenHash, this.refreshReuseGraceSeconds);
        } catch (error) {
            throw databaseException(error, 'Failed to refresh the session');
        }

        if (!record) {
            return invalidRefreshToken();
        }
        if (record.used_at !== null) {
            if (record.is_reuse) {
                await this.revokeFamily(record.family_id);
                return refreshTokenReused();
            }
            return refreshInProgress();
        }
        if (record.is_expired) {
            return refreshTokenExpired();
        }
        return invalidRefreshToken();
    }

    private async purgeExpired(userId: number): Promise<void> {
        try {
            await RefreshToken.purgeExpired(userId);
        } catch (error) {
            console.error('Failed to purge expired refresh tokens', error);
        }
    }
}
