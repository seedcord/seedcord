import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { scaffold } from '@scaffold/scaffold';

import type { CommandRunner } from '@scaffold/scaffold';
import type { ScaffoldAnswers } from '@template/context';

const TEMPLATES = resolve(import.meta.dirname, '../../templates');

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

function recorder(failOn?: string): { runner: CommandRunner; calls: Recorded[] } {
    const calls: Recorded[] = [];
    const runner: CommandRunner = (command, args) => {
        calls.push({ command, args });
        if (failOn !== undefined && args.join(' ').includes(failOn)) {
            return Promise.reject(new Error(`${failOn} blew up`));
        }

        return Promise.resolve();
    };

    return { runner, calls };
}

async function scratchTarget(): Promise<string> {
    return join(await mkdtemp(join(tmpdir(), 'create-seedcord-scaffold-')), 'my-bot');
}

function baseInput(target: string): Parameters<typeof scaffold>[0] {
    return {
        target,
        templatesRoot: TEMPLATES,
        answers: GATEWAY,
        agent: 'pnpm',
        install: true,
        git: true
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

    it('holds typescript on 6, which is the last major typescript-eslint supports', async () => {
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

    it('skips git when git is off', async () => {
        const target = await scratchTarget();
        const { runner, calls } = recorder();

        await scaffold({ ...baseInput(target), git: false }, runner);

        expect(calls.every((call) => call.command !== 'git')).toBe(true);
    });

    it('writes the token the interview collected', async () => {
        const target = await scratchTarget();
        const { runner } = recorder();

        await scaffold(baseInput(target), runner);

        expect(await readFile(join(target, '.env'), 'utf8')).toContain('DISCORD_BOT_TOKEN=aaa.bbb.ccc');
    });
});

describe('scaffold cleanup', () => {
    it('removes the directory it created when a step fails', async () => {
        const target = await scratchTarget();
        const { runner } = recorder('add');

        await expect(scaffold(baseInput(target), runner)).rejects.toThrow();
        await expect(readdir(target)).rejects.toThrow();
    });

    it('empties a directory that already existed and leaves it standing', async () => {
        const target = await scratchTarget();
        await mkdir(target, { recursive: true });
        const { runner } = recorder('add');

        await expect(scaffold(baseInput(target), runner)).rejects.toThrow();
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
