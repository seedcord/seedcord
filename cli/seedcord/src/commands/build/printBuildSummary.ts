import { readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import { paint } from '@seedcord/errors';
import { isPlainObject } from '@seedcord/utils/internal';

import { formatBytes, plural } from '#core/format';

import type { StepPrinter } from '#core/output/StepPrinter';
import type { BuildResult, BuildStep } from './BuildRunner';

const COMMAND_LABEL_WIDTH = 9;
const FALLBACK_BINARY_NAME = 'bot';

function binaryName(projectDir: string): string {
    let manifest: unknown;
    try {
        manifest = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'));
    } catch {
        return FALLBACK_BINARY_NAME;
    }
    if (!isPlainObject(manifest) || typeof manifest.name !== 'string') return FALLBACK_BINARY_NAME;

    // a scoped name like @acme/my-bot builds to my-bot
    const unscoped = manifest.name.split('/').at(-1) ?? '';
    return unscoped === '' ? FALLBACK_BINARY_NAME : unscoped;
}

function runtimeName(): string {
    return 'Bun' in globalThis ? 'bun' : 'node';
}

// characters every shell reads as part of a plain word
const SHELL_SAFE = /^[\w./@+=:,-]+$/;

// single quotes keep $ literal in POSIX shells and in PowerShell, the windows default. cmd.exe is left out
function shellArg(arg: string): string {
    if (SHELL_SAFE.test(arg)) return arg;
    const escapedQuote = process.platform === 'win32' ? "''" : String.raw`'\''`;
    return `'${arg.replaceAll("'", escapedQuote)}'`;
}

// node and bun take forward slashes on windows too
function commandPath(path: string): string {
    return relative(process.cwd(), path).split(sep).join('/');
}

function commandLine(label: string, command: string): string {
    return `${paint.mute(label.padEnd(COMMAND_LABEL_WIDTH))}${paint.bold(command)}`;
}

function nextCommands({ config, bundle }: BuildResult): [label: string, command: string][] {
    if (config.target.kind === 'edge') return [['deploy', 'wrangler deploy']];

    const entry = shellArg(commandPath(bundle.entry));
    const binary = shellArg(binaryName(dirname(config.configFile)));
    return [
        ['run', `${runtimeName()} ${entry}`],
        ['compile', `bun build --compile ${entry} --outfile ${binary}`]
    ];
}

export function printBuildSummary(printer: StepPrinter<BuildStep>, result: BuildResult): void {
    const { bundle } = result;
    const counts = [plural(bundle.modules, 'module'), plural(bundle.textFiles, 'text file'), formatBytes(bundle.bytes)];

    printer.line();
    printer.line(`${counts.map((count) => paint.iris(count)).join(', ')} → ${paint.path(bundle.entry)}`);
    printer.line();
    for (const [label, command] of nextCommands(result)) printer.line(commandLine(label, command));
    printer.line();
}
