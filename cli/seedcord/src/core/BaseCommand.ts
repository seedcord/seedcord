import { isSeedcordError } from '@seedcord/errors';

import { StepPrinter } from '#core/output/StepPrinter';
import { isVerbose } from '#core/verbose';

import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

export abstract class BaseCommand {
    constructor(
        public readonly name: string,
        public readonly description: string
    ) {}

    public abstract register(program: Command): void;

    protected async runSteps<Label extends string>(
        command: CommandUnknownOpts,
        labels: readonly Label[],
        run: (printer: StepPrinter<Label>) => Promise<void>
    ): Promise<void> {
        const printer = new StepPrinter({ command: this.name, labels, verbose: isVerbose(command) });
        printer.header();
        try {
            await run(printer);
        } catch (error: unknown) {
            printer.fail(error);
            if (isSeedcordError(error)) process.exitCode = 1;
            else process.exit(1);
        }
    }
}
