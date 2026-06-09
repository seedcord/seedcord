import { Command } from '@commander-js/extra-typings';
import { Logger } from '@seedcord/services';

import { BuildCommand } from '@commands/build/BuildCommand';
import { CodegenCommand } from '@commands/codegen/CodegenCommand';
import { DevCommand } from '@commands/dev/DevCommand';

import { version } from '.';

const LOGGER_LABEL = 'Seedcord CLI';

async function main(): Promise<void> {
    if (!process.env.ENV && !process.env.ENVIRONMENT && !process.env.NODE_ENV) {
        process.env.NODE_ENV = 'development';
    }

    const program = new Command().name('seedcord').description('Seedcord CLI').version(version);

    new DevCommand().register(program);
    new BuildCommand().register(program);
    new CodegenCommand().register(program);

    await program.parseAsync(process.argv);
}

void main().catch((error) => {
    const logger = new Logger(LOGGER_LABEL);
    logger.error('Unexpected CLI error', error);
    process.exit(1);
});
