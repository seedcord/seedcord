import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { scaffold } from '#scaffold/scaffold';

import type { StepUi } from '#cli/steps';
import type { CommandRunner } from '#scaffold/scaffold';
import type { ScaffoldAnswers } from '#template/context';

const TEMPLATES = resolve(import.meta.dirname, '../../templates');

const BUILT_IN = new Set(['node']);
// the binary a script calls, against the package that ships it
const PACKAGE_OF: Record<string, string> = {
    eslint: 'eslint',
    prettier: 'prettier',
    seedcord: 'seedcord',
    tsc: 'typescript'
};

const GATEWAY: ScaffoldAnswers = {
    directory: 'my-bot',
    language: 'typescript',
    transport: 'gateway',
    capabilities: ['guild-messages'],
    token: 'aaa.bbb.ccc',
    botColor: 'Blurple'
};

const HTTP: ScaffoldAnswers = {
    directory: 'my-bot',
    language: 'typescript',
    transport: 'http',
    token: 'aaa.bbb.ccc',
    publicKey: 'a'.repeat(64),
    botColor: 'Blurple'
};

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

async function scratchTarget(): Promise<string> {
    return join(await mkdtemp(join(tmpdir(), 'create-seedcord-scaffold-')), 'my-bot');
}

function stepRecorder(): { steps: StepUi; seen: string[] } {
    const seen: string[] = [];

    return {
        seen,
        steps: {
            run: async (labels, work) => {
                seen.push(labels.running);
                const result = await work();
                seen.push(`done: ${labels.done}`);
                return result;
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
        answers: GATEWAY,
        agent: 'pnpm',
        install: true,
        git: true,
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

    it('installs the gateway packages and the shared dev ones', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold(baseInput(target), runner);

        const [deps, dev] = calls;
        expect(deps?.args).toContain('@seedcord/gateway');
        expect(deps?.args).toContain('discord.js');
        expect(dev?.args).toContain('-D');
        expect(dev?.args).toContain('@types/node');
    });

    it('installs every tool the generated scripts call', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold(baseInput(target), runner);

        const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8')) as {
            scripts: Record<string, string>;
        };
        const installed = [...(calls[0]?.args ?? []), ...(calls[1]?.args ?? [])];

        for (const command of Object.values(manifest.scripts)) {
            const binary = command.split(' ')[0] ?? '';
            if (BUILT_IN.has(binary)) continue;

            const pkg = PACKAGE_OF[binary];
            expect(pkg, `${binary} maps to no package`).toBeDefined();
            expect(installed.some((arg) => arg === pkg || arg.startsWith(`${pkg}@`))).toBe(true);
        }
    });

    it('pins typescript to the last major typescript-eslint supports', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold(baseInput(target), runner);

        expect(calls[1]?.args).toContain('typescript@~6.0');
    });

    it('swaps the transport package on http', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold({ ...baseInput(target), answers: HTTP }, runner);

        expect(calls[0]?.args).toContain('@seedcord/http');
        expect(calls[0]?.args).not.toContain('discord.js');
    });

    it('skips install, format, and codegen when install is off', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold({ ...baseInput(target), install: false }, runner);

        expect(calls.map((call) => call.command)).toEqual(['git', 'git', 'git']);
    });

    it('reports every step in order', async () => {
        const target = await scratchTarget();
        const { runner } = recorder();
        const { steps, seen } = stepRecorder();

        await scaffold(baseInput(target, steps), runner);

        expect(seen).toEqual([
            'Writing files',
            'done: Files written',
            'Installing dependencies',
            'done: Dependencies installed',
            'Formatting',
            'done: Code formatted',
            'Generating types',
            'done: Types generated',
            'Setting up git',
            'done: Committed'
        ]);
    });

    it('keeps the project and reports why when git fails', async () => {
        const target = await scratchTarget();
        const { runner } = recorder('commit');

        const result = await scaffold(baseInput(target), runner);

        expect(result.notices.join('\n')).toContain('commit blew up');
        await expect(readdir(target)).resolves.toContain('package.json');
    });

    it('keeps going to git and the summary when the install fails', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder('-D');

        const result = await scaffold(baseInput(target), runner);

        expect(result.installed).toBe(false);
        expect(result.failed).toBe(true);
        expect(result.notices.join('\n')).toContain('-D blew up');
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

        const result = await scaffold(baseInput(target), runner);

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

        const result = await scaffold(baseInput(target), runner);

        expect(result.installed).toBe(true);
        expect(result.notices.join('\n')).toContain('prettier --write blew up');
        expect(calls.map((call) => call.args.join(' ')).some((args) => args.includes('codegen'))).toBe(true);
    });

    it('marks the three install steps skipped rather than dropping them', async () => {
        const target = await scratchTarget();
        const { runner } = recorder();
        const { steps, seen } = stepRecorder();

        await scaffold({ ...baseInput(target, steps), install: false }, runner);

        expect(seen).toContain('skipped: Dependencies installed');
        expect(seen).toContain('skipped: Code formatted');
        expect(seen).toContain('skipped: Types generated');
    });

    it('marks git skipped when git is off', async () => {
        const target = await scratchTarget();
        const { runner } = recorder();
        const { steps, seen } = stepRecorder();

        await scaffold({ ...baseInput(target, steps), git: false }, runner);

        expect(seen).toContain('skipped: Committed');
    });

    it('skips git when git is off', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold({ ...baseInput(target), git: false }, runner);

        expect(calls.every((call) => call.command !== 'git')).toBe(true);
    });

    it('still finds git when the target sits under directories that do not exist yet', async () => {
        const target = join(await mkdtemp(join(tmpdir(), 'create-seedcord-nested-')), 'a', 'b', 'my-bot');
        const { runner, calls } = recorder();

        await scaffold(baseInput(target), runner);

        expect(calls.map((call) => call.command)).toContain('git');
    });

    it('writes the token the interview collected', async () => {
        const target = await scratchTarget();
        const { runner } = recorder();

        await scaffold(baseInput(target), runner);

        expect(await readFile(join(target, '.env'), 'utf8')).toContain('DISCORD_BOT_TOKEN=aaa.bbb.ccc');
    });
});

describe('scaffold cleanup', () => {
    it('keeps the directory it created when install fails', async () => {
        const target = await scratchTarget();
        const { runner } = recorder('add');

        const result = await scaffold(baseInput(target), runner);

        expect(result.installed).toBe(false);
        await expect(readdir(target)).resolves.toContain('package.json');
    });

    it('keeps the written files in a directory that already existed when install fails', async () => {
        const target = await scratchTarget();
        await mkdir(target, { recursive: true });
        const { runner } = recorder('add');

        const result = await scaffold(baseInput(target), runner);

        expect(result.installed).toBe(false);
        await expect(readdir(target)).resolves.toContain('package.json');
    });

    it('removes the directory it created when writing fails', async () => {
        const target = await scratchTarget();
        const { runner } = recorder();

        await expect(
            scaffold({ ...baseInput(target), templatesRoot: join(target, 'missing-templates') }, runner)
        ).rejects.toThrow();
        await expect(readdir(target)).rejects.toThrow();
    });

    it('leaves a pre-existing empty directory standing when writing fails', async () => {
        const target = await scratchTarget();
        await mkdir(target, { recursive: true });
        const { runner } = recorder();

        await expect(
            scaffold({ ...baseInput(target), templatesRoot: join(target, 'missing-templates') }, runner)
        ).rejects.toThrow();
        // claimTarget rejects a non-empty target, so existed means empty and restoring it is leaving it alone
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
