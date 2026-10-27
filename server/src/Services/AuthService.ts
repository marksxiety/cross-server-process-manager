import { getDummyPasswordHash, hashPassword, verifyPassword } from '../Auth/PasswordHasher';
import { TokenService } from '../Auth/TokenService';
import { DatabaseException } from '../Exceptions/DatabaseException';
import { DuplicateResourceException } from '../Exceptions/DuplicateResourceException';
import { HttpException } from '../Exceptions/HttpException';
import { toPublicUser, User, type PublicUser, type UserRecord } from '../Models/User';
import db, { type DbSession } from '../Persistence/Connection';
import { describeDbError, isUniqueViolation } from '../Persistence/DatabaseError';
import type { UserAccess } from '../Security/AccessCatalog';
import { AccessService } from './AccessService';

const EMAIL_TAKEN_CODE = 'EMAIL_TAKEN';
const INVALID_CREDENTIALS_CODE = 'INVALID_CREDENTIALS';
const ACCOUNT_DISABLED_CODE = 'ACCOUNT_DISABLED';
const UNAUTHORIZED_CODE = 'UNAUTHORIZED';
const INTERNAL_SERVER_ERROR_CODE = 'INTERNAL_SERVER_ERROR';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const UNAUTHORIZED_MESSAGE = 'Authentication required';
const EMAIL_TAKEN_MESSAGE = 'An account with this email already exists';

export interface RegisterData {
    email: string;
    name: string;
    password: string;
}

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

function databaseError(error: unknown, fallback: string): DatabaseException {
    const dbError = describeDbError(error);
    return new DatabaseException(
        dbError.message || fallback,
        dbError.number !== undefined ? String(dbError.number) : INTERNAL_SERVER_ERROR_CODE,
        { cause: error }
    );
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

    async register(data: RegisterData): Promise<AuthResult> {
        const passwordHash = await hashPassword(data.password);

        let session: DbSession;
        try {
            session = await db.beginTransaction();
        } catch (error) {
            throw databaseError(error, 'Failed to register account');
        }

        let user: UserRecord | undefined;
        try {
            user = await User.create(
                {
                    email: data.email,
                    name: data.name,
                    password_hash: passwordHash,
                    is_active: true,
                    is_admin: false,
                },
                session
            );

            if (!user) {
                throw new DatabaseException('Failed to register account');
            }

            await this.access.grantDefaults(user.id, session);
            await session.commit();
        } catch (error) {
            await session.rollback().catch(() => undefined);

            if (error instanceof DatabaseException) {
                throw error;
            }
            if (isUniqueViolation(describeDbError(error))) {
                throw new DuplicateResourceException(EMAIL_TAKEN_MESSAGE, EMAIL_TAKEN_CODE);
            }
            throw databaseError(error, 'Failed to register account');
        }

        return this.authenticated(user);
    }

    async login(data: LoginData): Promise<AuthResult> {
        let user: UserRecord | undefined;
        try {
            user = await User.findByEmail(data.email);
        } catch (error) {
            throw databaseError(error, 'Failed to log in');
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

        let loggedInUser: UserRecord | undefined;
        try {
            loggedInUser = await User.touchLastLogin(user.id);
        } catch (error) {
            throw databaseError(error, 'Failed to log in');
        }

        return this.authenticated(loggedInUser ?? user);
    }

    async currentUser(id: number, tokenVersion: number): Promise<PublicUser> {
        let user: UserRecord | undefined;
        try {
            user = await User.findById(id);
        } catch (error) {
            throw databaseError(error, 'Failed to retrieve account');
        }

        if (!user || !user.is_active || user.token_version !== tokenVersion) {
            throw unauthorized();
        }

        try {
            return await this.access.publicUser(user);
        } catch (error) {
            throw databaseError(error, 'Failed to retrieve account permissions');
        }
    }

    private async authenticated(user: UserRecord): Promise<AuthResult> {
        let access: UserAccess;
        try {
            access = await this.access.effectiveFor(user);
        } catch (error) {
            throw databaseError(error, 'Failed to load account permissions');
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
