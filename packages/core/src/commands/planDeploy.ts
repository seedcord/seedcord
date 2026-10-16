import { commandKey } from '#src/commands/linkCommands';
import { globalFirst } from '#src/commands/scopes';

import type { CommandBody, CommandScopes } from '#src/commands/putCommands';
import type { ScopeId } from '#src/commands/scopes';
import type { DeployResult } from '#src/commands/types';
import type { DeployedHashes } from '@seedcord/types/internal';
import type { APIApplicationCommand } from 'discord-api-types/v10';

type ScopeHashes = DeployedHashes['scopes'];

interface DeployPlan {
    hashes: ScopeHashes;
    // saved before the PUTs in case one fails
    skippedHashes: ScopeHashes;
    toPut: CommandScopes;
    skipped: ScopeId[];
    onDiscord: DeployResult;
}

const HEX = 16;

function byCodePoint(a: string, b: string): number {
    return a < b ? -1 : Number(a > b);
}

async function hashOf(commands: readonly CommandBody[]): Promise<string> {
    // load order differs between the CLI scan and the registry
    const sorted = commands.toSorted((a, b) => byCodePoint(commandKey(a), commandKey(b)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(sorted)));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(HEX).padStart(2, '0')).join('');
}

async function scopeHashes(scopes: CommandScopes): Promise<ScopeHashes> {
    const hashed = [...scopes].map(async ([scope, commands]) => [scope, await hashOf(commands)] as const);
    return Object.fromEntries(await Promise.all(hashed));
}

function sameCommandNames(
    inCode: readonly CommandBody[],
    deployed: Map<string, APIApplicationCommand> | undefined
): boolean {
    const onDiscord = new Set(deployed?.values().map(commandKey));
    return new Set(inCode.map(commandKey)).symmetricDifference(onDiscord).size === 0;
}

export async function planDeploy(
    scopes: CommandScopes,
    last: ScopeHashes | undefined,
    readUnchanged: (scopes: ScopeId[]) => Promise<DeployResult>
): Promise<DeployPlan> {
    const hashes = await scopeHashes(scopes);
    const unchanged = globalFirst(scopes).filter(([scope]) => hashes[scope] === last?.[scope]);
    const onDiscord = await readUnchanged(unchanged.map(([scope]) => scope));
    const skipped = new Set(
        unchanged
            .filter(([scope, commands]) => sameCommandNames(commands, onDiscord.get(scope)))
            .map(([scope]) => scope)
    );
    return {
        hashes,
        skippedHashes: Object.fromEntries(Object.entries(hashes).filter(([scope]) => skipped.has(scope))),
        toPut: new Map(scopes.entries().filter(([scope]) => !skipped.has(scope))),
        skipped: [...skipped],
        onDiscord
    };
}
