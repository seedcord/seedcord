import { isSeedcordError } from '@seedcord/services';

import { BaseCommand } from '@core/BaseCommand';

import { BuildRunner } from './BuildRunner';

import type { Command } from 'commander';

export class BuildCommand extends BaseCommand {
    private readonly runner: BuildRunner;

    constructor() {
        super('build', 'Compile a Seedcord project from the config file', 'CLI:Build');
        this.runner = BuildRunner.create(this.logger);
    }

    public register(program: Command): void {
        program
            .command(this.name)
            .description(this.description)
            .action(async () => {
                try {
                    await this.runner.run();
                } catch (error: unknown) {
                    this.logger.error('Seedcord build failed', error);
                    if (isSeedcordError(error)) process.exitCode = 1;
                    else process.exit(1);
                }
            });
    }
}
