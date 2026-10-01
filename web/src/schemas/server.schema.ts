import { z } from 'zod'

export const registerServerSchema = z.object({
  server: z.string().trim().min(1, { message: 'Server name is required' }),
  protocol: z.enum(['http', 'https'], { message: 'Protocol is required' }),
  host: z.string().trim().min(1, { message: 'Host is required' }),
  port: z.coerce
    .number({ message: 'Port must be a number' })
    .int({ message: 'Port must be a whole number' })
    .min(1, { message: 'Port must be at least 1' })
    .max(65535, { message: 'Port must be 65535 or less' }),
  is_active: z.boolean(),
})

export type RegisterServerInput = z.input<typeof registerServerSchema>
export type RegisterServerValues = z.output<typeof registerServerSchema>

export const registeredServerSchema = z.object({
  id: z.number(),
  server: z.string(),
  protocol: z.enum(['http', 'https']),
  host: z.string(),
  port: z.number(),
  is_active: z.boolean(),
})

// Persisted slice — these keys drive `partialize` and the rehydration merge.
export const serverPersistSchema = z.object({
  servers: z.array(registeredServerSchema),
  serversFetchedAt: z.number().nullable(),
})
