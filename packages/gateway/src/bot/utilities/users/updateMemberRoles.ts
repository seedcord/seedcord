import type { Snowflake, GuildMember } from 'discord.js';

/**
 * Updates a guild member's roles by adding and removing specified roles.
 *
 * @param rolesToAdd - Array of role IDs to add to the member
 * @param rolesToRemove - Array of role IDs to remove from the member
 * @param member - The guild member to update
 * @returns Promise that resolves when roles are updated
 */
export async function updateMemberRoles(
    rolesToAdd: Snowflake[],
    rolesToRemove: Snowflake[],
    member: GuildMember
): Promise<void> {
    const current = new Set(member.roles.cache.map((r) => r.id));
    const toAdd = new Set(rolesToAdd);
    const toRemove = new Set(rolesToRemove);
    const updated = current.union(toAdd).difference(toRemove);

    await member.roles.set([...updated]);
}
