export function pick<Value>(
    ids: readonly string[],
    bucket: Record<string, Value> | undefined
): Map<string, Value> {
    const found = new Map<string, Value>();
    for (const id of ids) {
        const value = bucket?.[id];
        if (value !== undefined) found.set(id, value);
    }
    return found;
}
