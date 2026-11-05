import { Command } from '@commander-js/extra-typings';
import { isSeedcordError } from '@seedcord/errors';
import { installNodeConsole } from '@seedcord/logger/node';

import { AskCommand } from '#commands/ask/AskCommand';
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
import { version } from '#core/version';

async function main(): Promise<void> {
    installNodeConsole();

    const program = addVerboseOption(new Command().name('seedcord').description('seedcord CLI').version(version));

    const commands = [
        new AskCommand(),
        new DevCommand(),
        new BuildCommand(),
        new CodegenCommand(),
        new CommandsCommand(),
        new MakeCommand()
    ];

    for (const command of commands) {
        const registered = command.register(program);
        if (command.needsProject) {
            registered.hook('preAction', () => {
                assertProjectInstall(process.cwd(), import.meta.dirname);
            });
        }
    }

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
