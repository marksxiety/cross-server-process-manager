import { getDummyPasswordHash, verifyPassword } from '../Auth/PasswordHasher';
import { TokenService } from '../Auth/TokenService';
import { HttpException } from '../Exceptions/HttpException';
import { toPublicUser, User, type PublicUser, type UserRecord } from '../Models/User';
import { databaseException } from '../Persistence/DbException';
import type { UserAccess } from '../Security/AccessCatalog';
import { AccessService } from './AccessService';

const INVALID_CREDENTIALS_CODE = 'INVALID_CREDENTIALS';
const ACCOUNT_DISABLED_CODE = 'ACCOUNT_DISABLED';
const EMAIL_NOT_VERIFIED_CODE = 'EMAIL_NOT_VERIFIED';
const UNAUTHORIZED_CODE = 'UNAUTHORIZED';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const UNAUTHORIZED_MESSAGE = 'Authentication required';
const EMAIL_NOT_VERIFIED_MESSAGE = 'Please verify your email address before signing in';

export interface LoginData {
    email: string;
    password: string;
}

export interface AuthResult {
    token: string;
    tokenType: 'Bearer';
    expiresIn: number;
    user: PublicUser;
}

function invalidCredentials(): HttpException {
    return new HttpException(401, INVALID_CREDENTIALS_MESSAGE, INVALID_CREDENTIALS_CODE);
}

function unauthorized(): HttpException {
    return new HttpException(401, UNAUTHORIZED_MESSAGE, UNAUTHORIZED_CODE);
}

export class AuthService {
    constructor(
        private readonly tokens: TokenService,
        private readonly access: AccessService = new AccessService()
    ) {}

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
            throw new HttpException(403, 'This account is disabled', ACCOUNT_DISABLED_CODE);
        }

        if (user.email_verified_at === null) {
            throw new HttpException(
                403,
                EMAIL_NOT_VERIFIED_MESSAGE,
                EMAIL_NOT_VERIFIED_CODE
            );
        }

        let loggedInUser: UserRecord | undefined;
        try {
            loggedInUser = await User.touchLastLogin(user.id);
        } catch (error) {
            throw databaseException(error, 'Failed to log in');
        }

        return this.authenticated(loggedInUser ?? user);
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
            throw new HttpException(
                403,
                EMAIL_NOT_VERIFIED_MESSAGE,
                EMAIL_NOT_VERIFIED_CODE
            );
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
        let access: UserAccess;
        try {
            access = await this.access.effectiveFor(user);
        } catch (error) {
            throw databaseException(error, 'Failed to load account permissions');
        }

        const signed = this.tokens.sign({
            id: user.id,
            tokenVersion: user.token_version,
        });

        return {
            token: signed.token,
            tokenType: 'Bearer',
            expiresIn: signed.expiresIn,
            user: toPublicUser(user, access),
        };
    }
}
