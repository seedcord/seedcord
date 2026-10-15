import { REST } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Routes } from 'discord-api-types/v10';

import { applicationOf } from '#core/discord/applicationOf';
import { readBotGuilds } from '#core/discord/readBotGuilds';
import { readDeployed } from '#core/discord/readDeployed';

import { classifyGuildCommands } from './classify';

import type { GuildSummary } from '#core/discord/readBotGuilds';
import type { Flagged, GuildCommands } from './classify';
import type { RESTGetAPIApplicationGuildCommandsResult, Snowflake } from 'discord-api-types/v10';

type RestClient = Pick<REST, 'get' | 'delete'>;

export interface CleanScope {
    guildIds: string[];
    allGuilds: boolean;
    purge: boolean;
}

export interface ResolvedTargets {
    appId: Snowflake;
    guilds: GuildSummary[];
}

export interface SkippedGuild {
    guildId: string;
    guildName: string;
    reason: string;
}

export interface ScanResult {
    flagged: Flagged[];
    skipped: SkippedGuild[];
    scannedGuildCount: number;
    scannedCommandCount: number;
    globalCommandCount: number;
}

interface DeleteFailure {
    command: Flagged;
    reason: string;
}

export interface DeleteResult {
    deleted: number;
    failed: DeleteFailure[];
}

export interface CleanOps {
    resolveTargets(scope: CleanScope, token: string): Promise<ResolvedTargets>;
    scanGuilds(token: string, appId: Snowflake, guilds: GuildSummary[], purge: boolean): Promise<ScanResult>;
    applyDeletions(token: string, appId: Snowflake, flagged: Flagged[]): Promise<DeleteResult>;
}

export class CleanRunner implements CleanOps {
    constructor(private readonly makeRest: (token: string) => RestClient) {}

    public static create(): CleanRunner {
        return new CleanRunner((token) => new REST({ version: '10' }).setToken(token));
    }

    public async resolveTargets(scope: CleanScope, token: string): Promise<ResolvedTargets> {
        // purge across all guilds would wipe every command
        if (scope.purge && scope.allGuilds) throw new SeedcordError(SeedcordErrorCode.CliCleanPurgeAllGuilds);

        if (!scope.allGuilds && scope.guildIds.length === 0) {
            throw new SeedcordError(SeedcordErrorCode.CliCleanNoGuilds);
        }

        const rest = this.makeRest(token);
        const { id: appId } = await applicationOf(rest);
        const guilds = scope.allGuilds ? await readBotGuilds(rest) : scope.guildIds.map((id) => ({ id, name: id }));

        return { appId, guilds };
    }

    public async listBotGuilds(token: string): Promise<GuildSummary[]> {
        return readBotGuilds(this.makeRest(token));
    }

    public async scanGuilds(
        token: string,
        appId: Snowflake,
        guilds: GuildSummary[],
        purge: boolean
    ): Promise<ScanResult> {
        const rest = this.makeRest(token);
        const globalNames = await this.fetchGlobalNames(rest, appId);

        const buckets: GuildCommands[] = [];
        const skipped: SkippedGuild[] = [];
        let scannedCommandCount = 0;
        for (const guild of guilds) {
            try {
                const deployed = (await rest.get(
                    Routes.applicationGuildCommands(appId, guild.id)
                )) as RESTGetAPIApplicationGuildCommandsResult;
                const commands = deployed.map(({ id, name, type }) => ({ id, name, type }));
                scannedCommandCount += commands.length;
                buckets.push({ guildId: guild.id, guildName: guild.name, commands });
            } catch (error: unknown) {
                skipped.push({
                    guildId: guild.id,
                    guildName: guild.name,
                    reason: Error.isError(error) ? error.message : 'Unknown error'
                });
            }
        }

        return {
            flagged: classifyGuildCommands(globalNames, buckets, purge),
            skipped,
            scannedGuildCount: buckets.length,
            scannedCommandCount,
            globalCommandCount: globalNames.size
        };
    }

    public async applyDeletions(token: string, appId: Snowflake, flagged: Flagged[]): Promise<DeleteResult> {
        const rest = this.makeRest(token);
        let deleted = 0;
        const failed: DeleteFailure[] = [];

        for (const command of flagged) {
            try {
                await rest.delete(Routes.applicationGuildCommand(appId, command.guildId, command.id));
                deleted++;
            } catch (error: unknown) {
                failed.push({ command, reason: Error.isError(error) ? error.message : 'Unknown error' });
            }
        }

        return { deleted, failed };
    }

    private async fetchGlobalNames(rest: RestClient, appId: Snowflake): Promise<Set<string>> {
        const { global } = await readDeployed(rest, appId, []);
        return new Set([...global.values()].map((command) => command.name));
    }
}
