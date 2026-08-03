/** Narrows a configured emoji value to the `[name, guildId]` form. @internal */
export function isEmojiTuple(value: unknown): value is readonly [string, string] {
    return Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'string';
}
