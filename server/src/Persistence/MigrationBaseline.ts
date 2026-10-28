export function selectBaselineNames(
    available: string[],
    applied: Set<string>,
    target: string | undefined
): string[] {
    if (!target) {
        throw new Error(
            'Usage: npm run db:migrate:baseline -- <migration-file> | --all'
        );
    }

    if (target === '--all') {
        return available.filter((name) => !applied.has(name));
    }

    if (!available.includes(target)) {
        throw new Error(
            `Unknown migration "${target}". Available migrations:\n${available
                .map((name) => `  ${name}`)
                .join('\n')}`
        );
    }

    return applied.has(target) ? [] : [target];
}
