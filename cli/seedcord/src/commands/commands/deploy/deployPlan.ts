import { commandRefOf, resolveDeployTarget } from '@seedcord/core/internal';

import type { FoundCommand } from '#core/modules/CommandScanner';
import type { CommandBody, CommandScopes } from '@seedcord/core/internal';
import type { APIApplicationCommand } from 'discord-api-types/v10';

// an empty global list makes the deploy clear the global scope
export interface ScopesInCode extends CommandScopes {
    readonly global: CommandBody[];
    readonly guilds: Map<string, CommandBody[]>;
}

export interface ScopeDiff {
    added: CommandBody[];
    removed: APIApplicationCommand[];
    // an edited description still counts as kept
    kept: CommandBody[];
}

export function scopesInCode(found: readonly FoundCommand[], configuredGuilds: readonly string[]): ScopesInCode {
    const scopes: ScopesInCode = { global: [], guilds: new Map() };
    for (const { json, meta, className } of found) {
        const target = resolveDeployTarget(meta, configuredGuilds, className);
        if (target.scope === 'global') {
            scopes.global.push(json);
            continue;
        }
        for (const guildId of target.guilds) {
            const inGuild = scopes.guilds.get(guildId) ?? [];
            inGuild.push(json);
            scopes.guilds.set(guildId, inGuild);
        }
    }
    return scopes;
}

function sameCommand(a: CommandBody | APIApplicationCommand, b: CommandBody | APIApplicationCommand): boolean {
    const [left, right] = [commandRefOf(a), commandRefOf(b)];
    return left.name === right.name && left.type === right.type;
}

export function diffScope(inCode: readonly CommandBody[], deployed: Iterable<APIApplicationCommand>): ScopeDiff {
    const onDiscord = [...deployed];
    const isDeployed = (command: CommandBody): boolean => onDiscord.some((other) => sameCommand(command, other));
    return {
        added: inCode.filter((command) => !isDeployed(command)),
        removed: onDiscord.filter((command) => !inCode.some((other) => sameCommand(command, other))),
        kept: inCode.filter(isDeployed)
    };
}
