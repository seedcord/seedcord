import { Prompter, unlessCancelled } from '@seedcord/cli-prompts';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { isInteractive } from '@seedcord/utils/internal';

import { BaseCommand } from '#core/BaseCommand';
import { confirmOrYes, offerOrNo } from '#core/output/confirm';
import { stderrSteps } from '#core/output/stderrSteps';
import { isVerbose } from '#core/verbose';

import { ListPresenter } from './list/ListPresenter';
import { ListRunner } from './list/ListRunner';
import { PullPresenter } from './pull/PullPresenter';
import { PULL_STEPS, PullRunner } from './pull/PullRunner';
import { PushPresenter } from './push/PushPresenter';
import { PUSH_STEPS, PushRunner } from './push/PushRunner';
import { EMOJI_STEPS } from './readEmojis';
import { RemovePresenter } from './remove/RemovePresenter';
import { REMOVE_STEPS, RemoveRunner } from './remove/RemoveRunner';

import type { Confirm } from '#core/output/confirm';
import type { StepPrinter } from '#core/output/StepPrinter';
import type { ListOptions } from './list/ListRunner';
import type { EmojiPrompts } from './prompts';
import type { PullOptions, PullStep } from './pull/PullRunner';
import type { PushOptions, PushStep } from './push/PushRunner';
import type { EmojiStep } from './readEmojis';
import type { RemoveOptions, RemoveStep } from './remove/RemoveRunner';
import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

interface EmojisDeps {
    pushRunner: PushRunner;
    listRunner: ListRunner;
    removeRunner: RemoveRunner;
    pullRunner: PullRunner;
    prompter: Prompter;
}

interface Yes {
    readonly yes?: boolean | undefined;
}

const DESCRIPTIONS = {
    push: 'Upload the emojis Discord is missing from your folder',
    list: 'Compare your emojis folder with the emojis on Discord',
    pull: 'Download the emojis on Discord that your folder is missing',
    remove: 'Delete emojis from Discord'
} satisfies Record<string, string>;

// menu order. replace and guild aren't subcommands, they're `push --replace` and `pull --guild`
const MENU = ['push', 'replace', 'list', 'pull', 'guild', 'remove'] as const;
type MenuAction = (typeof MENU)[number];

const MENU_LABELS = {
    ...DESCRIPTIONS,
    replace: "Replace an emoji's image",
    guild: "Download a guild's emojis"
} satisfies Record<MenuAction, string>;

const MENU_STEPS = [...PUSH_STEPS, ...PULL_STEPS, ...REMOVE_STEPS] as const;

const ASKS = {
    push: { command: 'seedcord emojis push', action: 'uploads' },
    remove: { command: 'seedcord emojis remove', action: 'deletes' }
} satisfies Record<string, Omit<Parameters<typeof confirmOrYes>[1], 'yes'>>;

interface Picker {
    // the flag or command that opens the picker, like `--replace`
    opener: string;
    // what you'd pass to skip the picker
    needs: string;
    example: string;
    question: string;
}

const PICKERS = {
    replace: {
        opener: '--replace',
        needs: 'emoji names',
        example: 'seedcord emojis push --replace wave',
        question: 'Which emojis do you want to replace?'
    },
    remove: {
        opener: 'seedcord emojis remove',
        needs: 'emoji names',
        example: 'seedcord emojis remove wave',
        question: 'Which emojis do you want to delete?'
    },
    guild: {
        opener: '--guild',
        needs: 'a guild id',
        example: 'seedcord emojis pull --guild 1234567890123456789',
        question: 'Which guild?'
    }
} satisfies Record<string, Picker>;

export class EmojisCommand extends BaseCommand {
    private readonly pushRunner: PushRunner;
    private readonly listRunner: ListRunner;
    private readonly removeRunner: RemoveRunner;
    private readonly pullRunner: PullRunner;
    private readonly prompter: Prompter;

    constructor({
        pushRunner = PushRunner.create(),
        listRunner = ListRunner.create(),
        removeRunner = RemoveRunner.create(),
        pullRunner = PullRunner.create(),
        prompter = new Prompter()
    }: Partial<EmojisDeps> = {}) {
        super('emojis', "Manage your application's emojis on Discord");
        this.pushRunner = pushRunner;
        this.listRunner = listRunner;
        this.removeRunner = removeRunner;
        this.pullRunner = pullRunner;
        this.prompter = prompter;
    }

    public register(program: Command): CommandUnknownOpts {
        const emojis = this.define(program).action((_options, command) => this.openMenu(command));

        emojis
            .command('push')
            .description(DESCRIPTIONS.push)
            .option('--yes', 'Upload without asking first')
            .option('--replace [names...]', 'Also upload these again in place of the ones on Discord')
            .action((flags, command) =>
                this.runSteps(command, PUSH_STEPS, (printer) => this.push(printer, command, flags))
            );

        emojis
            .command('list')
            .description(DESCRIPTIONS.list)
            .option('--check', 'Exit with an error when the folder has files that are missing on Discord')
            .option('--json', 'Print the listing as JSON for scripts')
            .action((flags, command) => {
                if (flags.json) return this.runJson(command, () => this.listRunner.json(stderrSteps(), flags));
                return this.runSteps(command, EMOJI_STEPS, (printer) => this.list(printer, command, flags));
            });

        emojis
            .command('pull')
            .description(DESCRIPTIONS.pull)
            .argument('[names...]', 'The emojis to download. Without names, it downloads every missing one')
            .option('--force', 'Also download the ones your folder already has, over their files')
            .option('--guild [id]', "Download a guild's emojis in place of the application's")
            .action((names, flags, command) =>
                this.runSteps(command, PULL_STEPS, (printer) => this.pull(printer, { names, ...flags }))
            );

        emojis
            .command('remove')
            .description(DESCRIPTIONS.remove)
            .argument('[names...]', 'The emojis to delete. Without names, you pick them from a list')
            .option('--delete-file', "Also delete each emoji's file from your folder")
            .option('--yes', 'Delete without asking first')
            .action((names, flags, command) =>
                this.runSteps(command, REMOVE_STEPS, (printer) => this.remove(printer, { names, ...flags }))
            );

        return emojis;
    }

    private async openMenu(command: CommandUnknownOpts): Promise<void> {
        if (!isInteractive()) {
            command.outputHelp();
            return;
        }

        await this.runSteps(command, MENU_STEPS, async (printer) => {
            const actions: Record<MenuAction, () => Promise<void>> = {
                push: () => this.push(printer, command, {}),
                replace: () => this.push(printer, command, { replace: true }),
                list: () => this.list(printer, command, {}),
                pull: () => this.pull(printer, { names: [] }),
                guild: () => this.pull(printer, { names: [], guild: true }),
                remove: () => this.remove(printer, { names: [] })
            };
            const action = await unlessCancelled(printer, () =>
                this.prompter.select<MenuAction>({
                    message: 'What do you want to do?',
                    choices: MENU.map((value) => ({ value, label: MENU_LABELS[value] }))
                })
            );
            if (action) await actions[action]();
        });
    }

    private push(
        printer: StepPrinter<PushStep>,
        command: CommandUnknownOpts,
        { yes, replace }: PushOptions & Yes
    ): Promise<void> {
        if (replace === true) this.assertCanPick('replace');
        const prompts = { confirm: this.confirm('push', yes), pick: this.picker('replace') };
        return this.pushRunner.run(new PushPresenter(printer, prompts, isVerbose(command)), { replace });
    }

    private list(printer: StepPrinter<EmojiStep>, command: CommandUnknownOpts, options: ListOptions): Promise<void> {
        return this.listRunner.run(new ListPresenter(printer, isVerbose(command)), options);
    }

    private pull(printer: StepPrinter<PullStep>, options: PullOptions): Promise<void> {
        if (options.guild === true) this.assertCanPick('guild');
        const prompts: Pick<EmojiPrompts, 'offer' | 'pickGuild'> = {
            offer: offerOrNo(this.prompter, false),
            pickGuild: (choices) => this.prompter.select({ message: PICKERS.guild.question, choices })
        };
        return this.pullRunner.run(new PullPresenter(printer, prompts), options);
    }

    private remove(printer: StepPrinter<RemoveStep>, { yes = false, ...options }: RemoveOptions & Yes): Promise<void> {
        if (options.names.length === 0) this.assertCanPick('remove');
        const prompts = {
            confirm: this.confirm('remove', yes),
            offer: offerOrNo(this.prompter, yes),
            pick: this.picker('remove')
        };
        return this.removeRunner.run(new RemovePresenter(printer, prompts), options);
    }

    private confirm(asking: keyof typeof ASKS, yes = false): Confirm {
        return confirmOrYes(this.prompter, { yes, ...ASKS[asking] });
    }

    private picker(picking: 'replace' | 'remove'): EmojiPrompts['pick'] {
        return (choices) => this.prompter.pickMany({ message: PICKERS[picking].question, choices });
    }

    private assertCanPick(picking: keyof typeof PICKERS): void {
        if (isInteractive()) return;
        const { opener, needs, example } = PICKERS[picking];
        throw new SeedcordTypeError(SeedcordErrorCode.CliPickerNeedsTerminal, [opener, needs, example]);
    }
}
