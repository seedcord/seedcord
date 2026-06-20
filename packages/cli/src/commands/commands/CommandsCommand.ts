import { isSeedcordError } from '@seedcord/errors';
import { Envapter } from 'envapt';

import { BaseCommand } from '@core/BaseCommand';

import { CleanRunner } from './CleanRunner';

import type { Command } from '@commander-js/extra-typings';

export class CommandsCommand extends BaseCommand {
    private readonly cleanRunner: CleanRunner;

    constructor() {
        super('commands', 'Inspect and clean deployed application commands', 'CLI:Commands');
        this.cleanRunner = CleanRunner.create(this.logger);
    }

    public register(program: Command): void {
        program
            .command(this.name)
            .description(this.description)
            .option('--clean', 'Report stale or overlapping guild commands (deletes only with --apply)')
            .option('--guild <ids...>', 'Guild ids to inspect')
            .option('--all-guilds', 'Scan every guild the bot is in (overlaps only, cannot combine with --purge)')
            .option('--apply', 'Delete the reported commands instead of running a dry run')
            .option('--purge', 'Select every command in the named guilds, not only global overlaps')
            .action(async (options) => {
                if (!options.clean) {
                    this.logger.info('Nothing to do. Pass --clean to inspect deployed commands.');
                    return;
                }

                try {
                    await this.cleanRunner.run(
                        {
                            guildIds: options.guild ?? [],
                            allGuilds: options.allGuilds ?? false,
                            apply: options.apply ?? false,
                            purge: options.purge ?? false
                        },
                        Envapter.get('DISCORD_BOT_TOKEN')
                    );
                } catch (error: unknown) {
                    this.logger.error('seedcord commands --clean failed', error);
                    if (isSeedcordError(error)) process.exitCode = 1;
                    else process.exit(1);
                }
            });
    }
}
