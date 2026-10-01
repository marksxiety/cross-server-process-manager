import type { PersistOptions } from "zustand/middleware";
import type { z } from "zod";

type PersistedOf<TSchema extends z.ZodType> = z.infer<TSchema>;

export interface PersistedStoreConfig<TSchema extends z.ZodObject> {
    name: string;
    schema: TSchema;
    version?: number;
}

/**
 * Builds zustand `persist` options from a zod schema describing the persisted
 * slice. The schema's keys drive `partialize`, and `merge` validates the
 * rehydrated value with `safeParse` — a corrupt or stale cache falls back to the
 * current state instead of reaching the UI. Removes the need for a bespoke
 * runtime guard in every store.
 */
export function persistedStore<TState extends object, TSchema extends z.ZodObject>({
    name,
    schema,
    version,
}: PersistedStoreConfig<TSchema>): PersistOptions<TState, PersistedOf<TSchema>> {
    const keys = Object.keys(schema.shape) as Array<keyof TState & string>;

    return {
        name,
        version,
        partialize: (state) => {
            const slice: Record<string, unknown> = {};
            for (const key of keys) slice[key] = state[key];
            return slice as PersistedOf<TSchema>;
        },
        merge: (persistedState, currentState) => {
            const parsed = schema.safeParse(persistedState);
            return parsed.success ? ({ ...currentState, ...parsed.data } as TState) : currentState;
        },
        onRehydrateStorage: () => (_state, error) => {
            if (error) {
                console.warn(`persist(${name}): could not restore cached state`, error);
            }
        },
    };
}
