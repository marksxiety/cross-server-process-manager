import type { DbSession } from '../src/config/db';
import templates from './templates';

export type SeedFn = (session: DbSession) => Promise<void>;

// Ordered list of seeders (DatabaseSeeder pattern). Add new seeders here so the
// execution order is explicit and deterministic.
const seeders: SeedFn[] = [templates];

export default seeders;
