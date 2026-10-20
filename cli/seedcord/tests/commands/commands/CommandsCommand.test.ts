import { stripVTControlCharacters } from 'node:util';

import { Command } from '@commander-js/extra-typings';
import { KEY, PromptTerminal } from '@seedcord/cli-prompts/testing';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { Routes } from 'discord-api-types/v10';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandsCommand } from '#commands/commands/CommandsCommand';
import { DeployRunner } from '#commands/commands/deploy/DeployRunner';
import { ListRunner } from '#commands/commands/list/ListRunner';
import { RemoveRunner } from '#commands/commands/remove/RemoveRunner';
import { bindEnv } from '#tests/bindEnv';
import { FAKE_TOKEN } from '#tests/commands/build/smoke';
import { APP_ID, botGuilds, fakeDiscord, fakeProject, slash } from '#tests/commands/commands/fakeBot';
import { silentLogger } from '#tests/silentLogger';

import type { FakeProject } from '#tests/commands/commands/fakeBot';
import type { Prompter } from '@seedcord/cli-prompts';
import type { Mock } from 'vitest';

const GUILD_PAGE = 200;

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
    project?: FakeProject;
}

async function run(
    args: string[],
    { prompter, onDiscord = {}, project }: RunOptions = {}
): Promise<ReturnType<typeof fakeDiscord>> {
    const discord = fakeDiscord({ ...ON_DISCORD, ...onDiscord });
    const opened = project ?? (await fakeProject());
    const deps = {
        projectLoader: opened,
        openDiscord: () => discord.rest,
        logger: silentLogger
    };
    const runners = {
        deployRunner: new DeployRunner({ ...deps, state: opened.state }),
        listRunner: new ListRunner(deps),
        removeRunner: new RemoveRunner(deps)
    };
    await runCommands(prompter ? { ...runners, prompter } : runners, ...args);
    return discord;
}

interface RefusingPrompter {
    prompter: Prompter;
    asked: Mock;
}

// every method rejects. a prompt nobody answers would hang the test
function refusingPrompter(): RefusingPrompter {
    const asked = vi.fn((): Promise<never> => Promise.reject(new Error('the command asked a question')));
    // justified: the commands call only these three methods on a prompter
    const prompter = { select: asked, confirm: asked, pickMany: asked } as unknown as Prompter;
    return { prompter, asked };
}

const EMPTY_DISCORD = {
    [Routes.applicationCommands(APP_ID)]: [],
    [Routes.applicationGuildCommands(APP_ID, '111')]: []
};

describe('seedcord commands, on a terminal', () => {
    const original = { stdin: process.stdin.isTTY, stdout: process.stdout.isTTY, ci: process.env.CI };

    beforeEach(() => {
        process.stdin.isTTY = true;
        process.stdout.isTTY = true;
        delete process.env.CI;
        const env = bindEnv({ DISCORD_BOT_TOKEN: FAKE_TOKEN });
        return () => env[Symbol.dispose]();
    });

    afterEach(() => {
        process.stdin.isTTY = original.stdin;
        process.stdout.isTTY = original.stdout;
        if (original.ci !== undefined) process.env.CI = original.ci;
    });

    it.each([
        ['clean', '--guilds', '111'],
        ['clean', '--all-guilds'],
        ['clean', '--yes'],
        ['purge', '--global'],
        ['purge', '--guilds', '111'],
        ['purge', '--all-guilds'],
        ['purge', '--yes']
    ])('runs %s %s without asking anything', async (...args) => {
        using _output = captureOutput();
        const { prompter, asked } = refusingPrompter();

        await run(args, { prompter });

        expect(asked).not.toHaveBeenCalled();
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

    it('lists the commands Discord has from the menu', async () => {
        using output = captureOutput();
        using terminal = new PromptTerminal();
        const running = run([], { prompter: terminal.prompter });

        await vi.waitFor(async () => expect(await terminal.screen()).toContain('List the commands Discord has'));
        await terminal.press(KEY.down, KEY.enter);
        await running;

        expect(output.stdout()).toContain('  global  1 command\n      /ban\n');
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
        const env = bindEnv({ DISCORD_BOT_TOKEN: FAKE_TOKEN });
        return () => env[Symbol.dispose]();
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
        expect(output.stdout()).toContain('  Alpha  1 duplicate\n      /ban\n');
        expect(output.stdout()).toContain('--yes');
        expect(deletes).toEqual([]);
    });

    it('deletes the duplicates with --yes and asks nothing', async () => {
        using _output = captureOutput();

        const { deletes } = await run(['clean', '--guilds', '111', '--yes']);

        expect(deletes).toEqual([Routes.applicationGuildCommand(APP_ID, '111', 'ban-id')]);
    });

    it('scans every guild with --all-guilds, past the first page', async () => {
        using _output = captureOutput();

        const { gets } = await run(['clean', '--all-guilds'], { onDiscord: botGuilds(GUILD_PAGE + 1) });

        expect(gets).toContain(Routes.applicationGuildCommands(APP_ID, `g${GUILD_PAGE}`));
    });

    it('prints CliNoScopeGiven with no stack when clean gets no guilds', async () => {
        using output = captureOutput();

        await run(['clean', '--yes']);

        expect(output.stderr()).toContain(`[${SeedcordErrorCode.CliNoScopeGiven}] No scope given.`);
        expect(output.stderr()).not.toMatch(/^\s+at /mu);
        expect(process.exitCode).toBe(1);
    });

    it('lists every command in the guilds passed to purge and deletes nothing', async () => {
        using output = captureOutput();

        const { puts } = await run(['purge', '--guilds', '111']);

        expect(output.stdout()).toContain('  Alpha  2 commands\n      /ban /setup\n');
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

    it('throws CliNoScopeGiven when purge gets nothing to empty', async () => {
        using output = captureOutput();

        await run(['purge', '--yes']);

        expect(output.stderr()).toContain(`[${SeedcordErrorCode.CliNoScopeGiven}]`);
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

    it('throws CliDeployNeedsYes before it reads anything', async () => {
        using output = captureOutput();

        const { gets, puts } = await run(['deploy'], { onDiscord: EMPTY_DISCORD });

        expect(output.stderr()).toContain(`[${SeedcordErrorCode.CliDeployNeedsYes}]`);
        expect(process.exitCode).toBe(1);
        expect(gets).toEqual([]);
        expect(puts).toEqual([]);
    });

    it('deploys every scope in the code with --yes', async () => {
        using _output = captureOutput();

        const { puts } = await run(['deploy', '--yes'], { onDiscord: EMPTY_DISCORD });

        expect(puts).toEqual([
            { route: Routes.applicationCommands(APP_ID), names: ['ping'] },
            { route: Routes.applicationGuildCommands(APP_ID, '111'), names: ['config'] }
        ]);
    });

    it('deploys the scopes that match the last deploy again with --force', async () => {
        using _output = captureOutput();
        const project = await fakeProject();
        await run(['deploy', '--yes'], { project, onDiscord: EMPTY_DISCORD });
        const unchanged = {
            [Routes.applicationCommands(APP_ID)]: [slash('ping')],
            [Routes.applicationGuildCommands(APP_ID, '111')]: [slash('config')]
        };

        const { puts } = await run(['deploy', '--yes', '--force'], { project, onDiscord: unchanged });

        expect(puts.map(({ route }) => route)).toEqual([
            Routes.applicationCommands(APP_ID),
            Routes.applicationGuildCommands(APP_ID, '111')
        ]);
    });
});

describe('seedcord commands list --json', () => {
    it('prints only the JSON on stdout and moves what the bot printed to stderr', async () => {
        using output = captureOutput();
        const inner = await fakeProject();
        const project: FakeProject = {
            state: inner.state,
            readConfig: (dir) => {
                process.stdout.write('loading the bot\n');
                return inner.readConfig(dir);
            },
            openProject: (config) => inner.openProject(config)
        };

        await run(['list', '--json'], { project });

        expect(JSON.parse(output.stdout())).toMatchObject({ global: [{ name: 'ban' }] });
        expect(output.stderr()).toContain('loading the bot');
    });
});
