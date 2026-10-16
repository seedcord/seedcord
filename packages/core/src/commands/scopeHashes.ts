import { commandKey } from '#src/commands/linkCommands';

import type { CommandBody, CommandScopes } from '#src/commands/putCommands';
import type { DeployResult } from '#src/commands/types';
import type { DeployedHashes } from '@seedcord/types/internal';
import type { APIApplicationCommand } from 'discord-api-types/v10';

export type ScopeHashes = DeployedHashes['scopes'];

const HEX = 16;

async function hashOf(commands: readonly CommandBody[]): Promise<string> {
    // load order differs between the CLI scan and the registry
    const sorted = commands.toSorted((a, b) => commandKey(a).localeCompare(commandKey(b)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(sorted)));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(HEX).padStart(2, '0')).join('');
}

export async function scopeHashes(scopes: CommandScopes): Promise<ScopeHashes> {
    const hashed = [...scopes].map(async ([scope, commands]) => [scope, await hashOf(commands)] as const);
    return Object.fromEntries(await Promise.all(hashed));
}

// last is undefined until something deployed for this application
export function splitByHash(
    scopes: CommandScopes,
    hashes: ScopeHashes,
    last: ScopeHashes | undefined
): { changed: CommandScopes; unchanged: CommandScopes } {
    const groups = Map.groupBy(scopes, ([scope]) => (hashes[scope] === last?.[scope] ? 'unchanged' : 'changed'));
    return { changed: new Map(groups.get('changed')), unchanged: new Map(groups.get('unchanged')) };
}

function matches(inCode: readonly CommandBody[], deployed: Map<string, APIApplicationCommand> | undefined): boolean {
    const onDiscord = new Set(deployed?.values().map(commandKey));
    return new Set(inCode.map(commandKey)).symmetricDifference(onDiscord).size === 0;
}

// compares by name and type
export function scopesDiscordLacks(unchanged: CommandScopes, read: DeployResult): CommandScopes {
    return new Map(unchanged.entries().filter(([scope, commands]) => !matches(commands, read.get(scope))));
}
