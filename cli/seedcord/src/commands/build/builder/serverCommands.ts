import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { isPlainObject, posixRelative } from '@seedcord/utils/internal';

import type { NextCommand } from './TargetBuild';

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

export function serverCommands(configFile: string, builtEntry: string): NextCommand[] {
    // node and bun take forward slashes on windows too
    const entry = shellArg(posixRelative(process.cwd(), builtEntry));
    const binary = shellArg(binaryName(dirname(configFile)));
    return [
        ['run', `${runtimeName()} ${entry}`],
        ['compile', `bun build --compile ${entry} --outfile ${binary}`]
    ];
}
