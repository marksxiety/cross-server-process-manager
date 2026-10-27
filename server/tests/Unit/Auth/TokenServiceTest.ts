import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { TokenService, TokenVerificationError } from '../../../src/Auth/TokenService';

const SECRET = 'test-secret-that-is-longer-than-thirty-two-characters';
const OTHER_SECRET = 'other-secret-that-is-longer-than-thirty-two-chars';

function verificationFailure(service: TokenService, token: string): TokenVerificationError {
    try {
        service.verify(token);
    } catch (error) {
        if (error instanceof TokenVerificationError) {
            return error;
        }
        throw error;
    }
    throw new Error('Expected token verification to fail');
}

describe('TokenService', () => {
    it('signs a token that verifies with the same claims', () => {
        const service = new TokenService(SECRET, 3600);
        const { token, expiresIn } = service.sign({ id: 7, tokenVersion: 3 });

        expect(expiresIn).toBe(3600);
        expect(service.verify(token)).toEqual({ userId: 7, tokenVersion: 3 });
    });

    it('rejects a token signed with another secret', () => {
        const token = new TokenService(OTHER_SECRET, 3600).sign({
            id: 1,
            tokenVersion: 0,
        }).token;

        const failure = verificationFailure(new TokenService(SECRET, 3600), token);
        expect(failure.reason).toBe('invalid');
    });

    it('rejects a tampered token', () => {
        const service = new TokenService(SECRET, 3600);
        const { token } = service.sign({ id: 1, tokenVersion: 0 });
        const replacement = token.endsWith('a') ? 'b' : 'a';
        const tampered = `${token.slice(0, -1)}${replacement}`;

        expect(verificationFailure(service, tampered).reason).toBe('invalid');
    });

    it('reports expired tokens', () => {
        const expired = new TokenService(SECRET, -1).sign({
            id: 1,
            tokenVersion: 0,
        }).token;

        expect(verificationFailure(new TokenService(SECRET, 3600), expired).reason).toBe('expired');
    });

    it('rejects an unexpected algorithm', () => {
        const token = jwt.sign({ tv: 0 }, SECRET, {
            algorithm: 'HS512',
            issuer: 'xpm-server',
            subject: '1',
            expiresIn: 3600,
        });

        expect(verificationFailure(new TokenService(SECRET, 3600), token).reason).toBe('invalid');
    });

    it('rejects an unexpected issuer', () => {
        const token = jwt.sign({ tv: 0 }, SECRET, {
            algorithm: 'HS256',
            issuer: 'someone-else',
            subject: '1',
            expiresIn: 3600,
        });

        expect(verificationFailure(new TokenService(SECRET, 3600), token).reason).toBe('invalid');
    });

    it('rejects a non-numeric subject', () => {
        const token = jwt.sign({ tv: 0 }, SECRET, {
            algorithm: 'HS256',
            issuer: 'xpm-server',
            subject: 'not-a-number',
            expiresIn: 3600,
        });

        expect(verificationFailure(new TokenService(SECRET, 3600), token).reason).toBe('invalid');
    });

    it('rejects a missing token version claim', () => {
        const token = jwt.sign({}, SECRET, {
            algorithm: 'HS256',
            issuer: 'xpm-server',
            subject: '1',
            expiresIn: 3600,
        });

        expect(verificationFailure(new TokenService(SECRET, 3600), token).reason).toBe('invalid');
    });
});
