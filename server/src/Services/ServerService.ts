import { describeDbError, isUniqueViolation } from '../Persistence/DatabaseError';
import { DatabaseException } from '../Exceptions/DatabaseException';
import { DuplicateResourceException } from '../Exceptions/DuplicateResourceException';
import { NotFoundException } from '../Exceptions/NotFoundException';
import { Server, type ServerData, type ServerRecord } from '../Models/Server';

const DUPLICATE_SERVER_CODE = 'DUPLICATE_SERVER';
const DUPLICATE_HOST_CODE = 'DUPLICATE_HOST';
const INTERNAL_SERVER_ERROR_CODE = 'INTERNAL_SERVER_ERROR';
const SERVER_UNIQUE_CONSTRAINT = 'servers_server_key';
const HOST_UNIQUE_CONSTRAINT = 'servers_host_unique';

function duplicateServerMessage(name: string): string {
    return `Server "${name}" is already registered`;
}

function duplicateHostMessage(host: string): string {
    return `Host "${host}" is already registered`;
}

function duplicateResponse(
    constraint: string | undefined,
    values: { server: string; host: string }
): { code: string; message: string } | null {
    if (constraint === SERVER_UNIQUE_CONSTRAINT) {
        return { code: DUPLICATE_SERVER_CODE, message: duplicateServerMessage(values.server) };
    }
    if (constraint === HOST_UNIQUE_CONSTRAINT) {
        return { code: DUPLICATE_HOST_CODE, message: duplicateHostMessage(values.host) };
    }
    return null;
}

function databaseError(error: unknown, fallback: string): DatabaseException {
    const dbError = describeDbError(error);
    return new DatabaseException(
        dbError.message || fallback,
        dbError.number !== undefined ? String(dbError.number) : INTERNAL_SERVER_ERROR_CODE,
        { cause: error }
    );
}

export class ServerService {
    async list(withInactive: boolean): Promise<ServerRecord[]> {
        try {
            return await Server.all(withInactive);
        } catch (error) {
            throw new DatabaseException('Failed to retrieve servers', INTERNAL_SERVER_ERROR_CODE, {
                cause: error,
            });
        }
    }

    async create(data: ServerData): Promise<ServerRecord> {
        try {
            const created = await Server.create({
                server: data.server,
                protocol: data.protocol,
                host: data.host,
                port: data.port,
                is_active: data.is_active ?? true,
            });

            if (!created) {
                throw new DatabaseException('Failed to register server');
            }

            return created;
        } catch (error) {
            if (error instanceof DatabaseException) {
                throw error;
            }
            throw this.mapWriteError(error, data, 'Failed to register server');
        }
    }

    async update(id: number, data: ServerData): Promise<ServerRecord> {
        try {
            const state = await Server.state(id, data.server, data.host);

            if (!state?.target_exists) {
                throw new NotFoundException('Server');
            }
            if (state.name_taken) {
                throw new DuplicateResourceException(
                    duplicateServerMessage(data.server),
                    DUPLICATE_SERVER_CODE
                );
            }
            if (state.host_taken) {
                throw new DuplicateResourceException(
                    duplicateHostMessage(data.host),
                    DUPLICATE_HOST_CODE
                );
            }

            const updated = await Server.update(id, {
                server: data.server,
                protocol: data.protocol,
                host: data.host,
                port: data.port,
                is_active: data.is_active ?? null,
            });

            if (!updated) {
                throw new NotFoundException('Server');
            }

            return updated;
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof DuplicateResourceException) {
                throw error;
            }
            throw this.mapWriteError(error, data, 'Failed to update server');
        }
    }

    async delete(id: number): Promise<ServerRecord> {
        try {
            const removed = await Server.delete(id);

            if (!removed) {
                throw new NotFoundException('Server');
            }

            return removed;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw databaseError(error, 'Failed to remove server');
        }
    }

    private mapWriteError(
        error: unknown,
        values: { server: string; host: string },
        fallback: string
    ): Error {
        const dbError = describeDbError(error);

        if (isUniqueViolation(dbError)) {
            const duplicate = duplicateResponse(dbError.constraint, values) ?? {
                code: DUPLICATE_SERVER_CODE,
                message: duplicateServerMessage(values.server),
            };
            return new DuplicateResourceException(duplicate.message, duplicate.code);
        }

        return databaseError(error, fallback);
    }
}
