import { putCommands, readCommands, readCommandsAt } from '@seedcord/core/internal';
import { asError } from '@seedcord/utils/internal';
import { Routes } from 'discord-api-types/v10';

import { applicationOf } from '#core/discord/applicationOf';
import { guildSummaries } from '#core/discord/guildSummaries';
import { readBotGuilds } from '#core/discord/readBotGuilds';

import type { GuildSummary } from '#core/discord/readBotGuilds';
import type { DiscordRest } from './runnerDeps';
import type { GuildScope, GuildTargets, Scope, ScopedCommands } from './scope';
import type { CommandScopes, DeployResult } from '@seedcord/core/internal';
import type { ILogger } from '@seedcord/types';
import type { APIApplicationCommand, Snowflake } from 'discord-api-types/v10';

export interface Scan {
    global: APIApplicationCommand[];
    // in the order they were asked for
    guilds: ScopedCommands<GuildScope>[];
}

export interface DeployTargets {
    deployed: DeployResult;
    guildNames: Map<string, string>;
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

    // throws on the first guild it cannot read, since a deploy replaces each one
    public async readTargets(guildIds: readonly string[]): Promise<DeployTargets> {
        const [deployed, guilds] = await Promise.all([
            readCommands({ global: true, guildIds }, this.reads()),
            guildSummaries(this.rest, guildIds)
        ]);
        return { deployed, guildNames: new Map(guilds.map(({ id, name }) => [id, name])) };
    }

    public deploy(scopes: CommandScopes, logger: Pick<ILogger, 'warn'>): Promise<DeployResult> {
        return putCommands(scopes, { rest: this.rest, applicationId: this.appId, logger });
    }

    public async readScopes(guilds: readonly GuildSummary[]): Promise<Scan> {
        const [global, ...guildScopes] = await Promise.all([
            readCommandsAt(undefined, this.reads()),
            ...guilds.map((guild) => this.readGuild(guild))
        ]);
        return { global: [...global.values()], guilds: guildScopes };
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

    private async readGuild(guild: GuildSummary): Promise<ScopedCommands<GuildScope>> {
        const commands = await readCommandsAt(guild.id, this.reads());
        return { scope: { kind: 'guild', ...guild }, commands: [...commands.values()] };
    }

    private reads(): { rest: DiscordRest; applicationId: Snowflake } {
        return { rest: this.rest, applicationId: this.appId };
    }
}
