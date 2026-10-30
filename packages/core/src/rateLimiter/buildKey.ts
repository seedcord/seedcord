/**
 * Builds a rate-limit key from a prefix and scope parts, joined with `:`. A null or undefined part
 * becomes `'global'`, so a missing scope (a DM's guild id) collapses into one shared bucket.
 *
 * @param prefix - Names the bucket family, e.g. `'cooldown'`.
 * @param parts - Scope values, e.g. a user or guild id.
 *
 * @example
 * ```ts
 * buildKey('report', interaction.guildId); // 'report:1234...' or 'report:global' in a DM
 * ```
 */
export function buildKey(prefix: string, ...parts: readonly (string | null | undefined)[]): string {
    if (parts.length === 0) return prefix;
    return [prefix, ...parts.map((part) => part ?? 'global')].join(':');
}
