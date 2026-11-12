import { isSeedcordError } from '@seedcord/errors';

import { renderError } from '#core/output/renderError';
import { StepPrinter } from '#core/output/StepPrinter';
import { isVerbose } from '#core/verbose';

import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

function exitFor(error: unknown): void {
    if (isSeedcordError(error)) process.exitCode = 1;
    else process.exit(1);
}

export abstract class BaseCommand {
    public readonly needsProject: boolean;

    constructor(
        public readonly name: string,
        public readonly description: string,
        { needsProject = true }: { needsProject?: boolean } = {}
    ) {
        this.needsProject = needsProject;
    }

    public abstract register(program: Command): CommandUnknownOpts;

    protected define(program: Command): Command {
        return program.command(this.name).description(this.description);
    }

    protected runSteps<Label extends string>(
        command: CommandUnknownOpts,
        labels: readonly Label[],
        run: (printer: StepPrinter<Label>) => Promise<void>
    ): Promise<void> {
        const printer = new StepPrinter({ command: this.name, labels, verbose: isVerbose(command) });
        printer.header();
        return this.runOn(printer, run);
    }

    protected runQuietSteps<Label extends string>(
        command: CommandUnknownOpts,
        labels: readonly Label[],
        run: (printer: StepPrinter<Label>) => Promise<void>
    ): Promise<void> {
        return this.runOn(
            new StepPrinter({ command: this.name, labels, verbose: isVerbose(command), rows: false }),
            run
        );
    }

    private async runOn<Label extends string>(
        printer: StepPrinter<Label>,
        run: (printer: StepPrinter<Label>) => Promise<void>
    ): Promise<void> {
        try {
            await run(printer);
        } catch (error: unknown) {
            printer.fail(error);
            exitFor(error);
        }
    }

    // stdout holds only the json
    protected async runJson(command: CommandUnknownOpts, run: () => Promise<unknown>): Promise<void> {
        try {
            process.stdout.write(`${JSON.stringify(await run(), null, 2)}\n`);
        } catch (error: unknown) {
            process.stderr.write(renderError(error, { verbose: isVerbose(command), width: undefined }));
            exitFor(error);
        }
    }
}
