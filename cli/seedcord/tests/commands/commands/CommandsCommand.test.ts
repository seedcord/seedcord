import { stripVTControlCharacters } from 'node:util';

import { Command } from '@commander-js/extra-typings';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { Routes } from 'discord-api-types/v10';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandsCommand } from '#commands/commands/CommandsCommand';
import { DeployRunner } from '#commands/commands/deploy/DeployRunner';
import { LARGE_BOT_THRESHOLD } from '#commands/commands/remove/executeRemove';
import { RemoveRunner } from '#commands/commands/remove/RemoveRunner';
import { FAKE_TOKEN } from '#tests/commands/build/smoke';
import { APP_ID, botGuilds, fakeDiscord, fakeProject, slash } from '#tests/commands/commands/fakeBot';
import { KEY, PromptTerminal } from '#tests/core/prompts/PromptTerminal';
import { silentLogger } from '#tests/silentLogger';

import type { Prompter } from '#core/prompts/Prompter';

const ON_DISCORD = {
    [Routes.applicationCommands(APP_ID)]: [slash('ban')],
    [Routes.applicationGuildCommands(APP_ID, '111')]: [slash('ban'), slash('setup')]
};

interface CapturedOutput extends Disposable {
    stdout(): string;
    stderr(): string;
}

function captureOutput(): CapturedOutput {
    const capture = (stream: NodeJS.WriteStream): { text: () => string; restore: () => void } => {
        const chunks: string[] = [];
        const spy = vi.spyOn(stream, 'write').mockImplementation((chunk: string | Uint8Array) => {
            chunks.push(String(chunk));
            return true;
        });
        return { text: () => stripVTControlCharacters(chunks.join('')), restore: () => spy.mockRestore() };
    };
    const stdout = capture(process.stdout);
    const stderr = capture(process.stderr);

    return {
        stdout: stdout.text,
        stderr: stderr.text,
        [Symbol.dispose]: () => {
            stdout.restore();
            stderr.restore();
            process.exitCode = undefined;
        }
    };
}

async function runCommands(deps: ConstructorParameters<typeof CommandsCommand>[0], ...args: string[]): Promise<void> {
    const program = new Command().exitOverride();
    new CommandsCommand(deps).register(program);
    await program.parseAsync(['commands', ...args], { from: 'user' });
}

interface RunOptions {
    prompter?: Prompter;
    onDiscord?: Record<string, unknown>;
}

async function run(
    args: string[],
    { prompter, onDiscord = {} }: RunOptions = {}
): Promise<ReturnType<typeof fakeDiscord>> {
    const discord = fakeDiscord({ ...ON_DISCORD, ...onDiscord });
    const removeRunner = new RemoveRunner(() => discord.rest);
    await runCommands(prompter ? { removeRunner, prompter } : { removeRunner }, ...args);
    return discord;
}

async function runDeploy(...args: string[]): Promise<{ puts: unknown[] }> {
    const { rest, puts } = fakeDiscord();
    const deployRunner = new DeployRunner({
        projectLoader: await fakeProject(),
        openDiscord: () => rest,
        logger: silentLogger
    });
    await runCommands({ deployRunner }, 'deploy', ...args);
    return { puts };
}

describe('seedcord commands, on a terminal', () => {
    const original = { stdin: process.stdin.isTTY, stdout: process.stdout.isTTY, ci: process.env.CI };

    beforeEach(() => {
        process.stdin.isTTY = true;
        process.stdout.isTTY = true;
        delete process.env.CI;
        Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: FAKE_TOKEN }));
    });

    afterEach(() => {
        process.stdin.isTTY = original.stdin;
        process.stdout.isTTY = original.stdout;
        if (original.ci !== undefined) process.env.CI = original.ci;
    });

    // the wizard would wait on a keypress and time the test out
    it.each([
        ['clean', '--guilds', '111'],
        ['clean', '--all-guilds'],
        ['clean', '--yes'],
        ['purge', '--global'],
        ['purge', '--guilds', '111'],
        ['purge', '--all-guilds'],
        ['purge', '--yes']
    ])('runs %s %s straight through and opens no wizard', async (...args) => {
        using _output = captureOutput();

        await run(args);
    });

    it('opens the clean wizard from the menu', async () => {
        using output = captureOutput();
        using terminal = new PromptTerminal();
        const running = run([], { prompter: terminal.prompter });

        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Deploy the commands in your code'));
        expect(await terminal.screen()).toContain('List the commands Discord has');
        await terminal.press(KEY.down, KEY.down, KEY.enter);
        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Which guilds?'));
        await terminal.press(KEY.escape);
        await running;

        expect(output.stdout()).toContain('  cancelled');
    });

    it('opens the purge wizard from the menu', async () => {
        using output = captureOutput();
        using terminal = new PromptTerminal();
        const running = run([], { prompter: terminal.prompter });

        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Delete every command globally'));
        await terminal.press(KEY.down, KEY.down, KEY.down, KEY.enter);
        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Delete every command where?'));
        await terminal.press(KEY.escape);
        await running;

        expect(output.stdout()).toContain('  cancelled');
    });

    it('prints cancelled when the first question is cancelled', async () => {
        using output = captureOutput();
        using terminal = new PromptTerminal();
        const running = run([], { prompter: terminal.prompter });

        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Deploy the commands in your code'));
        await terminal.press(KEY.escape);
        await running;

        expect(output.stdout().trimEnd().split('\n').at(-1)).toBe('  cancelled');
        expect(process.exitCode).toBeUndefined();
    });
});

describe('seedcord commands clean and purge, off a terminal', () => {
    const stdinIsTTY = process.stdin.isTTY;

    beforeEach(() => {
        process.stdin.isTTY = false;
        Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: FAKE_TOKEN }));
    });

    afterEach(() => {
        process.stdin.isTTY = stdinIsTTY;
    });

    it('prints a row per step, then the duplicates and how to delete them', async () => {
        using output = captureOutput();

        const { deletes } = await run(['clean', '--guilds', '111']);

        const check = stripVTControlCharacters(paint.check);
        expect(output.stdout()).toMatch(new RegExp(String.raw`${check} connect +\S+\n`, 'u'));
        expect(output.stdout()).toMatch(new RegExp(String.raw`${check} scan +\S+ +1 duplicate in 1 guild\n`, 'u'));
        expect(output.stdout()).toContain('  111  1 duplicate\n      /ban\n');
        expect(output.stdout()).toContain('--yes');
        expect(deletes).toEqual([]);
    });

    it('deletes the duplicates with --yes and asks nothing', async () => {
        using _output = captureOutput();

        const { deletes } = await run(['clean', '--guilds', '111', '--yes']);

        expect(deletes).toEqual([Routes.applicationGuildCommand(APP_ID, '111', 'ban-id')]);
    });

    it('scans every guild with --all-guilds, however many the bot is in', async () => {
        using _output = captureOutput();

        const { gets } = await run(['clean', '--all-guilds'], { onDiscord: botGuilds(LARGE_BOT_THRESHOLD + 1) });

        expect(gets).toContain(Routes.applicationGuildCommands(APP_ID, `g${LARGE_BOT_THRESHOLD}`));
    });

    it('prints CliCleanNoGuilds with no stack when clean gets no guilds', async () => {
        using output = captureOutput();

        await run(['clean', '--yes']);

        expect(output.stderr()).toContain(`[${SeedcordErrorCode.CliCleanNoGuilds}] No guilds given.`);
        expect(output.stderr()).not.toMatch(/^\s+at /mu);
        expect(process.exitCode).toBe(1);
    });

    it('lists every command in the guilds passed to purge and deletes nothing', async () => {
        using output = captureOutput();

        const { puts } = await run(['purge', '--guilds', '111']);

        expect(output.stdout()).toContain('  111  2 commands\n      /ban /setup\n');
        expect(puts).toEqual([]);
    });

    it('empties the guilds passed to purge with --yes', async () => {
        using _output = captureOutput();

        const { puts } = await run(['purge', '--guilds', '111', '--yes']);

        expect(puts).toEqual([{ route: Routes.applicationGuildCommands(APP_ID, '111'), names: [] }]);
    });

    it('empties global with purge --global --yes', async () => {
        using _output = captureOutput();

        const { puts } = await run(['purge', '--global', '--yes']);

        expect(puts).toEqual([{ route: Routes.applicationCommands(APP_ID), names: [] }]);
    });

    it('throws CliPurgeNoTargets when purge gets nothing to empty', async () => {
        using output = captureOutput();

        await run(['purge', '--yes']);

        expect(output.stderr()).toContain(`[${SeedcordErrorCode.CliPurgeNoTargets}]`);
        expect(process.exitCode).toBe(1);
    });

    it.each(['clean', 'purge'])('refuses --guilds together with --all-guilds on %s', async (subcommand) => {
        using _output = captureOutput();

        await expect(run([subcommand, '--guilds', '111', '--all-guilds'])).rejects.toThrow(/cannot be used with/u);
    });
});

describe('seedcord commands deploy, off a terminal', () => {
    const stdinIsTTY = process.stdin.isTTY;

    beforeEach(() => {
        process.stdin.isTTY = false;
    });

    afterEach(() => {
        process.stdin.isTTY = stdinIsTTY;
    });

    it('prints the plan, then throws CliDeployNeedsYes and deploys nothing', async () => {
        using output = captureOutput();

        const { puts } = await runDeploy();

        expect(output.stdout()).toContain('  global  1 command\n    + /ping');
        expect(output.stderr()).toContain(`[${SeedcordErrorCode.CliDeployNeedsYes}]`);
        expect(process.exitCode).toBe(1);
        expect(puts).toEqual([]);
    });

    it('deploys with --yes', async () => {
        using _output = captureOutput();

        const { puts } = await runDeploy('--yes');

        expect(puts).toHaveLength(2);
    });
});
