import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const ALGORITHM = 'scrypt';
const FIELD_SEPARATOR = '$';
const SALT_BYTES = 16;
const MAX_MEM_MULTIPLIER = 2;
const MIN_KEY_LENGTH = 16;
const MAX_KEY_LENGTH = 128;
const MAX_COST = 1_048_576;
const MAX_BLOCK_SIZE = 32;
const MAX_PARALLELIZATION = 16;

export interface ScryptParams {
    N: number;
    r: number;
    p: number;
    keylen: number;
}

export const DEFAULT_SCRYPT_PARAMS: ScryptParams = {
    N: 16384,
    r: 8,
    p: 1,
    keylen: 64,
};

interface ParsedHash {
    params: ScryptParams;
    salt: Buffer;
    hash: Buffer;
}

function maxMemory(cost: number, blockSize: number): number {
    return 128 * cost * blockSize * MAX_MEM_MULTIPLIER;
}

function deriveKey(password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        scryptCallback(
            password,
            salt,
            params.keylen,
            {
                N: params.N,
                r: params.r,
                p: params.p,
                maxmem: maxMemory(params.N, params.r),
            },
            (error, derivedKey) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(derivedKey);
            }
        );
    });
}

function isPositiveInteger(value: number): boolean {
    return Number.isInteger(value) && value > 0;
}

function isValidParams(params: ScryptParams): boolean {
    return (
        isPositiveInteger(params.N) &&
        params.N <= MAX_COST &&
        isPositiveInteger(params.r) &&
        params.r <= MAX_BLOCK_SIZE &&
        isPositiveInteger(params.p) &&
        params.p <= MAX_PARALLELIZATION &&
        isPositiveInteger(params.keylen) &&
        params.keylen >= MIN_KEY_LENGTH &&
        params.keylen <= MAX_KEY_LENGTH
    );
}

function parseHash(stored: string): ParsedHash | null {
    const parts = stored.split(FIELD_SEPARATOR);
    if (parts.length !== 6 || parts[0] !== ALGORITHM) {
        return null;
    }

    const [, rawCost, rawBlockSize, rawParallelization, rawSalt, rawHash] = parts;
    if (!rawCost || !rawBlockSize || !rawParallelization || !rawSalt || !rawHash) {
        return null;
    }

    const hash = Buffer.from(rawHash, 'base64url');
    const params: ScryptParams = {
        N: Number(rawCost),
        r: Number(rawBlockSize),
        p: Number(rawParallelization),
        keylen: hash.length,
    };

    if (!isValidParams(params) || hash.length === 0) {
        return null;
    }

    const salt = Buffer.from(rawSalt, 'base64url');
    if (salt.length === 0) {
        return null;
    }

    return { params, salt, hash };
}

export async function hashPassword(
    password: string,
    params: ScryptParams = DEFAULT_SCRYPT_PARAMS
): Promise<string> {
    if (!isValidParams(params)) {
        throw new TypeError('Invalid scrypt parameters');
    }

    const salt = randomBytes(SALT_BYTES);
    const hash = await deriveKey(password, salt, params);

    return [
        ALGORITHM,
        params.N,
        params.r,
        params.p,
        salt.toString('base64url'),
        hash.toString('base64url'),
    ].join(FIELD_SEPARATOR);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const parsed = parseHash(stored);
    if (!parsed) {
        return false;
    }

    try {
        const candidate = await deriveKey(password, parsed.salt, parsed.params);
        return (
            candidate.length === parsed.hash.length &&
            timingSafeEqual(candidate, parsed.hash)
        );
    } catch {
        return false;
    }
}

let dummyHash: Promise<string> | undefined;

/**
 * A throwaway hash used to keep unknown-email logins as slow as wrong-password
 * logins, so response timing does not reveal which emails exist.
 */
export function getDummyPasswordHash(): Promise<string> {
    dummyHash ??= hashPassword(randomBytes(SALT_BYTES).toString('base64url'));
    return dummyHash;
}
