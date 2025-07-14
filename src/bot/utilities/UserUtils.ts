import { Client, Guild, GuildMember, Snowflake, User } from 'discord.js';
import { UserNotInGuild } from '../errors/User';

export class UserUtils {
  public static async fetchGuildMember(guild: Guild, userId: string): Promise<GuildMember> {
    let user = guild.members.cache.get(userId);

    if (!user) {
      try {
        user = await guild.members.fetch(userId);
      } catch {
        throw new UserNotInGuild(`User with ID ${userId} not found in guild`);
      }
    }

    if (!user) {
      throw new UserNotInGuild(`User with ID ${userId} not found in guild`);
    }

    return user;
  }

  public static async fetchUser(client: Client, userId: string): Promise<User> {
    let user = client.users.cache.get(userId);

    if (!user) {
      user = await client.users.fetch(userId);
    }

    return user;
  }

  public static async fetchManyGuildMembers(guild: Guild, userIds: string[]): Promise<GuildMember[]> {
    const results = await Promise.allSettled(userIds.map((userId) => UserUtils.fetchGuildMember(guild, userId)));

    return results
      .filter((result): result is PromiseFulfilledResult<GuildMember> => result.status === 'fulfilled')
      .map((result) => result.value);
  }

  public static async fetchManyUsers(client: Client, userIds: string[]): Promise<User[]> {
    const results = await Promise.allSettled(userIds.map((userId) => UserUtils.fetchUser(client, userId)));

    return results
      .filter((result): result is PromiseFulfilledResult<User> => result.status === 'fulfilled')
      .map((result) => result.value);
  }

  public static async updateMemberRoles(
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
}
