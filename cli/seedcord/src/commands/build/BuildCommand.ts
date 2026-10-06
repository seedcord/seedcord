import { isSeedcordError } from '@seedcord/errors';
import { WORDMARK } from '@seedcord/errors/internal';

import { BaseCommand } from '#core/BaseCommand';

import { BuildRunner } from './BuildRunner';

import type { Command } from '@commander-js/extra-typings';

export class BuildCommand extends BaseCommand {
    private readonly runner: BuildRunner;

    constructor() {
        super('build', 'Type check the bot and bundle it from the config file', 'Build');
        this.runner = BuildRunner.create(this.logger);
    }

    public register(program: Command): void {
        program
            .command(this.name)
            .description(this.description)
            .action(async () => {
                try {
                    await this.runner.run();
                    this.logger.info(`${WORDMARK} build finished`);
                } catch (error: unknown) {
                    this.logger.error(`${WORDMARK} build failed`, error);
                    if (isSeedcordError(error)) process.exitCode = 1;
                    else process.exit(1);
                }
            });
    }
}
