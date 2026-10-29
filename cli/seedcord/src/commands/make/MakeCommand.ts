import { Prompter, unlessCancelled } from '@seedcord/cli-prompts';
import { isInteractive } from '@seedcord/utils/internal';

import { BaseCommand } from '#core/BaseCommand';

import { MAKE_STEPS, MakeRunner } from './MakeRunner';

import type { Command } from '@commander-js/extra-typings';

export class MakeCommand extends BaseCommand {
    constructor() {
        super('make', 'Write new files from one of your templates');
    }

    public register(program: Command): void {
        program
            .command(this.name)
            .description(this.description)
            .action((_options, command) =>
                this.runSteps(command, MAKE_STEPS, (printer) =>
                    unlessCancelled(printer, () => MakeRunner.create(printer, new Prompter(), isInteractive()).run())
                )
            );
    }
}
