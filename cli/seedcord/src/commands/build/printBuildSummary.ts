import { paint } from '@seedcord/errors';

import { formatBytes, plural } from '#core/format';

import type { StepPrinter } from '#core/output/StepPrinter';
import type { BuildResult, BuildStep } from './BuildRunner';

const COMMAND_LABEL_WIDTH = 9;

function commandLine(label: string, command: string): string {
    return `${paint.mute(label.padEnd(COMMAND_LABEL_WIDTH))}${paint.bold(command)}`;
}

export function printBuildSummary(printer: StepPrinter<BuildStep>, { bundle, nextCommands }: BuildResult): void {
    const counts = [plural(bundle.modules, 'module'), plural(bundle.textFiles, 'text file'), formatBytes(bundle.bytes)];

    printer.line();
    printer.line(`${counts.map((count) => paint.iris(count)).join(', ')} → ${paint.path(bundle.entry)}`);
    printer.line();
    for (const [label, command] of nextCommands) printer.line(commandLine(label, command));
    printer.line();
}
