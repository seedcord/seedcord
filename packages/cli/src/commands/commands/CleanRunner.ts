import { REST } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import chalk from 'chalk';
import { Routes } from 'discord-api-types/v10';

import { classifyGuildCommands } from './classify';
import { confirmCount } from './confirm';

import type { Flagged, GuildCommands } from './classify';
import type { ILogger } from '@seedcord/types';
import type {
    RESTGetAPIApplicationCommandsResult,
    RESTGetAPIApplicationGuildCommandsResult,
    RESTGetAPICurrentUserGuildsResult,
    RESTGetCurrentApplicationResult,
    Snowflake
} from 'discord-api-types/v10';

// narrowed so tests can inject a fake
type RestClient = Pick<REST, 'get' | 'delete'>;

export interface CleanOptions {
    guildIds: string[];
    allGuilds: boolean;
    apply: boolean;
    purge: boolean;
}

const GUILD_PAGE = 200;

/**
 * Reports, and on `--apply` deletes, stale or overlapping GUILD application commands. It reads the live
 * deployed state through a bare REST client (no gateway login) and never touches global commands.
 */
export class CleanRunner {
    constructor(
        private readonly logger: ILogger,
        private readonly makeRest: (token: string) => RestClient,
        private readonly confirm: (count: number, logger: ILogger) => Promise<boolean>
    ) {}

    public static create(logger: ILogger): CleanRunner {
        return new CleanRunner(logger, (token) => new REST({ version: '10' }).setToken(token), confirmCount);
    }

    public async run(options: CleanOptions, token: string | undefined): Promise<void> {
        if (!token) throw new SeedcordError(SeedcordErrorCode.CliCleanTokenMissing);

        // a full purge across every guild would wipe them all, so purge stays per-named-guild
        if (options.purge && options.allGuilds) {
            this.logger.warn(
                '--purge cannot be combined with --all-guilds. Use --guild <ids> to purge specific guilds.'
            );
            return;
        }

        // warn-and-return here would exit 0 and hide the misuse from CI
        if (!options.allGuilds && options.guildIds.length === 0) {
            throw new SeedcordError(SeedcordErrorCode.CliCleanNoGuilds);
        }

        const rest = this.makeRest(token);
        const appId = await this.resolveAppId(rest);

        const guildIds = options.allGuilds ? await this.fetchBotGuildIds(rest) : options.guildIds;
        if (guildIds.length === 0) {
            this.logger.warn('The bot is in no guilds, nothing to scan.');
            return;
        }

        const globalNames = await this.fetchGlobalNames(rest, appId);
        const guilds = await this.fetchGuildCommands(rest, appId, guildIds);

        const flagged = classifyGuildCommands(globalNames, guilds, options.purge);
        this.report(flagged);
        if (flagged.length === 0) return;

        await this.confirmAndDelete(rest, appId, flagged, options.apply);
    }

    private async confirmAndDelete(
        rest: RestClient,
        appId: Snowflake,
        flagged: Flagged[],
        apply: boolean
    ): Promise<void> {
        if (!apply) {
            this.logger.info(chalk.italic('Dry run. Re-run with --apply to delete the above.'));
            return;
        }

        const confirmed = await this.confirm(flagged.length, this.logger);
        if (!confirmed) {
            this.logger.info('Count did not match. Nothing deleted.');
            return;
        }

        await this.deleteFlagged(rest, appId, flagged);
    }

    private async resolveAppId(rest: RestClient): Promise<Snowflake> {
        try {
            const app = (await rest.get(Routes.currentApplication())) as RESTGetCurrentApplicationResult;
            return app.id;
        } catch (error: unknown) {
            const reason = error instanceof Error ? error.message : 'Unknown error';
            throw new SeedcordError(SeedcordErrorCode.CliCleanAppFetchFailed, [reason]);
        }
    }

    private async fetchBotGuildIds(rest: RestClient): Promise<string[]> {
        const ids: string[] = [];
        let after: string | undefined;

        for (;;) {
            const query = new URLSearchParams({ limit: String(GUILD_PAGE) });
            if (after) query.set('after', after);

            const page = (await rest.get(Routes.userGuilds(), { query })) as RESTGetAPICurrentUserGuildsResult;
            for (const guild of page) ids.push(guild.id);

            after = page.at(-1)?.id;
            if (page.length < GUILD_PAGE || !after) break;
        }

        this.logger.info(`Scanning ${ids.length} guild(s) the bot is in.`);
        return ids;
    }

    private async fetchGlobalNames(rest: RestClient, appId: Snowflake): Promise<Set<string>> {
        const global = (await rest.get(Routes.applicationCommands(appId))) as RESTGetAPIApplicationCommandsResult;
        return new Set(global.map((command) => command.name));
    }

    private async fetchGuildCommands(rest: RestClient, appId: Snowflake, guildIds: string[]): Promise<GuildCommands[]> {
        const buckets: GuildCommands[] = [];
        for (const guildId of guildIds) {
            try {
                const deployed = (await rest.get(
                    Routes.applicationGuildCommands(appId, guildId)
                )) as RESTGetAPIApplicationGuildCommandsResult;
                buckets.push({
                    guildId,
                    commands: deployed.map((command) => ({ id: command.id, name: command.name }))
                });
            } catch (error: unknown) {
                const reason = error instanceof Error ? error.message : 'Unknown error';
                this.logger.warn(`Skipping guild ${guildId}. ${reason}.`);
            }
        }
        return buckets;
    }

    private report(flagged: Flagged[]): void {
        if (flagged.length === 0) {
            this.logger.info(chalk.green('No commands to clean in the scanned guilds.'));
            return;
        }

        this.logger.info(chalk.bold(`${flagged.length} guild command(s) selected for deletion`));
        for (const command of flagged) {
            this.logger.info(
                `  ${chalk.yellow(command.reason)} ${chalk.cyan(command.name)} (${command.id}) in guild ${command.guildId}`
            );
        }
    }

    private async deleteFlagged(rest: RestClient, appId: Snowflake, flagged: Flagged[]): Promise<void> {
        let deleted = 0;
        for (const command of flagged) {
            try {
                await rest.delete(Routes.applicationGuildCommand(appId, command.guildId, command.id));
                deleted++;
            } catch (error: unknown) {
                const reason = error instanceof Error ? error.message : 'Unknown error';
                this.logger.warn(
                    `Failed to delete ${command.name} (${command.id}) in guild ${command.guildId}. ${reason}.`
                );
            }
        }
        this.logger.info(
            chalk.green(`Deleted ${deleted} of ${flagged.length} guild command(s). Global commands untouched.`)
        );
    }
}
