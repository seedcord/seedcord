import { Command } from '@commander-js/extra-typings';
import { KEY, PromptTerminal } from '@seedcord/cli-prompts/testing';
import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { EmojisCommand } from '#commands/emojis/EmojisCommand';
import { ListRunner } from '#commands/emojis/list/ListRunner';
import { PullRunner } from '#commands/emojis/pull/PullRunner';
import { PushRunner } from '#commands/emojis/push/PushRunner';
import { RemoveRunner } from '#commands/emojis/remove/RemoveRunner';
import { captureOutput } from '#tests/captureOutput';
import { fakeEmojiDiscord, projectWith } from '#tests/commands/emojis/fakeEmojiDiscord';

import type { Prompter } from '@seedcord/cli-prompts';

interface Ran {
    discord: ReturnType<typeof fakeEmojiDiscord>;
    done: Promise<void>;
}

async function run(args: string[], prompter?: Prompter): Promise<Ran> {
    const project = await projectWith({ 'wave.png': 'new wave', 'seed.png': 's', 'fresh.png': 'f' });
    const discord = fakeEmojiDiscord({ emojis: ['wave', 'seed', 'old_logo'] });
    const deps = { projectLoader: project, openDiscord: () => discord.rest };
    const runners = {
        pushRunner: new PushRunner(deps),
        listRunner: new ListRunner(deps),
        removeRunner: new RemoveRunner(deps),
        pullRunner: new PullRunner({ ...deps, fetch: () => Promise.resolve(new Response('image')) })
    };

    const program = new Command().exitOverride();
    new EmojisCommand(prompter ? { ...runners, prompter } : runners).register(program);
    return { discord, done: program.parseAsync(['emojis', ...args], { from: 'user' }).then(() => undefined) };
}

function changes({ discord }: Ran): string[] {
    return discord.requests.filter((request) => !request.startsWith('GET'));
}

describe('seedcord emojis, on a terminal', () => {
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

    it('opens a menu without a subcommand and runs the picked one', async () => {
        using output = captureOutput();
        using terminal = new PromptTerminal();
        const ran = await run([], terminal.prompter);

        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Upload the emojis'));
        const menu = await terminal.screen();
        expect(menu).toContain("Replace an emoji's image");
        expect(menu).toContain("Download a guild's emojis");
        expect(menu).toContain('Delete emojis from Discord');
        await terminal.press(KEY.down, KEY.down, KEY.enter);
        await ran.done;

        expect(output.stdout()).toContain('  not uploaded  1 emoji\n    + fresh\n');
        expect(changes(ran)).toEqual([]);
    });

    it('opens the replace picker from the menu', async () => {
        using _output = captureOutput();
        using terminal = new PromptTerminal();
        const ran = await run([], terminal.prompter);

        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Upload the emojis'));
        await terminal.press(KEY.down, KEY.enter);
        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Which emojis do you want to replace?'));
        await terminal.press(KEY.escape);
        await ran.done;

        expect(changes(ran)).toEqual([]);
    });

    it('lists the guilds for a guild pull from the menu', async () => {
        using _output = captureOutput();
        using terminal = new PromptTerminal();
        const ran = await run([], terminal.prompter);

        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Upload the emojis'));
        await terminal.press(KEY.down, KEY.down, KEY.down, KEY.down, KEY.enter);
        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Which guild?'));
        expect(await terminal.screen()).toContain('Alpha');
        await terminal.press(KEY.escape);
        await ran.done;

        expect(changes(ran)).toEqual([]);
    });

    it('prints cancelled when the menu is cancelled', async () => {
        using output = captureOutput();
        using terminal = new PromptTerminal();
        const ran = await run([], terminal.prompter);

        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Upload the emojis'));
        await terminal.press(KEY.escape);
        await ran.done;

        expect(output.stdout().trimEnd().split('\n').at(-1)).toBe('  cancelled');
        expect(ran.discord.requests).toEqual([]);
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

    it('asks whether pull should overwrite, and only adds the new ones on a no', async () => {
        using output = captureOutput();
        using terminal = new PromptTerminal();
        const ran = await run(['pull'], terminal.prompter);

        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Overwrite the 2 you already have?'));
        await terminal.press('n', KEY.enter);
        await ran.done;

        expect(output.stdout()).toContain('    + old_logo.webp\n');
        expect(output.stdout()).toMatch(/download +\S+ +1 downloaded\n/u);
    });

    it('asks whether remove should delete the file, then deletes only the emoji on a no', async () => {
        using output = captureOutput();
        using terminal = new PromptTerminal();
        const ran = await run(['remove', 'seed'], terminal.prompter);

        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Delete 1 file from'));
        await terminal.press('n', KEY.enter);
        await vi.waitFor(async () => expect(await terminal.screen()).toContain('Delete 1 emoji from seed beta?'));
        await terminal.press('y', KEY.enter);
        await ran.done;

        expect(changes(ran)).toEqual(['DELETE seed']);
        expect(output.stdout()).toContain('Keeping 1 file in');
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

describe('seedcord emojis list', () => {
    it('prints only the JSON on stdout with --json', async () => {
        using output = captureOutput();

        const ran = await run(['list', '--json']);
        await ran.done;

        expect(JSON.parse(output.stdout())).toMatchObject({
            application: { name: 'seed beta' },
            notUploaded: [{ name: 'fresh', key: 'Fresh' }]
        });
    });

    it('exits 1 under --check when a file is missing on Discord', async () => {
        using output = captureOutput();

        const ran = await run(['list', '--check']);
        await ran.done;

        expect(output.stdout()).toContain('  not uploaded  1 emoji\n    + fresh\n');
        expect(output.stderr()).toContain(`[${SeedcordErrorCode.ConfigEmojiNotFound}]`);
        expect(process.exitCode).toBe(1);
    });

    it('exits 1 for --check with --json and prints the error in place of the JSON', async () => {
        using output = captureOutput();

        const ran = await run(['list', '--check', '--json']);
        await ran.done;

        expect(output.stdout()).toBe('');
        expect(output.stderr()).toContain(`[${SeedcordErrorCode.ConfigEmojiNotFound}]`);
        expect(process.exitCode).toBe(1);
    });
});

describe('seedcord emojis remove and pull, off a terminal', () => {
    const stdinIsTTY = process.stdin.isTTY;

    beforeEach(() => {
        process.stdin.isTTY = false;
    });

    afterEach(() => {
        process.stdin.isTTY = stdinIsTTY;
    });

    it('deletes the named emojis with --yes', async () => {
        using _output = captureOutput();

        const ran = await run(['remove', 'old_logo', '--yes']);
        await ran.done;

        expect(changes(ran)).toEqual(['DELETE old_logo']);
    });

    it('throws CliPickerNeedsTerminal for remove without names', async () => {
        using output = captureOutput();

        const ran = await run(['remove', '--yes']);
        await ran.done;

        expect(output.stderr()).toContain(`[${SeedcordErrorCode.CliPickerNeedsTerminal}]`);
        expect(ran.discord.requests).toEqual([]);
    });

    it('pulls without a question', async () => {
        using output = captureOutput();

        const ran = await run(['pull']);
        await ran.done;

        expect(output.stdout()).toContain('    + old_logo.webp\n');
        expect(output.stdout()).toMatch(/download +\S+ +1 downloaded\n/u);
    });

    it('overwrites with pull --force', async () => {
        using output = captureOutput();

        const ran = await run(['pull', '--force']);
        await ran.done;

        expect(output.stdout()).toContain('    ~ seed.webp wave.webp\n');
        expect(output.stdout()).toMatch(/download +\S+ +3 downloaded\n/u);
    });

    it('throws CliPickerNeedsTerminal for a bare pull --guild', async () => {
        using output = captureOutput();

        const ran = await run(['pull', '--guild']);
        await ran.done;

        expect(output.stderr()).toContain(`[${SeedcordErrorCode.CliPickerNeedsTerminal}]`);
        expect(ran.discord.requests).toEqual([]);
    });

    it('keeps the file when remove --yes runs without --delete-file', async () => {
        using output = captureOutput();

        const ran = await run(['remove', 'seed', '--yes']);
        await ran.done;

        expect(changes(ran)).toEqual(['DELETE seed']);
        expect(output.stdout()).toContain('Keeping 1 file in');
    });
});
