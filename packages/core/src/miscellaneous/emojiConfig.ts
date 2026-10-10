// narrows a configured emoji value to the [name, guildId] form
export function isEmojiTuple(value: unknown): value is readonly [string, string] {
    return Array.isArray(value) && value.length === 2 && value.every((part) => typeof part === 'string');
}
