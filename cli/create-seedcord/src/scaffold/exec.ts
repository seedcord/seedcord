import { spawn } from 'node:child_process';
import process from 'node:process';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { CommandRunner } from '#scaffold/scaffold';

// an install logs hundreds of lines before the one that says what broke
const KEPT_LINES = 12;

// npm opens with "npm error", yarn with "ERR!", pnpm with "Error:" above a bare ERR_ code
const NAMES_THE_CAUSE = /error|ERR[_!]/i;

// pnpm exits non-zero over a skipped build script with every package installed
const BLOCKED_BUILD = /ERR_PNPM_IGNORED_BUILDS/;

// trimming the start of a captured line in take() would break this
const INDENTED = /^\s/;

// pnpm redraws its progress with carriage returns
const LINE_BREAK = /[\r\n]+/;

const PIPED_COLUMNS = 100;
// clack indents captured output by three
const GUTTER = 3;

function lineWidth(): number {
    return (process.stdout.columns > 0 ? process.stdout.columns : PIPED_COLUMNS) - GUTTER;
}

// a bare `Error: CODE` header from pnpm carries the cause on the indented lines under it
function blockFrom(header: string, rest: string[]): string[] {
    const detail: string[] = [];
    for (const line of rest) {
        if (!INDENTED.test(line)) break;
        detail.push(line);
    }

    return [header, ...detail];
}

function failureLines(captured: string[]): string[] {
    const blocks: string[] = [];
    let consumedThrough = -1;

    for (const [index, line] of captured.entries()) {
        // a block above may already include this line
        if (index <= consumedThrough || !NAMES_THE_CAUSE.test(line)) continue;

        const block = blockFrom(line, captured.slice(index + 1));
        blocks.push(...block);
        consumedThrough = index + block.length - 1;
    }

    // every package manager prints the cause last
    return (blocks.length > 0 ? blocks : captured).slice(-KEPT_LINES);
}

interface SpawnSpec {
    command: string;
    args: string[];
    shell: boolean;
}

// windows ships these as .cmd shims, and node will not spawn one without a shell
const SHIMS = new Set(['npm', 'npx', 'pnpm', 'yarn', 'bun', 'deno']);

export function spawnSpec(command: string, args: string[], platform: NodeJS.Platform): SpawnSpec {
    const shell = platform === 'win32' && SHIMS.has(command);
    if (!shell) return { command, args, shell };

    // node prints DEP0190 when args are passed with shell: true
    return { command: [command, ...args].join(' '), args: [], shell };
}

export async function execRunner(...[command, args, cwd]: Parameters<CommandRunner>): Promise<string | null> {
    const spoken = [command, ...args].join(' ');
    const width = lineWidth();
    const spec = spawnSpec(command, args, process.platform);

    return new Promise<string | null>((resolve, reject) => {
        const child = spawn(spec.command, spec.args, { cwd, shell: spec.shell });
        const captured: string[] = [];

        const take = (chunk: Buffer): void => {
            for (const line of chunk.toString('utf8').split(LINE_BREAK)) {
                // one uncut chunk grew past node's max string length
                const text = line.trimEnd().slice(0, width);
                if (text.trim() === '') continue;

                captured.push(text);
            }
        };

        child.stdout.on('data', take);
        child.stderr.on('data', take);

        child.on('error', (error) => {
            reject(new SeedcordError(SeedcordErrorCode.CreateStepFailed, [spoken, error.message]));
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(null);
                return;
            }

            const shown = failureLines(captured).join('\n');
            if (captured.some((line) => BLOCKED_BUILD.test(line))) {
                resolve(shown);
                return;
            }

            reject(new SeedcordError(SeedcordErrorCode.CreateStepFailed, [spoken, shown || `exited with ${code}`]));
        });
    });
}
