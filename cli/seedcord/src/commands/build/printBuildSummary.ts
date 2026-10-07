import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

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

// characters a POSIX shell reads as part of a plain word
const SHELL_SAFE = /^[\w./@%+=:,-]+$/;

function shellArg(arg: string): string {
    return SHELL_SAFE.test(arg) ? arg : `'${arg.replaceAll("'", String.raw`'\''`)}'`;
}

function commandLine(label: string, command: string): string {
    return `${paint.mute(label.padEnd(COMMAND_LABEL_WIDTH))}${paint.bold(command)}`;
}

export function printBuildSummary(printer: StepPrinter<BuildStep>, { config, bundle }: BuildResult): void {
    const entry = shellArg(relative(process.cwd(), bundle.entry));
    const counts = [plural(bundle.modules, 'module'), plural(bundle.textFiles, 'text file'), formatBytes(bundle.bytes)];
    const binary = shellArg(binaryName(dirname(config.configFile)));

    printer.line();
    printer.line(`${counts.map((count) => paint.iris(count)).join(', ')} → ${paint.path(bundle.entry)}`);
    printer.line();
    printer.line(commandLine('run', `${runtimeName()} ${entry}`));
    printer.line(commandLine('compile', `bun build --compile ${entry} --outfile ${binary}`));
    printer.line();
}
