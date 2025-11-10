import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';
import { prettify } from '@seedcord/utils';
import { Role, PermissionFlagsBits } from 'discord.js';

import { MissingPermissions, HasDangerousPermissions } from '@bErrors/Roles';

import type { Nullable, TypedExclude } from '@seedcord/types';
import type { Client, TextChannel, PermissionsBitField } from 'discord.js';

/**
 * Map of permission bits to their prettified human-readable names.
 */
export const PermissionNames = new Map<bigint, string>(
    Object.entries(PermissionFlagsBits).map(([key, bit]) => [bit, prettify(key)])
);

/**
 * Defines the scope types for bot permission validation.
 */
export type BotPermissionScope = 'manage' | 'others' | 'all' | bigint[] | 'embed';

/**
 * Defines the valid group types for permission checking, excluding 'all' and bigint[].
 */
export type BotPermissionScopeGroups = TypedExclude<BotPermissionScope, 'all' | bigint[]>;

// TODO: Update perm groups so they make better sense
/**
 * Predefined permission groups for different scopes.
 */
export const PERM_GROUPS: Record<BotPermissionScopeGroups, Map<bigint, string>> = {
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

/**
 * Checks permissions for a {@link Role}.
 *
 * @param client - The Discord client instance
 * @param roleOrChannel - Role to check permissions for
 * @param scope - Permission scope to validate
 * @param inverse - Whether to check for absence of permissions (role only). Defaults to false.
 * @throws A {@link MissingPermissions} When required permissions are missing
 * @throws A {@link HasDangerousPermissions} When role has dangerous permissions (if inverse is true)
 */
export function checkPermissions(
    client: Client,
    roleOrChannel: Role,
    scope: BotPermissionScope,
    inverse?: boolean
): void;

/**
 * Checks permissions for a {@link TextChannel}.
 *
 * @param client - The Discord client instance
 * @param roleOrChannel - TextChannel to check permissions for
 * @param scope - Permission scope to validate
 * @throws A {@link MissingPermissions} When required permissions are missing
 */
export function checkPermissions(client: Client, roleOrChannel: TextChannel, scope?: BotPermissionScope): void;

export function checkPermissions(
    client: Client,
    roleOrChannel: Role | TextChannel,
    scope: BotPermissionScope = 'all',
    inverse = false
): void {
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
                required = PERM_GROUPS.manage;
                break;
            case 'embed':
                required = PERM_GROUPS.embed;
                break;
            case 'others':
                required = new Map([...PERM_GROUPS.others, ...PERM_GROUPS.embed]);
                break;
            default:
                required = new Map([...PERM_GROUPS.manage, ...PERM_GROUPS.others, ...PERM_GROUPS.embed]);
                break;
        }
    }

    let permissions: Nullable<Readonly<PermissionsBitField>>;
    if (roleOrChannel instanceof Role) {
        permissions = roleOrChannel.permissions;
    } else {
        if (!client.user) {
            throw new SeedcordError(SeedcordErrorCode.CoreClientUserUnavailable);
        }
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
