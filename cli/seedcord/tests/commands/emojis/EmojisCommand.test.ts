import { Command } from '@commander-js/extra-typings';
import { KEY, PromptTerminal } from '@seedcord/cli-prompts/testing';
import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { EmojisCommand } from '#commands/emojis/EmojisCommand';
import { PushRunner } from '#commands/emojis/push/PushRunner';
import { captureOutput } from '#tests/captureOutput';
import { fakeProject } from '#tests/commands/commands/fakeBot';
import { fakeEmojiDiscord, writeEmojis } from '#tests/commands/emojis/fakeEmojiDiscord';

import type { Prompter } from '@seedcord/cli-prompts';

interface Ran {
    discord: ReturnType<typeof fakeEmojiDiscord>;
    done: Promise<void>;
}

async function run(args: string[], prompter?: Prompter): Promise<Ran> {
    const project = await fakeProject();
    await writeEmojis(project.dir, { 'wave.png': 'new wave', 'seed.png': 's', 'fresh.png': 'f' });
    const discord = fakeEmojiDiscord({ emojis: ['wave', 'seed'] });
    const pushRunner = new PushRunner({ projectLoader: project, openDiscord: () => discord.rest });

    const program = new Command().exitOverride();
    new EmojisCommand(prompter ? { pushRunner, prompter } : { pushRunner }).register(program);
    return { discord, done: program.parseAsync(['emojis', ...args], { from: 'user' }).then(() => undefined) };
}

function changes({ discord }: Ran): string[] {
    return discord.requests.filter((request) => !request.startsWith('GET'));
}

describe('seedcord emojis push, on a terminal', () => {
    const original = { stdin: process.stdin.isTTY, stdout: process.stdout.isTTY, ci: process.env.CI };

    beforeEach(() => {
        process.stdin.isTTY = true;
        process.stdout.isTTY = true;
        delete process.env.CI;
    });

    afterEach(() => {
        process.stdin.isTTY = original.stdin;
        process.stdout.isTTY = original.stdout;
        if (original.ci !== undefined) process.env.CI = original.ci;
    });

    it('uploads after a yes to its question', async () => {
        using _output = captureOutput();
        using terminal = new PromptTerminal();
        const ran = await run(['push'], terminal.prompter);

        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Upload 1 emoji to seed beta?'));
        await terminal.press('y', KEY.enter);
        await ran.done;

        expect(changes(ran)).toEqual(['POST fresh']);
    });

    it('opens a picker of the uploaded emojis for a bare --replace', async () => {
        using _output = captureOutput();
        using terminal = new PromptTerminal();
        const ran = await run(['push', '--yes', '--replace'], terminal.prompter);

        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Which emojis do you want to replace?'));
        expect(await terminal.screen()).toContain('seed');
        await terminal.press(KEY.escape);
        await ran.done;

        expect(changes(ran)).toEqual([]);
    });
});

describe('seedcord emojis push, off a terminal', () => {
    const stdinIsTTY = process.stdin.isTTY;

    beforeEach(() => {
        process.stdin.isTTY = false;
    });

    afterEach(() => {
        process.stdin.isTTY = stdinIsTTY;
    });

    it('throws CliNeedsYes before it reads anything', async () => {
        using output = captureOutput();

        const ran = await run(['push']);
        await ran.done;

        expect(output.stderr()).toContain(`[${SeedcordErrorCode.CliNeedsYes}]`);
        expect(process.exitCode).toBe(1);
        expect(ran.discord.requests).toEqual([]);
    });

    it('throws CliPickerNeedsTerminal for a bare --replace', async () => {
        using output = captureOutput();

        const ran = await run(['push', '--yes', '--replace']);
        await ran.done;

        expect(output.stderr()).toContain(`[${SeedcordErrorCode.CliPickerNeedsTerminal}]`);
        expect(ran.discord.requests).toEqual([]);
    });

    it('uploads and replaces the named emojis with --yes', async () => {
        using _output = captureOutput();

        const ran = await run(['push', '--yes', '--replace', 'wave']);
        await ran.done;

        expect(changes(ran)).toEqual(['POST fresh', 'PATCH wave to sc_wave-id', 'POST wave', 'DELETE sc_wave-id']);
    });
});
