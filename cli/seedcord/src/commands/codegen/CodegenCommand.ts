import { paint } from '@seedcord/errors';

import { BaseCommand } from '#core/BaseCommand';
import { cliLogger } from '#core/cliLogger';

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
            .action((options, command) =>
                this.runSteps(command, CODEGEN_STEPS, async (printer) => {
                    const check = options.check ?? false;
                    const runner = CodegenRunner.create(printer, cliLogger('Codegen'));
                    const { outputPath, changed } = await runner.run(check);
                    printer.line();
                    printer.line(
                        changed ? `wrote ${paint.path(outputPath)}` : `${paint.path(outputPath)} is up to date`
                    );
                    printer.line();
                })
            );
    }
}
