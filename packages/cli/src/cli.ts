import { Logger } from '@seedcord/services';
import { Command } from 'commander';

import { BuildCommand } from './commands/BuildCommand';
import { DevCommand } from './commands/DevCommand';

import { version } from '.';

const LOGGER_LABEL = 'Seedcord CLI';

async function main(): Promise<void> {
    process.env.NODE_ENV ??= 'development';

    const logger = new Logger(LOGGER_LABEL);
    const program = new Command().name('seedcord').description('Seedcord CLI').version(version);

    DevCommand.create(logger).register(program);
    BuildCommand.create(logger).register(program);

    await program.parseAsync(process.argv);
}

void main().catch((error) => {
    const logger = new Logger(LOGGER_LABEL);
    logger.error('Unexpected CLI error', error);
    process.exit(1);
});
