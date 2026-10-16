import { asError } from '@seedcord/utils/internal';
import { Routes } from 'discord-api-types/v10';

import { applicationOf } from '#core/discord/applicationOf';
import { guildSummaries } from '#core/discord/guildSummaries';
import { readBotGuilds } from '#core/discord/readBotGuilds';
import { readDeployed } from '#core/discord/readDeployed';
import { plural } from '#core/format';

import type { GuildSummary } from '#core/discord/readBotGuilds';
import type { DiscordRest } from './runnerDeps';
import type { GuildScope, GuildTargets, Scope, ScopedCommands } from './scope';
import type { APIApplicationCommand, RESTGetAPIApplicationCommandsResult, Snowflake } from 'discord-api-types/v10';

export interface SkippedGuild {
    guild: GuildSummary;
    reason: string;
}

export interface Scan {
    global: APIApplicationCommand[];
    // the guilds it could read, in the order they were asked for
    guilds: ScopedCommands<GuildScope>[];
    skipped: SkippedGuild[];
}

export type RemoveFailure =
    | {
          readonly kind: 'command';
          readonly scope: Scope;
          readonly command: APIApplicationCommand;
          readonly reason: string;
      }
    | { readonly kind: 'scope'; readonly scope: Scope; readonly reason: string };

export interface RemoveResult {
    deleted: number;
    failed: RemoveFailure[];
}

export function skippedLine(skipped: readonly SkippedGuild[]): string {
    const names = skipped.map(({ guild }) => guild.name).join(', ');
    return `Could not read ${plural(skipped.length, 'guild')} (${names}).`;
}

function commandsRoute(appId: Snowflake, scope: Scope): `/${string}` {
    return scope.kind === 'global'
        ? Routes.applicationCommands(appId)
        : Routes.applicationGuildCommands(appId, scope.id);
}

function commandRoute(appId: Snowflake, scope: Scope, commandId: Snowflake): `/${string}` {
    return scope.kind === 'global'
        ? Routes.applicationCommand(appId, commandId)
        : Routes.applicationGuildCommand(appId, scope.id, commandId);
}

export class DiscordSession {
    private constructor(
        private readonly rest: DiscordRest,
        public readonly appId: Snowflake
    ) {}

    public static async open(rest: DiscordRest): Promise<DiscordSession> {
        const { id } = await applicationOf(rest);
        return new DiscordSession(rest, id);
    }

    public guildsOf(targets: GuildTargets): Promise<GuildSummary[]> {
        if (targets.kind === 'all') return readBotGuilds(this.rest);
        if (targets.kind === 'none') return Promise.resolve([]);
        return guildSummaries(this.rest, targets.ids, targets.knownNames);
    }

    public async readScopes(guilds: readonly GuildSummary[]): Promise<Scan> {
        const { global } = await readDeployed(this.rest, this.appId, []);
        const scan: Scan = { global: [...global.values()], guilds: [], skipped: [] };

        for (const guild of guilds) {
            const scope: GuildScope = { kind: 'guild', ...guild };
            try {
                scan.guilds.push({ scope, commands: await this.commandsIn(scope) });
            } catch (error: unknown) {
                scan.skipped.push({ guild, reason: asError(error).message });
            }
        }
        return scan;
    }

    public async deleteCommands(selected: readonly ScopedCommands[]): Promise<RemoveResult> {
        const result: RemoveResult = { deleted: 0, failed: [] };
        for (const { scope, commands } of selected) {
            for (const command of commands) {
                try {
                    await this.rest.delete(commandRoute(this.appId, scope, command.id));
                    result.deleted++;
                } catch (error: unknown) {
                    result.failed.push({ kind: 'command', scope, command, reason: asError(error).message });
                }
            }
        }
        return result;
    }

    public async clearScopes(selected: readonly ScopedCommands[]): Promise<RemoveResult> {
        const result: RemoveResult = { deleted: 0, failed: [] };
        for (const { scope, commands } of selected) {
            try {
                await this.rest.put(commandsRoute(this.appId, scope), { body: [] });
                result.deleted += commands.length;
            } catch (error: unknown) {
                result.failed.push({ kind: 'scope', scope, reason: asError(error).message });
            }
        }
        return result;
    }

    private async commandsIn(scope: Scope): Promise<APIApplicationCommand[]> {
        // justified: the discord api contract for both command list routes
        return (await this.rest.get(commandsRoute(this.appId, scope))) as RESTGetAPIApplicationCommandsResult;
    }
}
