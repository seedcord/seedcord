// discord.js guards the values key on every select kind
export function pick<Value>(
    ids: readonly string[] | undefined,
    bucket: Record<string, Value> | undefined
): Map<string, Value> {
    const found = new Map<string, Value>();
    if (!ids || !bucket) return found;
    for (const id of ids) if (Object.hasOwn(bucket, id)) found.set(id, bucket[id] as Value);
    return found;
}
