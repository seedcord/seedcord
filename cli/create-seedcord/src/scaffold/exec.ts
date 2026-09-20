import { spawn } from 'node:child_process';
import process from 'node:process';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { CommandRunner } from '#scaffold/scaffold';

// an install logs hundreds of lines before the one that says what broke
const KEPT_LINES = 12;

// npm opens with "npm error", yarn with "ERR!", pnpm with "Error:" above a bare ERR_ code
const NAMES_THE_CAUSE = /error|ERR[_!]/i;

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
function blockFrom(captured: string[], start: number): string[] {
    const detail: string[] = [];
    for (const line of captured.slice(start + 1)) {
        if (!INDENTED.test(line)) break;
        detail.push(line);
    }

    return [captured[start] ?? '', ...detail];
}

function failureLines(captured: string[]): string[] {
    const blocks = captured.flatMap((line, index) => (NAMES_THE_CAUSE.test(line) ? blockFrom(captured, index) : []));

    return blocks.length > 0 ? blocks.slice(0, KEPT_LINES) : captured.slice(-KEPT_LINES);
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

export async function execRunner(...[command, args, cwd]: Parameters<CommandRunner>): Promise<void> {
    const spoken = [command, ...args].join(' ');
    const width = lineWidth();
    const spec = spawnSpec(command, args, process.platform);

    return new Promise((resolve, reject) => {
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
                resolve();
                return;
            }

            const shown = failureLines(captured).join('\n');
            reject(new SeedcordError(SeedcordErrorCode.CreateStepFailed, [spoken, shown || `exited with ${code}`]));
        });
    });
}
