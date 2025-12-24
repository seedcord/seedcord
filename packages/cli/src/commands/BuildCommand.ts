import { isSeedcordError } from '@seedcord/services';

import { SeedcordBuildRunner } from '../runtime/SeedcordBuildRunner';

import type { ILogger } from '@seedcord/types';
import type { Command } from 'commander';

export class BuildCommand {
    constructor(
        private readonly runner: SeedcordBuildRunner,
        private readonly logger: ILogger
    ) {}

    public register(program: Command): void {
        program
            .command('build')
            .description('Compile a Seedcord project from the config file')
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

    public static create(logger: ILogger): BuildCommand {
        return new BuildCommand(SeedcordBuildRunner.create(logger), logger);
    }
}
