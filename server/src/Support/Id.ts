export function parseIdParam(value: string | string[] | undefined): number | null {
    if (typeof value !== 'string') {
        return null;
    }

    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}
