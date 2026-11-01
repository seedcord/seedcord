import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Guild } from 'discord.js';

import { checkPermissions } from './checkPermissions';

import type { CheckPermissionOptions } from './checkPermissions';
import type { GuildBasedChannel, GuildMember } from 'discord.js';

/** Options for {@link checkBotPermissions}. */
export interface CheckBotPermissionOptions extends Omit<CheckPermissionOptions, 'for' | 'in'> {
    /** A guild, to read the bot's base set from roles, or a channel or thread, to read its set there. */
    in: Guild | GuildBasedChannel;
}

function botMemberOf(guild: Guild): GuildMember {
    const me = guild.members.me;
    if (!me) throw new SeedcordError(SeedcordErrorCode.CoreBotMemberMissing, [guild.id]);
    return me;
}

/**
 * Checks the bot's own permissions in a {@link Guild}, or in a channel or thread. Refuses when a permission
 * in `scope` is missing, or with `inverse` when one is present.
 *
 * @throws A {@link Notice} when the check refuses. It lists the missing or present permissions.
 * @throws A **SeedcordError** when the guild's member cache has no member for the bot.
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkBotPermissions } from '@seedcord/gateway';
 *
 * checkBotPermissions({ in: channel, scope: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel] });
 * ```
 */
export function checkBotPermissions({ in: where, ...check }: CheckBotPermissionOptions): void {
    const [guild, channel] = where instanceof Guild ? [where, undefined] : [where.guild, where];
    checkPermissions({ for: botMemberOf(guild), ...(channel && { in: channel }), ...check });
}
