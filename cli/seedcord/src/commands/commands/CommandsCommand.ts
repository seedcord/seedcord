import { isSeedcordError, paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, validateDiscordToken } from '@seedcord/errors/internal';
import { Envapter } from 'envapt';

import { BaseCommand } from '#core/BaseCommand';
import { isInteractive } from '#core/interactive';
import { quietSteps } from '#core/output/quietSteps';
import { Prompter } from '#core/prompts/Prompter';
import { isVerbose } from '#core/verbose';

import { CleanPresenter } from './clean/CleanPresenter';
import { CleanRunner } from './clean/CleanRunner';
import { CLEAN_STEP_LABELS } from './clean/cleanSteps';
import { CleanWizard, WIZARD_STEPS } from './clean/CleanWizard';
import { executeClean } from './clean/executeClean';
import { PROCEED } from './confirm';
import { DeployPresenter } from './deploy/DeployPresenter';
import { DEPLOY_STEPS, DeployRunner } from './deploy/DeployRunner';
import { listingJson } from './list/listingJson';
import { ListPresenter } from './list/ListPresenter';
import { LIST_STEPS, ListRunner } from './list/ListRunner';

import type { StepPrinter } from '#core/output/StepPrinter';
import type { Confirm } from './confirm';
import type { DeployStep } from './deploy/DeployRunner';
import type { ListScope, ListStep } from './list/ListRunner';
import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

interface CommandsDeps {
    cleanRunner: CleanRunner;
    deployRunner: DeployRunner;
    prompter: Prompter;
}

interface CleanInvocation {
    guild: string[];
    allGuilds: boolean;
    yes: boolean;
    purge: boolean;
}

type WizardStep = (typeof WIZARD_STEPS)[number];
type MenuAction = 'deploy' | 'list' | 'clean';

const MENU_STEPS = [...DEPLOY_STEPS, ...WIZARD_STEPS] as const;

function hasCleanFlags(options: CleanInvocation): boolean {
    return [options.allGuilds, options.yes, options.purge].some(Boolean) || options.guild.length > 0;
}

const NEEDS_YES: Confirm = () => Promise.reject(new SeedcordError(SeedcordErrorCode.CliDeployNeedsYes));

function readToken(): string {
    return validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'));
}

export class CommandsCommand extends BaseCommand {
    private readonly cleanRunner: CleanRunner;
    private readonly deployRunner: DeployRunner;
    private readonly prompter: Prompter;

    constructor({
        cleanRunner = CleanRunner.create(),
        deployRunner = DeployRunner.create(),
        prompter = new Prompter()
    }: Partial<CommandsDeps> = {}) {
        super('commands', 'Manage the commands registered on Discord');
        this.cleanRunner = cleanRunner;
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
            .option('--guild <ids...>', 'Also list these guilds')
            .option('--all-guilds', 'Also list every guild the bot is in')
            .option('--json', 'Print the listing as JSON for scripts')
            .action((options, command) => {
                const scope = { guildIds: options.guild ?? [], allGuilds: options.allGuilds ?? false };
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
            .option('--guild <ids...>', 'Guild ids to inspect')
            .option('--all-guilds', 'Scan every guild the bot is in (overlaps only, cannot combine with --purge)')
            .option('--yes', 'Delete the reported commands without asking')
            .option('--purge', 'Select every command in the named guilds, not only global overlaps')
            .action((options, command) =>
                this.clean(
                    {
                        guild: options.guild ?? [],
                        allGuilds: options.allGuilds ?? false,
                        yes: options.yes ?? false,
                        purge: options.purge ?? false
                    },
                    command
                )
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
                clean: () => this.cleanWizard(printer)
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
                    { value: 'clean', label: 'Remove guild commands that duplicate a global command' }
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

    private cleanWizard(printer: StepPrinter<WizardStep>): Promise<void> {
        return new CleanWizard(this.cleanRunner, readToken(), printer, this.prompter).run();
    }

    private async clean(options: CleanInvocation, command: CommandUnknownOpts): Promise<void> {
        if (!hasCleanFlags(options) && isInteractive()) {
            await this.runSteps(command, WIZARD_STEPS, (printer) => this.cleanWizard(printer));
            return;
        }

        await this.runSteps(command, CLEAN_STEP_LABELS, (printer) =>
            executeClean({
                runner: this.cleanRunner,
                scope: { guildIds: options.guild, allGuilds: options.allGuilds, purge: options.purge },
                apply: options.yes,
                token: readToken(),
                presenter: new CleanPresenter(printer, PROCEED)
            })
        );
    }
}
