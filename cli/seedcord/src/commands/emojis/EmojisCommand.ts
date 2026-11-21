import { Prompter } from '@seedcord/cli-prompts';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { isInteractive } from '@seedcord/utils/internal';

import { BaseCommand } from '#core/BaseCommand';
import { confirmOrYes } from '#core/output/confirm';
import { isVerbose } from '#core/verbose';

import { PushPresenter } from './push/PushPresenter';
import { PUSH_STEPS, PushRunner } from './push/PushRunner';

import type { PushPrompts } from './push/PushPresenter';
import type { PushOptions } from './push/PushRunner';
import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

interface EmojisDeps {
    pushRunner: PushRunner;
    prompter: Prompter;
}

type PushFlags = PushOptions & { readonly yes?: boolean | undefined };

export class EmojisCommand extends BaseCommand {
    private readonly pushRunner: PushRunner;
    private readonly prompter: Prompter;

    constructor({ pushRunner = PushRunner.create(), prompter = new Prompter() }: Partial<EmojisDeps> = {}) {
        super('emojis', "Manage your application's emojis on Discord");
        this.pushRunner = pushRunner;
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
