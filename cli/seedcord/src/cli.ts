import { Command } from '@commander-js/extra-typings';
import { Logger } from '@seedcord/logger';
import { installNodeDefaults } from '@seedcord/logger/node';
import { Envapter, Environment } from 'envapt';

import { BuildCommand } from '@commands/build/BuildCommand';
import { CodegenCommand } from '@commands/codegen/CodegenCommand';
import { CommandsCommand } from '@commands/commands/CommandsCommand';
import { DevCommand } from '@commands/dev/DevCommand';

import { version } from '.';

async function main(): Promise<void> {
    if (!process.env.ENV && !process.env.ENVIRONMENT && !process.env.NODE_ENV) {
        Envapter.environment = Environment.Development;
    }

    installNodeDefaults();

    const program = new Command().name('seedcord').description('seedcord CLI').version(version);

    new DevCommand().register(program);
    new BuildCommand().register(program);
    new CodegenCommand().register(program);
    new CommandsCommand().register(program);

    await program.parseAsync(process.argv);
}

void main().catch((error) => {
    const logger = new Logger('CLI', { channel: 'cli' });
    logger.error('Unexpected CLI error', error);
    process.exit(1);
});
