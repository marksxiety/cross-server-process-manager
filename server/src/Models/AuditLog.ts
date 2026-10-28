import db from '../Persistence/Connection';

export interface AuditEventInput {
    userId?: number | null;
    category: string;
    action: string;
    details?: string | null;
    ip?: string | null;
}

export interface AuditLogRow {
    id: number;
    user_id: number | null;
    category: string;
    action: string;
    details: string | null;
    ip_address: string | null;
    created_at: Date;
    user_name: string | null;
    user_email: string | null;
}

export type AuditLogView = AuditLogRow;

export class AuditLog {
    static async record(event: AuditEventInput): Promise<void> {
        await db.query(
            `INSERT INTO audit_log (user_id, category, action, details, ip_address, created_at)
             VALUES (@p1, @p2, @p3, @p4, @p5, SYSUTCDATETIME())`,
            [
                event.userId ?? null,
                event.category,
                event.action,
                event.details ?? null,
                event.ip ?? null,
            ]
        );
    }

    static async recent(limit: number): Promise<AuditLogView[]> {
        const { rows } = await db.query<AuditLogRow>(
            `SELECT TOP (@p1)
                    a.id, a.user_id, a.category, a.action, a.details,
                    a.ip_address, a.created_at, u.name AS user_name, u.email AS user_email
             FROM audit_log a
             LEFT JOIN users u ON u.id = a.user_id
             ORDER BY a.created_at DESC, a.id DESC`,
            [limit]
        );

        return rows.map((row) => ({ ...row, id: Number(row.id) }));
    }
}
