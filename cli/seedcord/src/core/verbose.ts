import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

export function addVerboseOption(program: Command): Command {
    return program.option('--verbose', 'Print the resolved config and full stack traces');
}

// commander also reads program options written after the subcommand
export function isVerbose(command: CommandUnknownOpts): boolean {
    return command.optsWithGlobals().verbose === true;
}
