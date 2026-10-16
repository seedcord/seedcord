import { Routes } from 'discord-api-types/v10';

import type { DeployTarget } from '#src/commands/deployTarget';
import type { Snowflake } from 'discord-api-types/v10';
import type { LiteralUnion } from 'type-fest';

export const GLOBAL_ID = 'global';

const allOf = new Intl.ListFormat('en', { type: 'conjunction' });

// discord's guild ids are all digits
export type ScopeId = LiteralUnion<typeof GLOBAL_ID, Snowflake>;

export function commandsRoute(applicationId: Snowflake, scope: ScopeId): `/${string}` {
    return scope === GLOBAL_ID
        ? Routes.applicationCommands(applicationId)
        : Routes.applicationGuildCommands(applicationId, scope);
}

export function globalFirst<ValueT>(scopes: Iterable<readonly [ScopeId, ValueT]>): (readonly [ScopeId, ValueT])[] {
    return [...scopes].toSorted(([a], [b]) => Number(b === GLOBAL_ID) - Number(a === GLOBAL_ID));
}

export function scopeIdsOf(target: DeployTarget): readonly ScopeId[] {
    return target.scope === 'global' ? [GLOBAL_ID] : target.guilds;
}

export function skippedNote(skipped: readonly ScopeId[], guildLabel: (guildId: string) => string): string {
    const guilds = skipped.filter((scope) => scope !== GLOBAL_ID).map(guildLabel);
    const parts = [
        ...(skipped.includes(GLOBAL_ID) ? ['the global commands'] : []),
        ...(guilds.length > 0 ? [`the commands in ${allOf.format(guilds)}`] : [])
    ];
    return `Skipped ${allOf.format(parts)} because they match the last deploy.`;
}
