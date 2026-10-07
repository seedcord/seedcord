import { isSeedcordError } from '@seedcord/errors';

import { BaseCommand } from '#core/BaseCommand';
import { StepPrinter } from '#core/output/StepPrinter';
import { isVerbose } from '#core/verbose';

import { BUILD_STEPS, BuildRunner } from './BuildRunner';
import { printBuildSummary } from './printBuildSummary';

import type { Command } from '@commander-js/extra-typings';

export class BuildCommand extends BaseCommand {
    constructor() {
        super('build', 'Type check the bot and bundle it from the config file');
    }

    public register(program: Command): void {
        program
            .command(this.name)
            .description(this.description)
            .action(async (_options, command) => {
                const printer = new StepPrinter({
                    command: this.name,
                    labels: BUILD_STEPS,
                    verbose: isVerbose(command)
                });
                printer.header();
                try {
                    printBuildSummary(printer, await BuildRunner.create(printer).run());
                } catch (error: unknown) {
                    printer.fail(error);
                    if (isSeedcordError(error)) process.exitCode = 1;
                    else process.exit(1);
                }
            });
    }
}
