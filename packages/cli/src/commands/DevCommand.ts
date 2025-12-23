import { isSeedcordError } from '@seedcord/services';

import { SeedcordDevRunner } from '../runtime/SeedcordDevRunner';

import type { ILogger } from '@seedcord/types';
import type { Command } from 'commander';

export class DevCommand {
    constructor(
        private readonly runner: SeedcordDevRunner,
        private readonly logger: ILogger
    ) {}

    public register(program: Command): void {
        program
            .command('dev')
            .description('Run a Seedcord instance from seedcord.config.ts')
            .action(async () => {
                try {
                    await this.runner.run();
                } catch (error: unknown) {
                    this.logger.error('Seedcord dev failed', error);
                    if (isSeedcordError(error)) process.exitCode = 1;
                    else process.exit(1);
                }
            });
    }

    public static create(logger: ILogger): DevCommand {
        return new DevCommand(SeedcordDevRunner.create(logger), logger);
    }
}
