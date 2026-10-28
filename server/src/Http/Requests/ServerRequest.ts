import { z } from 'zod';
import { ValidationException } from '../../Exceptions/ValidationException';
import type { ServerData } from '../../Models/Server';

const MAX_SERVER_LENGTH = 100;
const MAX_HOST_LENGTH = 255;
const MIN_PORT = 1;
const MAX_PORT = 65535;

export const serverSchema = z.object({
    server: z
        .string({ message: 'Server name is required' })
        .trim()
        .min(1, { message: 'Server name is required' })
        .max(MAX_SERVER_LENGTH, {
            message: `Server name must be ${MAX_SERVER_LENGTH} characters or less`,
        }),
    protocol: z.enum(['http', 'https'], {
        message: 'Protocol must be either http or https',
    }),
    host: z
        .string({ message: 'Host is required' })
        .trim()
        .min(1, { message: 'Host is required' })
        .max(MAX_HOST_LENGTH, {
            message: `Host must be ${MAX_HOST_LENGTH} characters or less`,
        }),
    port: z.coerce
        .number({ message: 'Port must be a number' })
        .int({ message: 'Port must be a whole number' })
        .min(MIN_PORT, { message: `Port must be at least ${MIN_PORT}` })
        .max(MAX_PORT, { message: `Port must be ${MAX_PORT} or less` }),
    is_active: z.boolean({ message: 'Active must be a boolean' }).optional(),
});

export abstract class ServerRequest {
    static validate(body: unknown): ServerData {
        const parsed = serverSchema.safeParse(body);
        if (!parsed.success) {
            throw new ValidationException(
                'Invalid server payload',
                z.flattenError(parsed.error).fieldErrors
            );
        }
        return parsed.data;
    }
}
