import { z } from 'zod';
import { ValidationException } from '../../Exceptions/ValidationException';
import {
    isEventKey,
    isPageKey,
    type EventKey,
    type PageKey,
} from '../../Security/AccessCatalog';

const accessSchema = z.object({
    pages: z.array(z.string({ message: 'Page keys must be strings' }), {
        message: 'Pages must be an array',
    }),
    events: z.array(z.string({ message: 'Event keys must be strings' }), {
        message: 'Events must be an array',
    }),
});

export interface AccessUpdate {
    pages: PageKey[];
    events: EventKey[];
}

export class UpdateAccessRequest {
    static validate(body: unknown): AccessUpdate {
        const parsed = accessSchema.safeParse(body);
        if (!parsed.success) {
            throw new ValidationException(
                'Invalid access payload',
                z.flattenError(parsed.error).fieldErrors
            );
        }

        const unknownPages = parsed.data.pages.filter((page) => !isPageKey(page));
        const unknownEvents = parsed.data.events.filter((event) => !isEventKey(event));

        if (unknownPages.length > 0 || unknownEvents.length > 0) {
            throw new ValidationException('Invalid access payload', {
                pages: unknownPages.map((page) => `Unknown page "${page}"`),
                events: unknownEvents.map((event) => `Unknown event "${event}"`),
            });
        }

        return {
            pages: [...new Set(parsed.data.pages)] as PageKey[],
            events: [...new Set(parsed.data.events)] as EventKey[],
        };
    }
}
