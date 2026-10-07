import { isSeedcordError, paint } from '@seedcord/errors';

import { BaseCommand } from '#core/BaseCommand';
import { cliLogger } from '#core/cliLogger';
import { StepPrinter } from '#core/output/StepPrinter';
import { isVerbose } from '#core/verbose';

import { CODEGEN_STEPS, CodegenRunner } from './CodegenRunner';

import type { Command } from '@commander-js/extra-typings';

export class CodegenCommand extends BaseCommand {
    constructor() {
        super('codegen', 'Generate typed augmentations from your commands and config');
    }

    public register(program: Command): void {
        program
            .command(this.name)
            .description(this.description)
            .option('--check', 'Verify the committed augmentations are up to date instead of writing them')
            .action(async (options, command) => {
                const check = options.check ?? false;
                const printer = new StepPrinter({
                    command: this.name,
                    labels: CODEGEN_STEPS,
                    verbose: isVerbose(command)
                });
                printer.header();
                try {
                    const { outputPath } = await CodegenRunner.create(printer, cliLogger('Codegen')).run(check);
                    printer.line();
                    printer.line(check ? `${paint.path(outputPath)} is up to date` : `wrote ${paint.path(outputPath)}`);
                    printer.line();
                } catch (error: unknown) {
                    printer.fail(error);
                    if (isSeedcordError(error)) process.exitCode = 1;
                    else process.exit(1);
                }
            });
    }
}
