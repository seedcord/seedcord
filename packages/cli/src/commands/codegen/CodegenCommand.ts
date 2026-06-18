import { isSeedcordError } from '@seedcord/errors';

import { BaseCommand } from '@core/BaseCommand';

import { CodegenRunner } from './CodegenRunner';

import type { Command } from '@commander-js/extra-typings';

export class CodegenCommand extends BaseCommand {
    private readonly runner: CodegenRunner;

    constructor() {
        super(
            'codegen',
            'Generate the typed command registry (slash options and context menus) from your commands',
            'CLI:Codegen'
        );
        this.runner = CodegenRunner.create(this.logger);
    }

    public register(program: Command): void {
        program
            .command(this.name)
            .description(this.description)
            .option('--check', 'Verify the committed registry is up to date instead of writing it')
            .action(async (options) => {
                try {
                    await this.runner.run(options.check ?? false);
                } catch (error: unknown) {
                    this.logger.error('Seedcord codegen failed', error);
                    if (isSeedcordError(error)) process.exitCode = 1;
                    else process.exit(1);
                }
            });
    }
}
