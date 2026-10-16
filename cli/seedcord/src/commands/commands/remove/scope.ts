import type { GuildSummary } from '#core/discord/readBotGuilds';
import type { APIApplicationCommand } from 'discord-api-types/v10';

export type DeployedCommand = Pick<APIApplicationCommand, 'id' | 'name' | 'type'>;

export type Scope = { readonly kind: 'global' } | ({ readonly kind: 'guild' } & GuildSummary);

export const GLOBAL_SCOPE: Scope = { kind: 'global' };

export interface ScopedCommands {
    readonly scope: Scope;
    readonly commands: readonly DeployedCommand[];
}

export type GuildTargets =
    | { readonly kind: 'none' }
    | { readonly kind: 'named'; readonly guilds: readonly GuildSummary[] }
    | { readonly kind: 'all' };

export interface GuildFlags {
    readonly guilds?: readonly string[] | undefined;
    readonly allGuilds?: boolean | undefined;
}

// a guild passed by id shows its id until something reads its name
export function guildTargetsOf({ guilds = [], allGuilds = false }: GuildFlags): GuildTargets {
    if (allGuilds) return { kind: 'all' };
    if (guilds.length === 0) return { kind: 'none' };
    return { kind: 'named', guilds: guilds.map((id) => ({ id, name: id })) };
}

export function scopeTitle(scope: Scope): string {
    return scope.kind === 'global' ? 'global' : scope.name;
}

export function commandCount(scopes: readonly ScopedCommands[]): number {
    return scopes.reduce((sum, { commands }) => sum + commands.length, 0);
}
