import { Prompter } from '@seedcord/cli-prompts';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { isInteractive } from '@seedcord/utils/internal';

import { BaseCommand } from '#core/BaseCommand';
import { confirmOrYes } from '#core/output/confirm';
import { stderrSteps } from '#core/output/stderrSteps';
import { isVerbose } from '#core/verbose';

import { ListPresenter } from './list/ListPresenter';
import { ListRunner } from './list/ListRunner';
import { PushPresenter } from './push/PushPresenter';
import { PUSH_STEPS, PushRunner } from './push/PushRunner';
import { EMOJI_STEPS } from './readEmojis';

import type { PushPrompts } from './push/PushPresenter';
import type { PushOptions } from './push/PushRunner';
import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

interface EmojisDeps {
    pushRunner: PushRunner;
    listRunner: ListRunner;
    prompter: Prompter;
}

type PushFlags = PushOptions & { readonly yes?: boolean | undefined };

export class EmojisCommand extends BaseCommand {
    private readonly pushRunner: PushRunner;
    private readonly listRunner: ListRunner;
    private readonly prompter: Prompter;

    constructor({
        pushRunner = PushRunner.create(),
        listRunner = ListRunner.create(),
        prompter = new Prompter()
    }: Partial<EmojisDeps> = {}) {
        super('emojis', "Manage your application's emojis on Discord");
        this.pushRunner = pushRunner;
        this.listRunner = listRunner;
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
            .action((flags, command) =>
                this.runSteps(command, PUSH_STEPS, (printer) =>
                    this.pushRunner.run(new PushPresenter(printer, this.pushPrompts(flags), isVerbose(command)), flags)
                )
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

        return emojis;
    }

    private pushPrompts({ yes = false, replace }: PushFlags): PushPrompts {
        if (replace === true && !isInteractive()) {
            throw new SeedcordTypeError(SeedcordErrorCode.CliPickerNeedsTerminal, [
                '--replace',
                'seedcord emojis push --replace wave'
            ]);
        }
        return {
            confirm: confirmOrYes(this.prompter, { yes, command: 'seedcord emojis push', action: 'uploads' }),
            pick: (names) =>
                this.prompter.pickMany({
                    message: 'Which emojis do you want to replace?',
                    choices: names.map((name) => ({ value: name, label: name }))
                })
        };
    }
}
