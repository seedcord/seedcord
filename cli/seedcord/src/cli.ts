import { Command } from '@commander-js/extra-typings';
import { isSeedcordError } from '@seedcord/errors';
import { installNodeConsole } from '@seedcord/logger/node';

import { BuildCommand } from '#commands/build/BuildCommand';
import { CodegenCommand } from '#commands/codegen/CodegenCommand';
import { CommandsCommand } from '#commands/commands/CommandsCommand';
import { DevCommand } from '#commands/dev/DevCommand';
import { MakeCommand } from '#commands/make/MakeCommand';
import { cliLogger } from '#core/cliLogger';
import { renderError } from '#core/output/renderError';
import { widthOf } from '#core/output/terminal';
import { assertProjectInstall } from '#core/project/assertProjectInstall';
import { addVerboseOption, isVerbose } from '#core/verbose';

import { version } from '.';

async function main(): Promise<void> {
    installNodeConsole();

    const program = addVerboseOption(new Command().name('seedcord').description('seedcord CLI').version(version));
    program.hook('preAction', () => {
        assertProjectInstall(process.cwd(), import.meta.dirname);
    });

    new DevCommand().register(program);
    new BuildCommand().register(program);
    new CodegenCommand().register(program);
    new CommandsCommand().register(program);
    new MakeCommand().register(program);

    try {
        await program.parseAsync(process.argv);
    } catch (error: unknown) {
        if (!isSeedcordError(error)) throw error;
        process.stderr.write(renderError(error, { verbose: isVerbose(program), width: widthOf(process.stderr) }));
        process.exitCode = 1;
    }
}

void main().catch((error) => {
    cliLogger('CLI').error('Unexpected CLI error', error);
    process.exit(1);
});
