import type { Client } from 'pg';
import templates from './templates';

export type SeedFn = (client: Client) => Promise<void>;

// Ordered list of seeders (DatabaseSeeder pattern). Add new seeders here so the
// execution order is explicit and deterministic.
const seeders: SeedFn[] = [templates];

export default seeders;
