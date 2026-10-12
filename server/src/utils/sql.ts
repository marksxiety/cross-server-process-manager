/** Builds a positional "@p1, @p2, ..." list for an IN clause. */
export function buildPlaceholders(count: number): string {
    return Array.from({ length: count }, (_, index) => `@p${index + 1}`).join(', ');
}
