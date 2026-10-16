import { Command } from '@commander-js/extra-typings';
import { installNodeDefaults } from '@seedcord/logger/node';

import { BuildCommand } from '#commands/build/BuildCommand';
import { CodegenCommand } from '#commands/codegen/CodegenCommand';
import { CommandsCommand } from '#commands/commands/CommandsCommand';
import { DevCommand } from '#commands/dev/DevCommand';
import { cliLogger } from '#core/cliLogger';
import { addVerboseOption } from '#core/verbose';
import { ShellMode } from '#core/viteMode';

import { version } from '.';

async function main(): Promise<void> {
    const shell = ShellMode.read();

    installNodeDefaults();

    const program = addVerboseOption(new Command().name('seedcord').description('seedcord CLI').version(version));

    new DevCommand(shell).register(program);
    new BuildCommand(shell).register(program);
    new CodegenCommand(shell).register(program);
    new CommandsCommand(shell).register(program);

    await program.parseAsync(process.argv);
}

void main().catch((error) => {
    cliLogger('CLI').error('Unexpected CLI error', error);
    process.exit(1);
});
