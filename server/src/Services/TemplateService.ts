import db, { type DbSession } from '../Persistence/Connection';
import { describeDbError, isCheckViolation, isUniqueViolation } from '../Persistence/DatabaseError';
import { DatabaseException } from '../Exceptions/DatabaseException';
import { DuplicateResourceException } from '../Exceptions/DuplicateResourceException';
import { NotFoundException } from '../Exceptions/NotFoundException';
import { ValidationException } from '../Exceptions/ValidationException';
import {
    Template,
    type TemplateData,
    type TemplateRecord,
    type TemplateSummary,
} from '../Models/Template';
import { TemplateKey, type TemplateValues } from '../Models/TemplateKey';

const DUPLICATE_TEMPLATE_CODE = 'DUPLICATE_TEMPLATE';
const INTERNAL_SERVER_ERROR_CODE = 'INTERNAL_SERVER_ERROR';

function duplicateTemplateMessage(name: string): string {
    return `Template "${name}" is already registered`;
}

function databaseError(error: unknown, fallback: string): DatabaseException {
    const dbError = describeDbError(error);
    return new DatabaseException(
        dbError.message || fallback,
        dbError.number !== undefined ? String(dbError.number) : INTERNAL_SERVER_ERROR_CODE,
        { cause: error }
    );
}

export class TemplateService {
    async list(withInactive: boolean): Promise<TemplateRecord[]> {
        try {
            const rows = await Template.all(withInactive);
            if (rows.length === 0) {
                return [];
            }

            const keyRows = await TemplateKey.forTemplateIds(rows.map((row) => row.id));
            const valuesByTemplate = TemplateKey.groupByTemplateId(keyRows);

            return rows.map((row) => ({
                ...row,
                values: valuesByTemplate.get(row.id) ?? {},
            }));
        } catch (error) {
            throw new DatabaseException('Failed to retrieve templates', INTERNAL_SERVER_ERROR_CODE, {
                cause: error,
            });
        }
    }

    async create(data: TemplateData): Promise<TemplateRecord & { id: number }> {
        const template = {
            template_name: data.template_name,
            category: data.category || null,
            description: data.description || null,
            preview: data.preview || null,
            is_active: data.is_active ?? true,
            values: TemplateKey.normalize(data.values),
        };

        let session: DbSession;
        try {
            session = await db.beginTransaction();
        } catch (error) {
            throw new DatabaseException('Failed to register template', INTERNAL_SERVER_ERROR_CODE, {
                cause: error,
            });
        }

        try {
            const id = await Template.create(template, session);
            if (id === undefined) {
                throw new DatabaseException('Failed to register template');
            }

            await TemplateKey.insertMany(id, template.values, session);
            await session.commit();

            return { id, ...template };
        } catch (error) {
            await session.rollback().catch(() => undefined);

            if (error instanceof DatabaseException) {
                throw error;
            }

            const dbError = describeDbError(error);

            if (isUniqueViolation(dbError)) {
                throw new DuplicateResourceException(
                    duplicateTemplateMessage(template.template_name),
                    DUPLICATE_TEMPLATE_CODE
                );
            }

            if (isCheckViolation(dbError)) {
                throw new ValidationException(dbError.message);
            }

            throw databaseError(error, 'Failed to register template');
        }
    }

    async update(id: number, values: TemplateValues): Promise<TemplateRecord | null> {
        let session: DbSession;
        try {
            session = await db.beginTransaction();
        } catch (error) {
            throw new DatabaseException('Failed to update template', INTERNAL_SERVER_ERROR_CODE, {
                cause: error,
            });
        }

        try {
            const exists = await Template.lock(id, session);
            if (!exists) {
                throw new NotFoundException('Template');
            }

            await TemplateKey.replaceAll(id, values, session);
            await Template.touch(id, session);

            const summary = await Template.findSummary(id, session);
            const keyRows = await TemplateKey.forTemplate(id, session);

            await session.commit();

            return summary
                ? { ...summary, values: TemplateKey.fromStoredValues(keyRows) }
                : null;
        } catch (error) {
            await session.rollback().catch(() => undefined);

            if (error instanceof NotFoundException) {
                throw error;
            }

            const dbError = describeDbError(error);

            if (isCheckViolation(dbError)) {
                throw new ValidationException(dbError.message);
            }

            throw databaseError(error, 'Failed to update template');
        }
    }

    async delete(id: number): Promise<TemplateSummary> {
        try {
            const removed = await Template.delete(id);
            if (!removed) {
                throw new NotFoundException('Template');
            }
            return removed;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw databaseError(error, 'Failed to remove template');
        }
    }
}
