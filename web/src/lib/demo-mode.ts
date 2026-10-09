/**
 * True when the app renders from `src/demo/fixtures.ts` instead of real APIs.
 * Enabled by `.env.demo` via `npm run dev:demo` — never in normal builds.
 */
export function isDemoMode(): boolean {
    return import.meta.env.VITE_USE_FIXTURES === "true";
}
