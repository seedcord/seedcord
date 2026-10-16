import { GLOBAL_ID } from '@seedcord/core/internal';

import type { GuildSummary } from '@seedcord/core/internal';
import type { APIApplicationCommand } from 'discord-api-types/v10';

export type Scope =
    { readonly kind: 'global'; readonly id: typeof GLOBAL_ID } | ({ readonly kind: 'guild' } & GuildSummary);

export type GuildScope = Extract<Scope, { kind: 'guild' }>;

export const GLOBAL_SCOPE: Scope = { kind: 'global', id: GLOBAL_ID };

export interface ScopedCommands<Where extends Scope = Scope> {
    readonly scope: Where;
    readonly commands: readonly APIApplicationCommand[];
}

export type GuildTargets =
    | { readonly kind: 'none' }
    | { readonly kind: 'named'; readonly ids: readonly string[]; readonly knownNames?: ReadonlyMap<string, string> }
    | { readonly kind: 'all' };

export interface GuildFlags {
    readonly guilds?: readonly string[] | undefined;
    readonly allGuilds?: boolean | undefined;
}

export function guildTargetsOf({ guilds = [], allGuilds = false }: GuildFlags): GuildTargets {
    if (allGuilds) return { kind: 'all' };
    return guilds.length === 0 ? { kind: 'none' } : { kind: 'named', ids: guilds };
}

export function scopeTitle(scope: Scope): string {
    return scope.kind === 'global' ? 'global' : scope.name;
}

export function commandCount(scopes: readonly ScopedCommands[]): number {
    return scopes.reduce((sum, { commands }) => sum + commands.length, 0);
}
