/**
 * The role ids a member holds after adding and removing the given sets. Removals win over additions.
 *
 * This does not write the roles. Apply the result with `member.roles.set()` on gateway, or PATCH the member over HTTP.
 *
 * @param current - The role ids the member holds.
 * @param add - The role ids to add.
 * @param remove - The role ids to remove.
 * @returns The merged role ids.
 *
 * @example
 * ```ts
 * import { mergeRoles } from '@seedcord/core';
 *
 * // gateway
 * const ids = mergeRoles(member.roles.cache.map((role) => role.id), ['123'], ['456']);
 * await member.roles.set(ids);
 * ```
 */
export function mergeRoles(current: readonly string[], add: readonly string[], remove: readonly string[]): string[] {
    return [...new Set(current).union(new Set(add)).difference(new Set(remove))];
}
