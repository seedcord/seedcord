import { Guild, PermissionFlagsBits, Role } from 'discord.js';

import { prettify } from '../../library/Helpers';
import {
  MissingPermissions,
  CannotAssignBotRole,
  HasDangerousPermissions,
  RoleDoesNotExist,
  RoleHigherThanMe
} from '../errors/Roles';

import type { Nullable } from '@seedcord/types';
import type { Client, PermissionsBitField, TextChannel } from 'discord.js';

export const PermissionNames = new Map<bigint, string>(
  Object.entries(PermissionFlagsBits).map(([key, bit]) => [bit, prettify(key)])
);

/**
 * Defines the scope types for bot permission validation.
 */
export type BotPermissionScope = 'manage' | 'others' | 'all' | bigint[] | 'embed';

/**
 * Utility functions for Discord role operations and permission validation.
 */
export class RoleUtils {
  /**
   * Fetches a role by ID from a client or guild.
   *
   * @param clientOrGuild - Discord client or guild instance
   * @param roleId - The role ID to fetch
   * @returns Promise resolving to the role
   * @throws A {@link RoleDoesNotExist} When the role doesn't exist
   */
  public static async fetchRole(clientOrGuild: Client | Guild, roleId: string): Promise<Role> {
    let role: Nullable<Role>;

    if (!roleId) {
      throw new RoleDoesNotExist('Role ID is null or undefined', roleId);
    }

    if (clientOrGuild instanceof Guild) {
      const guild = clientOrGuild;

      role = guild.roles.cache.get(roleId);

      if (!role) {
        try {
          role = await guild.roles.fetch(roleId);
        } catch {
          throw new RoleDoesNotExist('Role not found in specified guild', roleId);
        }
      }
    } else {
      const client = clientOrGuild;

      role = client.guilds.cache.map((guild) => guild.roles.cache.get(roleId)).find((role) => role);

      if (!role) {
        const guilds = client.guilds.cache;
        for (const guild of guilds.values()) {
          try {
            role = await guild.roles.fetch(roleId);
            if (role) break;
          } catch {
            continue;
          }
        }
      }
    }

    if (!role) {
      throw new RoleDoesNotExist('Role not found', roleId);
    }

    return role;
  }

  /**
   * Gets the bot's highest role in a guild.
   *
   * @param client - The Discord client instance
   * @param guild - The guild to get the bot's role from
   * @returns The bot's highest role in the guild
   * @throws An {@link Error} When the bot is not in the guild
   */
  public static getBotRole(client: Client, guild: Guild): Role {
    if (!client.user) throw new Error('Client user is not available'); // TODO: Use custom error

    const botRole = guild.roles.botRoleFor(client.user);
    if (!botRole) throw new Error('Bot role not found in guild'); // TODO: Use custom error

    return botRole;
  }

  /**
   * Validates if the bot has permission to assign a target role.
   *
   * @param targetRole - The role to check assignment permissions for
   * @throws A {@link RoleHigherThanMe} When the target role is higher than bot's role
   * @throws A {@link CannotAssignBotRole} When trying to assign a managed/bot role
   * @throws A {@link MissingPermissions} When bot lacks Manage Roles permission
   */
  public static hasPermsToAssign(targetRole: Role): void {
    const botRole = this.getBotRole(targetRole.client, targetRole.guild);

    if (targetRole.comparePositionTo(botRole) >= 0) {
      throw new RoleHigherThanMe('Role is higher than me', targetRole, botRole);
    }

    if (targetRole.managed) {
      throw new CannotAssignBotRole(`Cannot assign bot role ${targetRole.name}`);
    }

    this.checkBotPermissions(targetRole.client, targetRole.guild, [PermissionFlagsBits.ManageRoles]);
  }

  /**
   * Checks if the bot has required permissions in a guild or channel.
   *
   * @param client - The Discord client instance
   * @param guildOrChannel - Guild or text channel to check permissions in
   * @param scope - Permission scope to validate
   * @param inverse - Whether to check for absence of permissions
   * @throws A {@link MissingPermissions} When bot lacks required permissions
   */
  public static checkBotPermissions(
    client: Client,
    guildOrChannel: Guild | TextChannel,
    scope: BotPermissionScope = 'all',
    inverse = false
  ): void {
    if (guildOrChannel instanceof Guild) {
      const botRole = this.getBotRole(client, guildOrChannel);
      this.checkPermissions(client, botRole, scope, inverse);
    } else {
      this.checkPermissions(client, guildOrChannel, scope);
    }
  }

  /**
   * Checks permissions for a role or channel with overloads.
   *
   * @param client - The Discord client instance
   * @param roleOrChannel - Role or channel to check permissions for
   * @param scope - Permission scope to validate
   * @param inverse - Whether to check for absence of permissions (role only)
   * @throws A {@link MissingPermissions} When required permissions are missing
   * @throws A {@link HasDangerousPermissions} When role has dangerous permissions (if inverse is true)
   */
  public static checkPermissions(
    client: Client,
    roleOrChannel: Role,
    scope: BotPermissionScope,
    inverse: boolean
  ): void;
  public static checkPermissions(client: Client, roleOrChannel: TextChannel, scope?: BotPermissionScope): void;
  public static checkPermissions(
    client: Client,
    roleOrChannel: Role | TextChannel,
    scope: BotPermissionScope = 'all',
    inverse = false
  ): void {
    const PERMS = {
      manage: new Map<bigint, string>([
        [PermissionFlagsBits.ManageChannels, 'Manage Channels'],
        [PermissionFlagsBits.ManageRoles, 'Manage Roles'],
        [PermissionFlagsBits.ManageWebhooks, 'Manage Webhooks'],
        [PermissionFlagsBits.ManageMessages, 'Manage Messages'],
        [PermissionFlagsBits.ManageNicknames, 'Manage Nicknames']
      ]),
      embed: new Map<bigint, string>([
        [PermissionFlagsBits.ViewChannel, 'View Channel'],
        [PermissionFlagsBits.SendMessages, 'Send Messages'],
        [PermissionFlagsBits.EmbedLinks, 'Embed Links'],
        [PermissionFlagsBits.AttachFiles, 'Attach Files'],
        [PermissionFlagsBits.UseExternalEmojis, 'Use External Emojis'],
        [PermissionFlagsBits.ReadMessageHistory, 'Read Message History']
      ]),
      others: new Map<bigint, string>([
        [PermissionFlagsBits.AddReactions, 'Add Reactions'],
        [PermissionFlagsBits.UseApplicationCommands, 'Use Application Commands']
      ])
    };

    let required: Map<bigint, string>;
    if (Array.isArray(scope)) {
      required = new Map();
      for (const bit of scope) {
        // Try finding the permission name in both groups
        const name = PermissionNames.get(bit);
        if (name) required.set(bit, name);
      }
    } else {
      switch (scope) {
        case 'manage':
          required = PERMS.manage;
          break;
        case 'embed':
          required = PERMS.embed;
          break;
        case 'others':
          required = new Map([...PERMS.others, ...PERMS.embed]);
          break;
        default:
          required = new Map([...PERMS.manage, ...PERMS.others, ...PERMS.embed]);
          break;
      }
    }

    let permissions: Nullable<Readonly<PermissionsBitField>>;
    if (roleOrChannel instanceof Role) {
      permissions = roleOrChannel.permissions;
    } else {
      if (!client.user) throw new Error('Client user is not available'); // TODO: Use custom error
      permissions = roleOrChannel.permissionsFor(client.user, true);
    }

    if (!permissions) {
      throw new MissingPermissions('Missing Permissions', Array.from(required.values()), roleOrChannel);
    }

    if (inverse) {
      const dangerous = Array.from(required.entries())
        .filter(([bit]) => permissions.has(bit, true))
        .map(([, name]) => name);

      if (dangerous.length > 0) {
        throw new HasDangerousPermissions('Role has dangerous permissions', roleOrChannel as Role, dangerous);
      }
    } else {
      const missing = Array.from(required.entries())
        .filter(([bit]) => !permissions.has(bit, true))
        .map(([, name]) => name);

      if (missing.length > 0) {
        throw new MissingPermissions('Missing Permissions', missing, roleOrChannel);
      }
    }
  }
}
