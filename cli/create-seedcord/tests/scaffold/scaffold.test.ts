import { mkdir, mkdtempDisposable, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import { scaffold } from '#scaffold/scaffold';
import { BOT_TOKEN } from '#tests/token';

import type { StepUi } from '#cli/steps';
import type { CommandRunner, ScaffoldResult } from '#scaffold/scaffold';
import type { ScaffoldAnswers } from '#template/context';

async function scaffolded(...args: Parameters<typeof scaffold>): Promise<Extract<ScaffoldResult, { created: true }>> {
    const result = await scaffold(...args);
    if (!result.created) throw new Error('scaffold wrote nothing');
    return result;
}

const TEMPLATES = resolve(import.meta.dirname, '../../templates');
const STARTERS = resolve(import.meta.dirname, '../../starters');

const BUILT_IN = new Set(['node']);
// the binary a script calls, against the package that ships it
const PACKAGE_OF: Record<string, string> = {
    eslint: 'eslint',
    prettier: 'prettier',
    seedcord: 'seedcord',
    tsc: 'typescript',
    cf: 'cf'
};

const GATEWAY: ScaffoldAnswers = {
    directory: 'my-bot',
    transport: 'gateway',
    capabilities: ['guild-messages'],
    token: BOT_TOKEN,
    testingGuilds: [],
    botColor: 'Blurple',
    install: true,
    git: true
};

const HTTP: ScaffoldAnswers = {
    directory: 'my-bot',
    transport: 'http',
    runtime: 'server',
    token: BOT_TOKEN,
    testingGuilds: [],
    botColor: 'Blurple',
    install: true,
    git: true
};

const EDGE: ScaffoldAnswers = { ...HTTP, runtime: 'edge' };

const SEEDCORD_CLI = resolve(import.meta.dirname, '../../../seedcord');

async function seedcordTestedVersion(name: string): Promise<string> {
    const manifest = await readFile(join(SEEDCORD_CLI, 'node_modules', name, 'package.json'), 'utf8');
    // justified: a package manifest carries its version
    return (JSON.parse(manifest) as { version: string }).version;
}

// pnpm swaps catalog:peer for the real range only when it publishes
async function seedcordPeerRange(name: string): Promise<string> {
    const workspace = await readFile(join(SEEDCORD_CLI, '../../pnpm-workspace.yaml'), 'utf8');
    const lines = workspace.split('\n');
    const catalog = lines.slice(lines.indexOf('  peer:') + 1);
    const entries = catalog.slice(
        0,
        catalog.findIndex((line) => !line.startsWith('    '))
    );
    const entry = entries.find((line) => line.trim().replaceAll("'", '').startsWith(`${name}: `));
    if (entry === undefined) throw new Error(`${name} is missing from the peer catalog`);
    return entry.split(': ')[1] ?? '';
}

interface Recorded {
    command: string;
    args: string[];
}

function recorder(failOn?: string, warnOn?: string): { runner: CommandRunner; calls: Recorded[] } {
    const calls: Recorded[] = [];
    const runner: CommandRunner = (command, args) => {
        calls.push({ command, args });
        const spoken = args.join(' ');

        if (failOn !== undefined && spoken.includes(failOn)) {
            return Promise.reject(new Error(`${failOn} blew up`));
        }

        if (warnOn !== undefined && spoken.includes(warnOn)) {
            return Promise.resolve(`${warnOn} skipped a build script`);
        }

        return Promise.resolve(null);
    };

    return { runner, calls };
}

function installs(calls: readonly Recorded[]): { runtime: string[]; dev: string[] } {
    const adds = calls.filter(({ args }) => args[0] === 'add');
    return {
        runtime: adds.find(({ args }) => !args.includes('-D'))?.args ?? [],
        dev: adds.find(({ args }) => args.includes('-D'))?.args ?? []
    };
}

async function scratchTarget(): Promise<string> {
    const scratch = await mkdtempDisposable(join(tmpdir(), 'create-seedcord-scaffold-'));
    onTestFinished(() => scratch.remove());
    return join(scratch.path, 'my-bot');
}

function stepRecorder(): { steps: StepUi; seen: string[] } {
    const seen: string[] = [];

    return {
        seen,
        steps: {
            run: async (label, work) => {
                seen.push(label);
                try {
                    const result = await work();
                    seen.push(`done: ${label}`);
                    return result;
                } catch (error) {
                    seen.push(`failed: ${label}`);
                    throw error;
                }
            },
            skip: (label) => {
                seen.push(`skipped: ${label}`);
            }
        }
    };
}

function baseInput(target: string, steps: StepUi = stepRecorder().steps): Parameters<typeof scaffold>[0] {
    return {
        target,
        templatesRoot: TEMPLATES,
        startersRoot: STARTERS,
        answers: GATEWAY,
        agent: 'pnpm',
        steps
    };
}

describe('scaffold', () => {
    it('writes the rendered tree to the target', async () => {
        const target = await scratchTarget();
        const { runner } = recorder();

        await scaffold(baseInput(target), runner);

        const written = await readdir(target);
        expect(written).toContain('package.json');
        expect(written).toContain('src');
        expect(written).toContain('.env');
    });

    it('runs install, then format, then codegen, then git', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold(baseInput(target), runner);

        const order = calls.map((call) => `${call.command} ${call.args[0]}`);
        expect(order).toEqual(['pnpm add', 'pnpm add', 'pnpm exec', 'pnpm exec', 'git init', 'git add', 'git commit']);
    });

    it('writes the binding types of an edge bot in the types step', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold({ ...baseInput(target), answers: EDGE }, runner);

        const spoken = calls.map((call) => `${call.command} ${call.args.join(' ')}`);
        expect(spoken.slice(2, 5)).toEqual([
            'pnpm exec prettier --write .',
            'pnpm exec seedcord codegen',
            'pnpm exec cf workers types'
        ]);
    });

    it('installs the gateway packages and the shared dev ones', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold(baseInput(target), runner);

        const { runtime, dev } = installs(calls);
        expect(runtime).toContain('@seedcord/gateway');
        expect(runtime).toContain('discord.js');
        expect(dev).toContain('@types/node');
    });

    it('installs the dev packages before the runtime ones', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold({ ...baseInput(target), answers: EDGE }, runner);

        expect(calls[0]?.args).toContain('-D');
        expect(calls[1]?.args).not.toContain('-D');
    });

    it.each([
        ['gateway', GATEWAY],
        ['http', HTTP],
        ['edge', EDGE]
    ])('installs every tool the scripts call, for a %s bot', async (_kind, answers) => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();
        const input = { ...baseInput(target), answers };

        await scaffold(input, runner);

        const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8')) as {
            scripts: Record<string, string>;
        };
        const { runtime, dev } = installs(calls);
        const installed = [...runtime, ...dev];
        const commands = Object.values(manifest.scripts).flatMap((script) => script.split('&&'));

        for (const command of commands) {
            const binary = command.trim().split(' ')[0] ?? '';
            if (BUILT_IN.has(binary) || binary === input.agent) continue;

            const pkg = PACKAGE_OF[binary];
            expect(pkg, `${binary} maps to no package`).toBeDefined();
            expect(installed.some((arg) => arg === pkg || arg.startsWith(`${pkg}@`))).toBe(true);
        }
    });

    it.each(['cf', '@cloudflare/vite-plugin'])(
        'installs the %s version that seedcord tests its edge build on',
        async (name) => {
            const target = await scratchTarget();
            const { runner, calls } = recorder();

            await scaffold({ ...baseInput(target), answers: EDGE }, runner);

            const pinned = installs(calls).dev.find((arg) => arg.startsWith(`${name}@`));
            expect(pinned).toBe(`${name}@${await seedcordTestedVersion(name)}`);
        }
    );

    it.each([GATEWAY, HTTP, EDGE])('installs vite at the range seedcord takes as a peer', async (answers) => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold({ ...baseInput(target), answers }, runner);

        expect(installs(calls).dev).toContain(`vite@${await seedcordPeerRange('vite')}`);
    });

    it('pins typescript to the last major typescript-eslint supports', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold(baseInput(target), runner);

        expect(installs(calls).dev).toContain('typescript@~6.0');
    });

    it('swaps the transport package on http', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold({ ...baseInput(target), answers: HTTP }, runner);

        const { runtime } = installs(calls);
        expect(runtime).toContain('@seedcord/http');
        expect(runtime).not.toContain('discord.js');
        expect(runtime).toContain('discord-api-types');
    });

    it('skips install, format, and codegen when install is off', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold({ ...baseInput(target), answers: { ...GATEWAY, install: false } }, runner);

        expect(calls.map((call) => call.command)).toEqual(['git', 'git', 'git']);
    });

    it('reports every step in order', async () => {
        const target = await scratchTarget();
        const { runner } = recorder();
        const { steps, seen } = stepRecorder();

        await scaffold(baseInput(target, steps), runner);

        expect(seen).toEqual([
            'files',
            'done: files',
            'install',
            'done: install',
            'format',
            'done: format',
            'types',
            'done: types',
            'git',
            'done: git'
        ]);
    });

    it('keeps the project and says it is uncommitted when git fails', async () => {
        const target = await scratchTarget();
        const { runner } = recorder('commit');
        const { steps, seen } = stepRecorder();

        const result = await scaffolded(baseInput(target, steps), runner);

        expect(seen).toContain('failed: git');
        expect(result.notices).toEqual(['The project is complete and uncommitted.']);
        await expect(readdir(target)).resolves.toContain('package.json');
    });

    it('keeps going to git and the summary when the install fails', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder('-D');
        const { steps, seen } = stepRecorder();

        const result = await scaffolded(baseInput(target, steps), runner);

        expect(result.installed).toBe(false);
        expect(result.failed).toBe(true);
        expect(seen).toContain('failed: install');
        expect(result.notices.join('\n')).not.toContain('-D blew up');
        expect(calls.map((call) => call.command)).toContain('git');
    });

    it('leaves format and codegen alone when the install fails', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder('-D');

        await scaffold(baseInput(target), runner);

        const spoken = calls.map((call) => call.args.join(' '));
        expect(spoken.some((args) => args.includes('prettier --write'))).toBe(false);
        expect(spoken.some((args) => args.includes('codegen'))).toBe(false);
    });

    it('carries on through format and codegen when the install only reports a skipped build', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder(undefined, '-D');

        const result = await scaffolded(baseInput(target), runner);

        expect(result.installed).toBe(true);
        expect(result.failed).toBe(false);
        expect(result.notices.join('\n')).toContain('skipped a build script');

        const spoken = calls.map((call) => call.args.join(' '));
        expect(spoken.some((args) => args.includes('prettier --write'))).toBe(true);
        expect(spoken.some((args) => args.includes('codegen'))).toBe(true);
    });

    it('keeps going past a failed format', async () => {
        const target = await scratchTarget();
        // the dev install lists prettier too
        const { runner, calls } = recorder('prettier --write');
        const { steps, seen } = stepRecorder();

        const result = await scaffolded(baseInput(target, steps), runner);

        expect(result.installed).toBe(true);
        expect(result.failed).toBe(true);
        expect(seen).toContain('failed: format');
        expect(result.notices.join('\n')).not.toContain('prettier --write blew up');
        expect(calls.map((call) => call.args.join(' ')).some((args) => args.includes('codegen'))).toBe(true);
    });

    it('marks the three install steps skipped rather than dropping them', async () => {
        const target = await scratchTarget();
        const { runner } = recorder();
        const { steps, seen } = stepRecorder();

        await scaffold({ ...baseInput(target, steps), answers: { ...GATEWAY, install: false } }, runner);

        expect(seen).toContain('skipped: install');
        expect(seen).toContain('skipped: format');
        expect(seen).toContain('skipped: types');
    });

    it('marks git skipped when git is off', async () => {
        const target = await scratchTarget();
        const { runner } = recorder();
        const { steps, seen } = stepRecorder();

        await scaffold({ ...baseInput(target, steps), answers: { ...GATEWAY, git: false } }, runner);

        expect(seen).toContain('skipped: git');
    });

    it('skips git when git is off', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold({ ...baseInput(target), answers: { ...GATEWAY, git: false } }, runner);

        expect(calls.every((call) => call.command !== 'git')).toBe(true);
    });

    it('still finds git when the target sits under directories that do not exist yet', async () => {
        await using scratch = await mkdtempDisposable(join(tmpdir(), 'create-seedcord-nested-'));
        const target = join(scratch.path, 'a', 'b', 'my-bot');
        const { runner, calls } = recorder();

        await scaffold(baseInput(target), runner);

        expect(calls.map((call) => call.command)).toContain('git');
    });

    it('writes the token the interview collected', async () => {
        const target = await scratchTarget();
        const { runner } = recorder();

        await scaffold(baseInput(target), runner);

        expect(await readFile(join(target, '.env'), 'utf8')).toContain(`DISCORD_BOT_TOKEN=${BOT_TOKEN.value}`);
    });
});

describe('scaffold cleanup', () => {
    it('keeps the directory it created when install fails', async () => {
        const target = await scratchTarget();
        const { runner } = recorder('add');

        const result = await scaffolded(baseInput(target), runner);

        expect(result.installed).toBe(false);
        await expect(readdir(target)).resolves.toContain('package.json');
    });

    it('keeps the written files in a directory that already existed when install fails', async () => {
        const target = await scratchTarget();
        await mkdir(target, { recursive: true });
        const { runner } = recorder('add');

        const result = await scaffolded(baseInput(target), runner);

        expect(result.installed).toBe(false);
        await expect(readdir(target)).resolves.toContain('package.json');
    });

    it('removes the directory it created and reports nothing created when writing fails', async () => {
        const target = await scratchTarget();
        const { runner } = recorder();
        const { steps, seen } = stepRecorder();

        const result = await scaffold(
            { ...baseInput(target, steps), templatesRoot: join(target, 'missing-templates') },
            runner
        );

        expect(result).toEqual({ created: false });
        expect(seen).toContain('failed: files');
        await expect(readdir(target)).rejects.toThrow();
    });

    it('leaves a pre-existing empty directory standing when writing fails', async () => {
        const target = await scratchTarget();
        await mkdir(target, { recursive: true });
        const { runner } = recorder();

        await expect(
            scaffold({ ...baseInput(target), templatesRoot: join(target, 'missing-templates') }, runner)
        ).resolves.toEqual({ created: false });
        // claimTarget only accepts an empty target
        await expect(readdir(target)).resolves.toEqual([]);
    });

    it('refuses a target with anything in it before writing', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();
        await mkdir(target, { recursive: true });
        await writeFile(join(target, 'mine.txt'), 'mine');

        await expect(scaffold(baseInput(target), runner)).rejects.toThrow();
        expect(calls).toEqual([]);
        await expect(readdir(target)).resolves.toEqual(['mine.txt']);
    });
});
