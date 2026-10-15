import { validateDiscordToken } from '@seedcord/errors/internal';
import { Envapter } from 'envapt';

import { BaseCommand } from '#core/BaseCommand';
import { isInteractive } from '#core/interactive';
import { Prompter } from '#core/prompts/Prompter';

import { CleanPresenter } from './CleanPresenter';
import { CleanRunner } from './CleanRunner';
import { CLEAN_STEP_LABELS } from './cleanSteps';
import { CleanWizard, WIZARD_STEPS } from './CleanWizard';
import { executeClean } from './executeClean';

import type { Confirm } from './CleanPresenter';
import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

interface CleanInvocation {
    guild: string[];
    allGuilds: boolean;
    apply: boolean;
    purge: boolean;
}

function hasCleanFlags(options: CleanInvocation): boolean {
    return [options.allGuilds, options.apply, options.purge].some(Boolean) || options.guild.length > 0;
}

// in flag mode --all-guilds and --apply are the go-ahead
const PROCEED: Confirm = () => Promise.resolve(true);

function readToken(): string {
    return validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'));
}

export class CommandsCommand extends BaseCommand {
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
            .action((options, command) =>
                this.clean(
                    {
                        guild: options.guild ?? [],
                        allGuilds: options.allGuilds ?? false,
                        apply: options.apply ?? false,
                        purge: options.purge ?? false
                    },
                    command
                )
            );
    }

    private async openWizard(command: CommandUnknownOpts): Promise<void> {
        if (!isInteractive()) {
            command.outputHelp();
            return;
        }
        await this.runCleanWizard(command);
    }

    private async clean(options: CleanInvocation, command: CommandUnknownOpts): Promise<void> {
        if (!hasCleanFlags(options) && isInteractive()) {
            await this.runCleanWizard(command);
            return;
        }

        await this.runSteps(command, CLEAN_STEP_LABELS, (printer) =>
            executeClean({
                runner: this.cleanRunner,
                scope: { guildIds: options.guild, allGuilds: options.allGuilds, purge: options.purge },
                apply: options.apply,
                token: readToken(),
                presenter: new CleanPresenter(printer, PROCEED)
            })
        );
    }

    private async runCleanWizard(command: CommandUnknownOpts): Promise<void> {
        await this.runSteps(command, WIZARD_STEPS, (printer) =>
            new CleanWizard(this.cleanRunner, readToken(), printer, new Prompter()).run()
        );
    }
}
