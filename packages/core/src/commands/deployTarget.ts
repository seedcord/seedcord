import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { ConfigGuilds } from '#decorators/Command';

import type { CommandMeta } from '#decorators/Command';

export type DeployTarget = Exclude<CommandMeta, { scope: 'config' }>;

export function resolveDeployTarget(
    meta: CommandMeta,
    configured: readonly string[],
    commandName: string
): DeployTarget {
    if (meta.scope === 'global') return { scope: 'global' };

    if (meta.scope === 'config') {
        return configured.length > 0 ? guildTarget(configured) : { scope: 'global' };
    }

    if (configured.length === 0 && meta.guilds.includes(ConfigGuilds)) {
        throw new SeedcordError(SeedcordErrorCode.CoreCommandGuildsEmpty, [commandName]);
    }

    return guildTarget(meta.guilds.flatMap((target) => (target === ConfigGuilds ? configured : target)));
}

// a repeated id would push the same builder into one guild twice, and discord rejects a duplicate name in the put
function guildTarget(guilds: readonly string[]): DeployTarget {
    return { scope: 'guild', guilds: [...new Set(guilds)] };
}
