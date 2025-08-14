import { Guild, PermissionFlagsBits, Role } from 'discord.js';

import { prettify } from '../../library/Helpers';
import {
  BotMissingPermissionsError,
  CannotAssignBotRole,
  HasDangerousPermissions,
  RoleDoesNotExist,
  RoleHigherThanMe
} from '../errors/Roles';

import type { BotPermissionScope, Nullish } from '@seedcord/types';
import type { Client, PermissionsBitField, TextChannel } from 'discord.js';

export const PermissionNames = new Map<bigint, string>(
  Object.entries(PermissionFlagsBits).map(([key, bit]) => [bit, prettify(key)])
);

export class RoleUtils {
  public static async fetchRole(clientOrGuild: Client | Guild, roleId: string): Promise<Role> {
    let role: Nullish<Role>;

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

  public static getBotRole(client: Client, guild: Guild): Role {
    if (!client.user) throw new Error('Client user is not available'); // TODO: Use custom error

    const botRole = guild.roles.botRoleFor(client.user);
    if (!botRole) throw new Error('Bot role not found in guild'); // TODO: Use custom error

    return botRole;
  }

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

    let permissions: Nullish<Readonly<PermissionsBitField>>;
    if (roleOrChannel instanceof Role) {
      permissions = roleOrChannel.permissions;
    } else {
      if (!client.user) throw new Error('Client user is not available'); // TODO: Use custom error
      permissions = roleOrChannel.permissionsFor(client.user, true);
    }

    if (!permissions) {
      throw new BotMissingPermissionsError('Missing Permissions', Array.from(required.values()), roleOrChannel);
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
        throw new BotMissingPermissionsError('Missing Permissions', missing, roleOrChannel);
      }
    }
  }
}
