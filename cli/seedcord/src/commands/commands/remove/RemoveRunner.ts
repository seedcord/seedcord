import { REST } from '@discordjs/rest';
import { asError } from '@seedcord/utils/internal';
import { Routes } from 'discord-api-types/v10';

import { applicationOf } from '#core/discord/applicationOf';
import { readBotGuilds } from '#core/discord/readBotGuilds';

import type { GuildSummary } from '#core/discord/readBotGuilds';
import type { DeployedCommand, GuildTargets, Scope, ScopedCommands } from './scope';
import type { RESTGetAPIApplicationCommandsResult, Snowflake } from 'discord-api-types/v10';

type RestClient = Pick<REST, 'get' | 'delete' | 'put'>;

export interface Connected {
    appId: Snowflake;
    guilds: GuildSummary[];
}

export interface SkippedGuild {
    guild: GuildSummary;
    reason: string;
}

export interface Scan {
    global: DeployedCommand[];
    // the guilds that could be read, in the order they were asked for
    guilds: ScopedCommands[];
    skipped: SkippedGuild[];
}

export interface RemoveFailure {
    scope: Scope;
    // unset when a whole scope failed to clear
    command?: DeployedCommand | undefined;
    reason: string;
}

export interface RemoveResult {
    deleted: number;
    failed: RemoveFailure[];
}

export interface RemoveOps {
    connect(targets: GuildTargets, token: string): Promise<Connected>;
    scan(token: string, appId: Snowflake, guilds: readonly GuildSummary[]): Promise<Scan>;
    deleteCommands(token: string, appId: Snowflake, selected: readonly ScopedCommands[]): Promise<RemoveResult>;
    clearScopes(token: string, appId: Snowflake, selected: readonly ScopedCommands[]): Promise<RemoveResult>;
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

export class RemoveRunner implements RemoveOps {
    constructor(private readonly makeRest: (token: string) => RestClient) {}

    public static create(): RemoveRunner {
        return new RemoveRunner((token) => new REST({ version: '10' }).setToken(token));
    }

    public async connect(targets: GuildTargets, token: string): Promise<Connected> {
        const rest = this.makeRest(token);
        const { id: appId } = await applicationOf(rest);
        return { appId, guilds: await this.guildsOf(rest, targets) };
    }

    public listBotGuilds(token: string): Promise<GuildSummary[]> {
        return readBotGuilds(this.makeRest(token));
    }

    public async scan(token: string, appId: Snowflake, guilds: readonly GuildSummary[]): Promise<Scan> {
        const rest = this.makeRest(token);
        const scan: Scan = { global: await this.read(rest, appId, { kind: 'global' }), guilds: [], skipped: [] };

        for (const guild of guilds) {
            const scope: Scope = { kind: 'guild', ...guild };
            try {
                scan.guilds.push({ scope, commands: await this.read(rest, appId, scope) });
            } catch (error: unknown) {
                scan.skipped.push({ guild, reason: asError(error).message });
            }
        }
        return scan;
    }

    public async deleteCommands(
        token: string,
        appId: Snowflake,
        selected: readonly ScopedCommands[]
    ): Promise<RemoveResult> {
        const rest = this.makeRest(token);
        const result: RemoveResult = { deleted: 0, failed: [] };

        for (const { scope, commands } of selected) {
            for (const command of commands) {
                try {
                    await rest.delete(commandRoute(appId, scope, command.id));
                    result.deleted++;
                } catch (error: unknown) {
                    result.failed.push({ scope, command, reason: asError(error).message });
                }
            }
        }
        return result;
    }

    // discord replaces every command in a scope with the PUT body
    public async clearScopes(
        token: string,
        appId: Snowflake,
        selected: readonly ScopedCommands[]
    ): Promise<RemoveResult> {
        const rest = this.makeRest(token);
        const result: RemoveResult = { deleted: 0, failed: [] };

        for (const { scope, commands } of selected) {
            try {
                await rest.put(commandsRoute(appId, scope), { body: [] });
                result.deleted += commands.length;
            } catch (error: unknown) {
                result.failed.push({ scope, reason: asError(error).message });
            }
        }
        return result;
    }

    private async guildsOf(rest: RestClient, targets: GuildTargets): Promise<GuildSummary[]> {
        if (targets.kind === 'all') return readBotGuilds(rest);
        return targets.kind === 'named' ? [...targets.guilds] : [];
    }

    private async read(rest: RestClient, appId: Snowflake, scope: Scope): Promise<DeployedCommand[]> {
        // justified: the discord api contract for both command list routes
        const deployed = (await rest.get(commandsRoute(appId, scope))) as RESTGetAPIApplicationCommandsResult;
        return deployed.map(({ id, name, type }) => ({ id, name, type }));
    }
}
