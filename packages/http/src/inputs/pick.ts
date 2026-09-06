import { Collection } from '@discordjs/collection';

// a Collection because the gateway handlers return discord.js Collections for the same picks
export function pick<Value>(
    ids: readonly string[] | undefined,
    bucket: Record<string, Value> | undefined
): Collection<string, Value> {
    const found = new Collection<string, Value>();
    if (!ids || !bucket) return found;
    for (const id of ids) if (Object.hasOwn(bucket, id)) found.set(id, bucket[id] as Value);
    return found;
}
