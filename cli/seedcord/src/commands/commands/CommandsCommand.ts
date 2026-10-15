import { isSeedcordError } from '@seedcord/errors';
import { validateDiscordToken, WORDMARK } from '@seedcord/errors/internal';
import { Envapter } from 'envapt';

import { BaseCommand } from '#core/BaseCommand';
import { cliLogger } from '#core/cliLogger';
import { isInteractive } from '#core/interactive';
import { Prompter } from '#core/prompts/Prompter';

import { CleanRunner } from './CleanRunner';
import { CleanWizard, WIZARD_STEPS } from './CleanWizard';
import { runCleanFromFlags } from './flagClean';

import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

export interface CleanInvocation {
    guild: string[];
    allGuilds: boolean;
    apply: boolean;
    purge: boolean;
    yes: boolean;
}

export function hasCleanFlags(options: CleanInvocation): boolean {
    return [options.allGuilds, options.apply, options.purge].some(Boolean) || options.guild.length > 0;
}

function readToken(): string {
    return validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'));
}

export class CommandsCommand extends BaseCommand {
    private readonly logger = cliLogger('Commands');

    constructor(private readonly cleanRunner: CleanRunner = CleanRunner.create()) {
        super('commands', 'Manage the commands registered on Discord');
    }

    public register(program: Command): void {
        const commands = program
            .command(this.name)
            .description(this.description)
            .action((_options, command) => this.openWizard(command));

        commands
            .command('clean')
            .description('Delete guild commands that duplicate a global command')
            .option('--guild <ids...>', 'Guild ids to inspect')
            .option('--all-guilds', 'Scan every guild the bot is in (overlaps only, cannot combine with --purge)')
            .option('--apply', 'Delete the reported commands instead of running a dry run')
            .option('--purge', 'Select every command in the named guilds, not only global overlaps')
            .option('--yes', 'Skip prompts and the typed-count confirm (for scripts and CI)')
            .action((options, command) =>
                this.clean(
                    {
                        guild: options.guild ?? [],
                        allGuilds: options.allGuilds ?? false,
                        apply: options.apply ?? false,
                        purge: options.purge ?? false,
                        yes: options.yes ?? false
                    },
                    command
                )
            );
    }

    private async openWizard(command: CommandUnknownOpts): Promise<void> {
        if (!isInteractive({}, false)) {
            command.outputHelp();
            return;
        }
        await this.runCleanWizard(command);
    }

    private async clean(options: CleanInvocation, command: CommandUnknownOpts): Promise<void> {
        if (isInteractive(options, hasCleanFlags(options))) {
            await this.runCleanWizard(command);
            return;
        }

        try {
            await runCleanFromFlags(
                this.cleanRunner,
                {
                    guildIds: options.guild,
                    allGuilds: options.allGuilds,
                    apply: options.apply,
                    purge: options.purge,
                    yes: options.yes
                },
                readToken(),
                this.logger
            );
        } catch (error: unknown) {
            this.logger.error(`${WORDMARK} commands failed`, error);
            if (isSeedcordError(error)) process.exitCode = 1;
            else process.exit(1);
        }
    }

    private async runCleanWizard(command: CommandUnknownOpts): Promise<void> {
        await this.runSteps(command, WIZARD_STEPS, (printer) =>
            new CleanWizard(this.cleanRunner, readToken(), printer, new Prompter()).run()
        );
    }
}
