import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { validateDiscordToken } from '@seedcord/errors/internal';
import { Envapter } from 'envapt';

import { BaseCommand } from '@core/BaseCommand';
import { isInteractive } from '@core/interactive';

import { CleanRunner } from './CleanRunner';
import { runCleanFromFlags } from './flagClean';
import { runCleanWizard } from './wizard';

import type { Command } from '@commander-js/extra-typings';

export interface CleanInvocation {
    clean: boolean;
    guild: string[];
    allGuilds: boolean;
    apply: boolean;
    purge: boolean;
    yes: boolean;
}

export function hasCleanFlags(options: CleanInvocation): boolean {
    return [options.clean, options.allGuilds, options.apply, options.purge].some(Boolean) || options.guild.length > 0;
}

export class CommandsCommand extends BaseCommand {
    private readonly cleanRunner: CleanRunner;

    constructor() {
        super('commands', 'Inspect and clean deployed guild commands', 'Commands');
        this.cleanRunner = CleanRunner.create();
    }

    public register(program: Command): void {
        program
            .command(this.name)
            .description(this.description)
            .option('--clean', 'Report guild commands that duplicate a global command (deletes only with --apply)')
            .option('--guild <ids...>', 'Guild ids to inspect')
            .option('--all-guilds', 'Scan every guild the bot is in (overlaps only, cannot combine with --purge)')
            .option('--apply', 'Delete the reported commands instead of running a dry run')
            .option('--purge', 'Select every command in the named guilds, not only global overlaps')
            .option('--yes', 'Skip prompts and the typed-count confirm (for scripts and CI)')
            .action(async (options) =>
                this.run({
                    clean: options.clean ?? false,
                    guild: options.guild ?? [],
                    allGuilds: options.allGuilds ?? false,
                    apply: options.apply ?? false,
                    purge: options.purge ?? false,
                    yes: options.yes ?? false
                })
            );
    }

    private async run(options: CleanInvocation): Promise<void> {
        try {
            await this.dispatch(options);
        } catch (error: unknown) {
            // a cancelled prompt is a clean abort, not a failure
            if (isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CliCancelled)) return;

            this.logger.error('seedcord commands failed', error);
            if (isSeedcordError(error)) process.exitCode = 1;
            else process.exit(1);
        }
    }

    private async dispatch(options: CleanInvocation): Promise<void> {
        const flags = hasCleanFlags(options);
        const interactive = isInteractive(options, flags);

        if (!interactive && !flags) {
            this.logger.info('Nothing to do. Pass --clean to inspect deployed commands.');
            return;
        }

        const token = validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'));

        if (interactive) {
            await runCleanWizard(this.cleanRunner, token);
            return;
        }

        await runCleanFromFlags(
            this.cleanRunner,
            {
                guildIds: options.guild,
                allGuilds: options.allGuilds,
                apply: options.apply,
                purge: options.purge,
                yes: options.yes
            },
            token,
            this.logger
        );
    }
}
