import { spawn } from 'node:child_process';
import process from 'node:process';
import { stripVTControlCharacters } from 'node:util';

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

const STACK_FRAME = /^\s+at\s/;

// far past any real error line
const MAX_LINE_LENGTH = 4096;

interface CapturedLine {
    readonly text: string;
    readonly plain: string;
}

// pnpm indents the cause under a bare `Error: CODE` header
function blockFrom(header: CapturedLine, rest: CapturedLine[]): CapturedLine[] {
    const detail: CapturedLine[] = [];
    for (const line of rest) {
        if (!INDENTED.test(line.plain)) break;
        detail.push(line);
    }

    return [header, ...detail];
}

function failureLines(captured: CapturedLine[]): CapturedLine[] {
    const blocks: CapturedLine[] = [];
    let consumedThrough = -1;

    for (const [index, line] of captured.entries()) {
        // a block above may already include this line
        if (index <= consumedThrough || !NAMES_THE_CAUSE.test(line.plain)) continue;

        const block = blockFrom(line, captured.slice(index + 1));
        blocks.push(...block);
        consumedThrough = index + block.length - 1;
    }

    // every package manager prints the cause last
    return (blocks.length > 0 ? blocks : captured).slice(-KEPT_LINES);
}

export class CommandFailed extends SeedcordError<SeedcordErrorCode.CreateStepFailed> {
    constructor(
        public readonly command: string,
        public readonly output: readonly string[]
    ) {
        super(SeedcordErrorCode.CreateStepFailed, [command, output.join('\n')]);
    }
}

interface SpawnSpec {
    command: string;
    args: string[];
    shell: boolean;
}

// node will not spawn a windows .cmd shim without a shell
const SHIMS = new Set(['npm', 'npx', 'pnpm', 'yarn', 'bun', 'deno']);

export function spawnSpec(command: string, args: string[], platform: NodeJS.Platform): SpawnSpec {
    const shell = platform === 'win32' && SHIMS.has(command);
    if (!shell) return { command, args, shell };

    // node prints DEP0190 when args are passed with shell: true
    return { command: [command, ...args].join(' '), args: [], shell };
}

interface ExecOptions {
    readonly verbose: boolean;
    readonly color: boolean;
}

export function createExecRunner(options: ExecOptions): CommandRunner {
    return (command, args, cwd) => run(command, args, cwd, options);
}

function run(command: string, args: string[], cwd: string, { verbose, color }: ExecOptions): Promise<string | null> {
    const spoken = [command, ...args].join(' ');
    const spec = spawnSpec(command, args, process.platform);
    const env = color ? { ...process.env, FORCE_COLOR: '1' } : process.env;

    return new Promise<string | null>((resolve, reject) => {
        const child = spawn(spec.command, spec.args, { cwd, shell: spec.shell, env });
        const captured: CapturedLine[] = [];

        const take = (chunk: Buffer): void => {
            for (const line of chunk.toString('utf8').split(LINE_BREAK)) {
                // one uncut chunk grew past node's max string length
                const text = line.trimEnd().slice(0, MAX_LINE_LENGTH);
                const plain = stripVTControlCharacters(text);
                if (plain.trim() === '' || (!verbose && STACK_FRAME.test(plain))) continue;

                captured.push({ text, plain });
            }
        };

        child.stdout.on('data', take);
        child.stderr.on('data', take);

        child.on('error', (error) => {
            reject(new CommandFailed(spoken, [error.message]));
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(null);
                return;
            }

            const shown = failureLines(captured).map((line) => line.text);
            if (captured.some((line) => BLOCKED_BUILD.test(line.plain))) {
                resolve(shown.join('\n'));
                return;
            }

            reject(new CommandFailed(spoken, shown.length > 0 ? shown : [`exited with ${code}`]));
        });
    });
}
