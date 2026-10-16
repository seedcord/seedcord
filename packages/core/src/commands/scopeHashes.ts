import { commandKey } from '#src/commands/linkCommands';

import type { CommandBody, CommandScopes } from '#src/commands/putCommands';
import type { DeployedHashes } from '@seedcord/types/internal';

export type ScopeHashes = Omit<DeployedHashes, 'applicationId'>;

const HEX = 16;

async function hashOf(commands: readonly CommandBody[]): Promise<string> {
    // load order differs between the CLI scan and the registry
    const sorted = commands.toSorted((a, b) => commandKey(a).localeCompare(commandKey(b)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(sorted)));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(HEX).padStart(2, '0')).join('');
}

interface SplitScopes {
    changed: CommandScopes;
    unchanged: CommandScopes;
}

// last is undefined until something deployed for this application
export function splitByHash(scopes: CommandScopes, hashes: ScopeHashes, last: ScopeHashes | undefined): SplitScopes {
    const globalUnchanged = scopes.global !== undefined && hashes.global === last?.global;
    const changed = new Map<string, readonly CommandBody[]>();
    const unchanged = new Map<string, readonly CommandBody[]>();
    for (const [guildId, commands] of scopes.guilds) {
        const same = hashes.guilds[guildId] === last?.guilds[guildId];
        (same ? unchanged : changed).set(guildId, commands);
    }
    return {
        changed: { global: globalUnchanged ? undefined : scopes.global, guilds: changed },
        unchanged: { global: globalUnchanged ? scopes.global : undefined, guilds: unchanged }
    };
}

export async function scopeHashes({ global, guilds }: CommandScopes): Promise<ScopeHashes> {
    const guildHashes = await Promise.all(
        [...guilds].map(async ([guildId, commands]) => [guildId, await hashOf(commands)] as const)
    );
    const hashes = { guilds: Object.fromEntries(guildHashes) };
    return global ? { ...hashes, global: await hashOf(global) } : hashes;
}
