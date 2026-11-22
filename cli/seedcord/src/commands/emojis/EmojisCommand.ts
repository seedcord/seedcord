import { Prompter } from '@seedcord/cli-prompts';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { isInteractive } from '@seedcord/utils/internal';

import { BaseCommand } from '#core/BaseCommand';
import { confirmOrYes, PROCEED } from '#core/output/confirm';
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
import type { EmojiPrompts } from './prompts';
import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

interface EmojisDeps {
    pushRunner: PushRunner;
    listRunner: ListRunner;
    removeRunner: RemoveRunner;
    pullRunner: PullRunner;
    prompter: Prompter;
}

const ASKS = {
    push: { command: 'seedcord emojis push', action: 'uploads' },
    remove: { command: 'seedcord emojis remove', action: 'deletes' },
    pull: { command: 'seedcord emojis pull --force', action: 'overwrites your files' }
} satisfies Record<string, Omit<Parameters<typeof confirmOrYes>[1], 'yes'>>;

interface Picker {
    // whatever opens the picker when you don't give it emoji names, a flag or the command itself
    opener: string;
    example: string;
    question: string;
}

const PICKERS = {
    push: {
        opener: '--replace',
        example: 'seedcord emojis push --replace wave',
        question: 'Which emojis do you want to replace?'
    },
    remove: {
        opener: 'seedcord emojis remove',
        example: 'seedcord emojis remove wave',
        question: 'Which emojis do you want to delete?'
    }
} satisfies Partial<Record<keyof typeof ASKS, Picker>>;

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
        const emojis = this.define(program).action((_options, command) => {
            command.outputHelp();
        });

        emojis
            .command('push')
            .description('Upload the emojis Discord is missing from your folder')
            .option('--yes', 'Upload without asking first')
            .option('--replace [names...]', 'Also upload these again in place of the ones on Discord')
            .action(({ yes, replace }, command) =>
                this.runSteps(command, PUSH_STEPS, (printer) => {
                    const prompts = this.prompts('push', yes, replace === true);
                    return this.pushRunner.run(new PushPresenter(printer, prompts, isVerbose(command)), { replace });
                })
            );

        emojis
            .command('list')
            .description('Compare your emojis folder with the emojis on Discord')
            .option('--check', 'Exit with an error when the folder has files that are missing on Discord')
            .option('--json', 'Print the listing as JSON for scripts')
            .action((flags, command) => {
                if (flags.json) return this.runJson(command, () => this.listRunner.json(stderrSteps(), flags));
                return this.runSteps(command, EMOJI_STEPS, (printer) =>
                    this.listRunner.run(new ListPresenter(printer, isVerbose(command)), flags)
                );
            });

        emojis
            .command('remove')
            .description('Delete emojis from Discord')
            .argument('[names...]', 'The emojis to delete. Without names, you pick them from a list')
            .option('--delete-file', "Also delete each emoji's file from your folder")
            .option('--yes', 'Delete without asking first')
            .action((names, { yes, deleteFile }, command) =>
                this.runSteps(command, REMOVE_STEPS, (printer) => {
                    const prompts = this.prompts('remove', yes, names.length === 0);
                    return this.removeRunner.run(new RemovePresenter(printer, prompts), { names, deleteFile });
                })
            );

        emojis
            .command('pull')
            .description('Download the emojis on Discord that your folder is missing')
            .argument('[names...]', 'The emojis to download. Without names, it downloads every missing one')
            .option('--force', 'Also download the ones your folder already has, over their files')
            .option('--yes', 'Overwrite those files without asking first')
            .option('--guild <id>', "Download a guild's emojis in place of the application's")
            .action((names, { force, yes, guild }, command) =>
                this.runSteps(command, PULL_STEPS, (printer) => {
                    // a plain pull only adds files
                    const confirm = force ? this.confirm('pull', yes) : PROCEED;
                    return this.pullRunner.run(new PullPresenter(printer, confirm), { names, force, guild });
                })
            );

        return emojis;
    }

    private confirm(asking: keyof typeof ASKS, yes = false): Confirm {
        return confirmOrYes(this.prompter, { yes, ...ASKS[asking] });
    }

    private prompts(asking: keyof typeof PICKERS, yes: boolean | undefined, opensPicker: boolean): EmojiPrompts {
        const { opener, example, question } = PICKERS[asking];
        if (opensPicker && !isInteractive()) {
            throw new SeedcordTypeError(SeedcordErrorCode.CliPickerNeedsTerminal, [opener, example]);
        }
        return {
            confirm: this.confirm(asking, yes),
            pick: (choices) => this.prompter.pickMany({ message: question, choices })
        };
    }
}
