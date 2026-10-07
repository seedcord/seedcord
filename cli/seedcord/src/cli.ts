import { Command } from '@commander-js/extra-typings';
import { installNodeDefaults } from '@seedcord/logger/node';
import { Envapter, Environment } from 'envapt';

import { BuildCommand } from '#commands/build/BuildCommand';
import { CodegenCommand } from '#commands/codegen/CodegenCommand';
import { CommandsCommand } from '#commands/commands/CommandsCommand';
import { DevCommand } from '#commands/dev/DevCommand';
import { cliLogger } from '#core/cliLogger';
import { addVerboseOption } from '#core/verbose';

import { version } from '.';

async function main(): Promise<void> {
    if (!process.env.ENV && !process.env.ENVIRONMENT && !process.env.NODE_ENV) {
        Envapter.environment = Environment.Development;
    }

    installNodeDefaults();

    const program = addVerboseOption(new Command().name('seedcord').description('seedcord CLI').version(version));

    new DevCommand().register(program);
    new BuildCommand().register(program);
    new CodegenCommand().register(program);
    new CommandsCommand().register(program);

    await program.parseAsync(process.argv);
}

void main().catch((error) => {
    cliLogger('CLI').error('Unexpected CLI error', error);
    process.exit(1);
});
