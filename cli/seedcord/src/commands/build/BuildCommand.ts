import { BaseCommand } from '#core/BaseCommand';

import { BUILD_STEPS, BuildRunner } from './BuildRunner';
import { printBuildSummary } from './printBuildSummary';

import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

export class BuildCommand extends BaseCommand {
    constructor() {
        super('build', 'Type check the bot and bundle it from the config file');
    }

    public register(program: Command): CommandUnknownOpts {
        return this.define(program).action((_options, command) =>
            this.runSteps(command, BUILD_STEPS, async (printer) => {
                printBuildSummary(printer, await BuildRunner.create(printer).run());
            })
        );
    }
}
