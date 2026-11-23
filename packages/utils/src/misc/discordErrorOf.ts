export interface DiscordErrorFields {
    status: number;
    code: number | string;
    url: string;
}

// use this over `instanceof DiscordAPIError`, which misses errors from the other build of `@discordjs/rest`.
// a gateway bot's rest throws from the CommonJS build because discord.js loads that one, and seedcord imports
// the ES module. `rawError` is only on `DiscordAPIError`
export function discordErrorOf(error: unknown): DiscordErrorFields | undefined {
    if (!Error.isError(error) || !('rawError' in error)) return undefined;
    const { status, code, url } = error as Partial<Record<keyof DiscordErrorFields, unknown>>;
    if (typeof status !== 'number' || typeof url !== 'string') return undefined;
    return typeof code === 'number' || typeof code === 'string' ? { status, code, url } : undefined;
}
