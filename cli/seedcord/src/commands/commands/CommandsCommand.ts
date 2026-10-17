import { Option } from '@commander-js/extra-typings';
import { Prompter, unlessCancelled } from '@seedcord/cli-prompts';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { BaseCommand } from '#core/BaseCommand';
import { isInteractive } from '#core/interactive';
import { stderrSteps } from '#core/output/stderrSteps';
import { isVerbose } from '#core/verbose';

import { askClean, CleanMode } from './clean/CleanMode';
import { PROCEED } from './confirm';
import { DeployPresenter } from './deploy/DeployPresenter';
import { DEPLOY_STEPS, DeployRunner } from './deploy/DeployRunner';
import { listingJson } from './list/listingJson';
import { ListPresenter } from './list/ListPresenter';
import { LIST_STEPS, ListRunner } from './list/ListRunner';
import { askPurge, PurgeMode } from './purge/PurgeMode';
import { RemovePresenter } from './remove/RemovePresenter';
import { RemoveRunner } from './remove/RemoveRunner';
import { REMOVE_STEPS } from './remove/removeSteps';
import { RemoveWizard, WIZARD_STEPS } from './remove/RemoveWizard';
import { guildTargetsOf } from './scope';

import type { StepPrinter } from '#core/output/StepPrinter';
import type { Confirm } from './confirm';
import type { DeployOptions, DeployStep } from './deploy/DeployRunner';
import type { ListScope, ListStep } from './list/ListRunner';
import type { RemoveMode } from './remove/RemoveMode';
import type { WizardQuestions } from './remove/RemoveWizard';
import type { GuildFlags } from './scope';
import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

interface CommandsDeps {
    deployRunner: DeployRunner;
    listRunner: ListRunner;
    removeRunner: RemoveRunner;
    prompter: Prompter;
}

type RemoveFlags = GuildFlags & { readonly yes?: boolean | undefined };

type WizardStep = (typeof WIZARD_STEPS)[number];
type MenuAction = 'deploy' | 'list' | 'clean' | 'purge';

const MENU_STEPS = [...DEPLOY_STEPS, ...WIZARD_STEPS] as const;

function hasFlags(flags: object): boolean {
    return Object.values(flags).some((value) => value !== undefined);
}

function allGuildsOption(description: string): Option<'--all-guilds'> {
    return new Option('--all-guilds', description).conflicts('guilds');
}

export class CommandsCommand extends BaseCommand {
    private readonly deployRunner: DeployRunner;
    private readonly listRunner: ListRunner;
    private readonly removeRunner: RemoveRunner;
    private readonly prompter: Prompter;

    constructor({
        deployRunner = DeployRunner.create(),
        listRunner = ListRunner.create(),
        removeRunner = RemoveRunner.create(),
        prompter = new Prompter()
    }: Partial<CommandsDeps> = {}) {
        super('commands', 'Manage the commands registered on Discord');
        this.deployRunner = deployRunner;
        this.listRunner = listRunner;
        this.removeRunner = removeRunner;
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
            .option('--force', 'Also deploy the scopes that match the last deploy')
            .action((options, command) =>
                this.runSteps(command, DEPLOY_STEPS, (printer) => this.deploy(printer, command, options))
            );

        commands
            .command('list')
            .description('List the commands Discord has for your bot')
            .option('--guilds <ids...>', 'Also list these guilds')
            .addOption(allGuildsOption('Also list every guild the bot is in'))
            .option('--json', 'Print the listing as JSON for scripts')
            .action((options, command) => {
                const scope = { guildIds: options.guilds ?? [], allGuilds: options.allGuilds ?? false };
                if (options.json) return this.runJson(command, () => this.listJson(scope));
                return this.runSteps(command, LIST_STEPS, (printer) => this.list(printer, command, scope));
            });

        commands
            .command('clean')
            .description('Delete guild commands that duplicate a global command')
            .option('--guilds <ids...>', 'Guild ids to scan')
            .addOption(allGuildsOption('Scan every guild the bot is in'))
            .option('--yes', 'Delete the duplicates without asking')
            .action((flags, command) => this.remove(command, flags, new CleanMode(), askClean));

        commands
            .command('purge')
            .description('Delete every command globally or in guilds')
            .option('--global', 'Delete every global command')
            .option('--guilds <ids...>', 'Delete every command in these guilds')
            .addOption(allGuildsOption('Delete every command in every guild the bot is in'))
            .option('--yes', 'Delete the commands without asking')
            .action((flags, command) => this.remove(command, flags, new PurgeMode(flags.global ?? false), askPurge));
    }

    private async openMenu(command: CommandUnknownOpts): Promise<void> {
        if (!isInteractive()) {
            command.outputHelp();
            return;
        }

        await this.runSteps(command, MENU_STEPS, async (printer) => {
            const actions: Record<MenuAction, () => Promise<void>> = {
                deploy: () => this.deploy(printer, command, {}),
                list: () => this.list(printer, command),
                clean: () => this.wizard(printer, command).run(askClean),
                purge: () => this.wizard(printer, command).run(askPurge)
            };
            const action = await unlessCancelled(printer, () => this.pickAction());
            if (action) await actions[action]();
        });
    }

    private pickAction(): Promise<MenuAction> {
        return this.prompter.select<MenuAction>({
            message: 'What do you want to do?',
            choices: [
                { value: 'deploy', label: 'Deploy the commands in your code' },
                { value: 'list', label: 'List the commands Discord has' },
                { value: 'clean', label: 'Delete guild commands that duplicate a global command' },
                { value: 'purge', label: 'Delete every command globally or in guilds' }
            ]
        });
    }

    private async deploy(
        printer: StepPrinter<DeployStep>,
        command: CommandUnknownOpts,
        { yes = false, force = false }: DeployOptions
    ): Promise<void> {
        if (!yes && !isInteractive()) throw new SeedcordTypeError(SeedcordErrorCode.CliDeployNeedsYes);
        const confirm: Confirm = yes ? PROCEED : (message) => this.prompter.confirm({ message });
        await this.deployRunner.run(new DeployPresenter(printer, confirm, isVerbose(command)), { force, yes });
    }

    private list(printer: StepPrinter<ListStep>, command: CommandUnknownOpts, scope?: ListScope): Promise<void> {
        return this.listRunner.run(new ListPresenter(printer, isVerbose(command)), scope);
    }

    private async listJson(scope: ListScope): Promise<ReturnType<typeof listingJson>> {
        return listingJson(await this.listRunner.read(stderrSteps(), scope));
    }

    private wizard(printer: StepPrinter<WizardStep>, command: CommandUnknownOpts): RemoveWizard {
        return new RemoveWizard(this.removeRunner, printer, this.prompter, isVerbose(command));
    }

    private remove(
        command: CommandUnknownOpts,
        flags: RemoveFlags,
        mode: RemoveMode,
        questions: WizardQuestions
    ): Promise<void> {
        if (!hasFlags(flags) && isInteractive()) {
            return this.runSteps(command, WIZARD_STEPS, (printer) => this.wizard(printer, command).run(questions));
        }

        return this.runSteps(command, REMOVE_STEPS, (printer) =>
            this.removeRunner.run(new RemovePresenter(printer, PROCEED, isVerbose(command)), {
                mode,
                guilds: guildTargetsOf(flags),
                apply: flags.yes ?? false
            })
        );
    }
}
