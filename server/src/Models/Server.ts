import db from '../Persistence/Connection';

export interface ServerRecord {
    id: number;
    server: string;
    protocol: string;
    host: string;
    port: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface ServerState {
    target_exists: boolean;
    name_taken: boolean;
    host_taken: boolean;
    /** Present when the target row exists; used to build the audit diff. */
    previous_server?: string | null;
    previous_protocol?: string | null;
    previous_host?: string | null;
    previous_port?: number | null;
    previous_is_active?: boolean | null;
}

export interface ServerData {
    server: string;
    protocol: 'http' | 'https';
    host: string;
    port: number;
    is_active?: boolean | undefined;
}

export interface ServerCreateAttributes {
    server: string;
    protocol: 'http' | 'https';
    host: string;
    port: number;
    is_active: boolean;
}

export interface ServerUpdateAttributes {
    server: string;
    protocol: 'http' | 'https';
    host: string;
    port: number;
    is_active: boolean | null;
}

export class Server {
    static async all(withInactive: boolean): Promise<ServerRecord[]> {
        const sql = withInactive
            ? 'SELECT * FROM servers ORDER BY id ASC'
            : 'SELECT * FROM servers WHERE is_active = 1 ORDER BY id ASC';

        const { rows } = await db.query<ServerRecord>(sql);
        return rows;
    }

    static async state(
        id: number,
        server: string,
        host: string
    ): Promise<ServerState | undefined> {
        const { rows } = await db.query<ServerState>(
            `SELECT CAST(CASE WHEN EXISTS (SELECT 1 FROM servers WHERE id = @p2) THEN 1 ELSE 0 END AS BIT) AS target_exists,
                    CAST(CASE WHEN EXISTS (SELECT 1 FROM servers WHERE server = @p1 AND id <> @p2) THEN 1 ELSE 0 END AS BIT) AS name_taken,
                    CAST(CASE WHEN EXISTS (SELECT 1 FROM servers WHERE host = @p3 AND id <> @p2) THEN 1 ELSE 0 END AS BIT) AS host_taken,
                    (SELECT server FROM servers WHERE id = @p2) AS previous_server,
                    (SELECT protocol FROM servers WHERE id = @p2) AS previous_protocol,
                    (SELECT host FROM servers WHERE id = @p2) AS previous_host,
                    (SELECT port FROM servers WHERE id = @p2) AS previous_port,
                    (SELECT is_active FROM servers WHERE id = @p2) AS previous_is_active`,
            [server, id, host]
        );
        return rows[0];
    }

    static async findById(id: number): Promise<ServerRecord | undefined> {
        const { rows } = await db.query<ServerRecord>('SELECT * FROM servers WHERE id = @p1', [
            id,
        ]);
        return rows[0];
    }

    static async create(attributes: ServerCreateAttributes): Promise<ServerRecord | undefined> {
        const { rows } = await db.query<ServerRecord>(
            `INSERT INTO servers (server, protocol, host, port, is_active)
             OUTPUT INSERTED.*
             VALUES (@p1, @p2, @p3, @p4, @p5)`,
            [
                attributes.server,
                attributes.protocol,
                attributes.host,
                attributes.port,
                attributes.is_active,
            ]
        );
        return rows[0];
    }

    static async update(
        id: number,
        attributes: ServerUpdateAttributes
    ): Promise<ServerRecord | undefined> {
        const { rows } = await db.query<ServerRecord>(
            `UPDATE servers
             SET server = @p1,
                 protocol = @p2,
                 host = @p3,
                 port = @p4,
                 is_active = COALESCE(CAST(@p5 AS BIT), is_active),
                 updated_at = SYSDATETIME()
             OUTPUT INSERTED.*
             WHERE id = @p6`,
            [
                attributes.server,
                attributes.protocol,
                attributes.host,
                attributes.port,
                attributes.is_active,
                id,
            ]
        );
        return rows[0];
    }

    static async delete(id: number): Promise<ServerRecord | undefined> {
        const { rows } = await db.query<ServerRecord>(
            `DELETE FROM servers
             OUTPUT DELETED.*
             WHERE id = @p1`,
            [id]
        );
        return rows[0];
    }
}
