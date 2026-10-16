import { Option } from '@commander-js/extra-typings';
import { isSeedcordError, paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, validateDiscordToken } from '@seedcord/errors/internal';
import { Envapter } from 'envapt';

import { BaseCommand } from '#core/BaseCommand';
import { isInteractive } from '#core/interactive';
import { quietSteps } from '#core/output/quietSteps';
import { Prompter } from '#core/prompts/Prompter';
import { isVerbose } from '#core/verbose';

import { askClean, CleanMode } from './clean/CleanMode';
import { PROCEED } from './confirm';
import { DeployPresenter } from './deploy/DeployPresenter';
import { DEPLOY_STEPS, DeployRunner } from './deploy/DeployRunner';
import { listingJson } from './list/listingJson';
import { ListPresenter } from './list/ListPresenter';
import { LIST_STEPS, ListRunner } from './list/ListRunner';
import { askPurge, PurgeMode } from './purge/PurgeMode';
import { executeRemove } from './remove/executeRemove';
import { RemovePresenter } from './remove/RemovePresenter';
import { RemoveRunner } from './remove/RemoveRunner';
import { REMOVE_STEPS } from './remove/removeSteps';
import { RemoveWizard, WIZARD_STEPS } from './remove/RemoveWizard';
import { guildTargetsOf } from './remove/scope';

import type { StepPrinter } from '#core/output/StepPrinter';
import type { Confirm } from './confirm';
import type { DeployStep } from './deploy/DeployRunner';
import type { ListScope, ListStep } from './list/ListRunner';
import type { RemoveMode } from './remove/RemoveMode';
import type { WizardQuestions } from './remove/RemoveWizard';
import type { GuildFlags } from './remove/scope';
import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

interface CommandsDeps {
    removeRunner: RemoveRunner;
    deployRunner: DeployRunner;
    prompter: Prompter;
}

interface RemoveFlags extends GuildFlags {
    readonly global?: boolean | undefined;
    readonly yes?: boolean | undefined;
}

interface RemoveCommand {
    readonly flags: RemoveFlags;
    readonly mode: RemoveMode;
    readonly questions: WizardQuestions;
}

type WizardStep = (typeof WIZARD_STEPS)[number];
type MenuAction = 'deploy' | 'list' | 'clean' | 'purge';

const MENU_STEPS = [...DEPLOY_STEPS, ...WIZARD_STEPS] as const;

const NEEDS_YES: Confirm = () => Promise.reject(new SeedcordError(SeedcordErrorCode.CliDeployNeedsYes));

function readToken(): string {
    return validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'));
}

function hasFlags(flags: RemoveFlags): boolean {
    return Object.values(flags).some((value) => value !== undefined);
}

function allGuildsOption(description: string): Option<'--all-guilds'> {
    return new Option('--all-guilds', description).conflicts('guilds');
}

export class CommandsCommand extends BaseCommand {
    private readonly removeRunner: RemoveRunner;
    private readonly deployRunner: DeployRunner;
    private readonly prompter: Prompter;

    constructor({
        removeRunner = RemoveRunner.create(),
        deployRunner = DeployRunner.create(),
        prompter = new Prompter()
    }: Partial<CommandsDeps> = {}) {
        super('commands', 'Manage the commands registered on Discord');
        this.removeRunner = removeRunner;
        this.deployRunner = deployRunner;
        this.prompter = prompter;
    }

    public register(program: Command): void {
        const commands = program
            .command(this.name)
            .description(this.description)
            .action((_options, command) => this.openMenu(command));

        commands
            .command('deploy')
            .description('Deploy the commands in your code to Discord')
            .option('--yes', 'Deploy without asking first')
            .action((options, command) =>
                this.runSteps(command, DEPLOY_STEPS, (printer) => this.deploy(printer, command, options.yes))
            );

        commands
            .command('list')
            .description('List the commands Discord has for your bot')
            .option('--guilds <ids...>', 'Also list these guilds')
            .addOption(allGuildsOption('Also list every guild the bot is in'))
            .option('--json', 'Print the listing as JSON for scripts')
            .action((options, command) => {
                const scope = { guildIds: options.guilds ?? [], allGuilds: options.allGuilds ?? false };
                if (options.json) {
                    return this.runJson(command, async () =>
                        listingJson(await ListRunner.create().read(quietSteps, scope))
                    );
                }
                return this.runSteps(command, LIST_STEPS, (printer) => this.list(printer, command, scope));
            });

        commands
            .command('clean')
            .description('Delete guild commands that duplicate a global command')
            .option('--guilds <ids...>', 'Guild ids to scan')
            .addOption(allGuildsOption('Scan every guild the bot is in'))
            .option('--yes', 'Delete the duplicates without asking')
            .action((flags, command) => this.remove(command, { flags, mode: new CleanMode(), questions: askClean }));

        commands
            .command('purge')
            .description('Delete every command globally or in guilds')
            .option('--global', 'Delete every global command')
            .option('--guilds <ids...>', 'Delete every command in these guilds')
            .addOption(allGuildsOption('Delete every command in every guild the bot is in'))
            .option('--yes', 'Delete the commands without asking')
            .action((flags, command) =>
                this.remove(command, { flags, mode: new PurgeMode(flags.global ?? false), questions: askPurge })
            );
    }

    private async openMenu(command: CommandUnknownOpts): Promise<void> {
        if (!isInteractive()) {
            command.outputHelp();
            return;
        }

        await this.runSteps(command, MENU_STEPS, async (printer) => {
            const actions: Record<MenuAction, () => Promise<void>> = {
                deploy: () => this.deploy(printer, command),
                list: () => this.list(printer, command),
                clean: () => this.wizard(printer, command).run(askClean),
                purge: () => this.wizard(printer, command).run(askPurge)
            };
            const action = await this.pickAction(printer);
            if (action) await actions[action]();
        });
    }

    private async pickAction(printer: StepPrinter<string>): Promise<MenuAction | undefined> {
        try {
            return await this.prompter.select<MenuAction>({
                message: 'What do you want to do?',
                choices: [
                    { value: 'deploy', label: 'Deploy the commands in your code' },
                    { value: 'list', label: 'List the commands Discord has' },
                    { value: 'clean', label: 'Remove guild commands that duplicate a global command' },
                    { value: 'purge', label: 'Delete every command globally or in guilds' }
                ]
            });
        } catch (error: unknown) {
            if (!isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CliCancelled)) throw error;
            printer.line(paint.mute('cancelled'));
            return undefined;
        }
    }

    private deploy(printer: StepPrinter<DeployStep>, command: CommandUnknownOpts, yes = false): Promise<void> {
        return this.deployRunner.run(new DeployPresenter(printer, this.deployConfirm(yes), isVerbose(command)));
    }

    private deployConfirm(yes: boolean): Confirm {
        if (yes) return PROCEED;
        return isInteractive() ? (message) => this.prompter.confirm({ message }) : NEEDS_YES;
    }

    private async list(printer: StepPrinter<ListStep>, command: CommandUnknownOpts, scope?: ListScope): Promise<void> {
        const listing = await ListRunner.create().read(printer, scope);
        new ListPresenter(printer, isVerbose(command)).list(listing);
    }

    private wizard(printer: StepPrinter<WizardStep>, command: CommandUnknownOpts): RemoveWizard {
        return new RemoveWizard(this.removeRunner, readToken(), printer, this.prompter, isVerbose(command));
    }

    private remove(command: CommandUnknownOpts, { flags, mode, questions }: RemoveCommand): Promise<void> {
        if (!hasFlags(flags) && isInteractive()) {
            return this.runSteps(command, WIZARD_STEPS, (printer) => this.wizard(printer, command).run(questions));
        }

        return this.runSteps(command, REMOVE_STEPS, (printer) =>
            executeRemove({
                ops: this.removeRunner,
                mode,
                guilds: guildTargetsOf(flags),
                apply: flags.yes ?? false,
                token: readToken(),
                presenter: new RemovePresenter(printer, PROCEED, isVerbose(command))
            })
        );
    }
}
