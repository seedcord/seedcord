import { isSeedcordError } from '@seedcord/services';

import { BaseCommand } from '@core/BaseCommand';
import { SilentLogger } from '@utils/SilentLogger';

import { DevRunner } from './DevRunner';

import type { Command } from 'commander';

export class DevCommand extends BaseCommand {
    private readonly runner: DevRunner;

    constructor() {
        super('dev', 'Run a Seedcord instance from the config file', 'CLI:Dev');
        this.runner = DevRunner.create(new SilentLogger());
    }

    public register(program: Command): void {
        program
            .command(this.name)
            .description(this.description)
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
}
