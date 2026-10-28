import type { ConnectionPool } from 'mssql';
import { quoteLiteral } from './Sql';

export const JOURNAL_TABLE = 'dbo.migrations';

type Query = (text: string) => Promise<void>;

interface JournalColumns {
    name_length: number | null;
    run_on_length: number | null;
}

export class MigrationRepository {
    constructor(private readonly pool: ConnectionPool) {}

    async ensureTable(): Promise<void> {
        await this.pool.request().query(`
            IF OBJECT_ID('${JOURNAL_TABLE}', 'U') IS NULL
            BEGIN
                CREATE TABLE ${JOURNAL_TABLE} (
                    name NVARCHAR(255) NOT NULL CONSTRAINT migrations_pkey PRIMARY KEY,
                    run_on DATETIME2(3) NOT NULL CONSTRAINT migrations_run_on_default DEFAULT SYSDATETIME()
                );
            END
        `);

        const columns = await this.pool.request().query<JournalColumns>(`
            SELECT
                COL_LENGTH('${JOURNAL_TABLE}', 'name') AS name_length,
                COL_LENGTH('${JOURNAL_TABLE}', 'run_on') AS run_on_length
        `);
        const journal = columns.recordset[0];

        if (!journal || journal.name_length === null || journal.run_on_length === null) {
            throw new Error(
                `${JOURNAL_TABLE} exists but does not have the expected schema (name, run_on). ` +
                    'It may belong to another framework — rename or remove it, then re-run the command.'
            );
        }
    }

    async appliedNames(): Promise<Set<string>> {
        const result = await this.pool
            .request()
            .query<{ name: string }>(`SELECT name FROM ${JOURNAL_TABLE}`);
        return new Set(result.recordset.map((row) => row.name));
    }

    async lastAppliedName(): Promise<string | undefined> {
        const result = await this.pool
            .request()
            .query<{ name: string }>(
                `SELECT TOP 1 name FROM ${JOURNAL_TABLE} ORDER BY name DESC`
            );
        return result.recordset[0]?.name;
    }

    async record(query: Query, name: string): Promise<void> {
        await query(
            `INSERT INTO ${JOURNAL_TABLE} (name, run_on) VALUES (${quoteLiteral(name)}, SYSDATETIME())`
        );
    }

    async forget(query: Query, name: string): Promise<void> {
        await query(`DELETE FROM ${JOURNAL_TABLE} WHERE name = ${quoteLiteral(name)}`);
    }

    async baseline(names: string[]): Promise<void> {
        if (names.length === 0) {
            return;
        }

        const request = this.pool.request();
        const values = names.map((name, index) => {
            request.input(`p${index + 1}`, name);
            return `(@p${index + 1}, SYSDATETIME())`;
        });

        await request.query(
            `INSERT INTO ${JOURNAL_TABLE} (name, run_on) VALUES ${values.join(', ')}`
        );
    }
}
