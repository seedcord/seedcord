import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { RemovePresenter } from '#commands/emojis/remove/RemovePresenter';
import { REMOVE_STEPS, RemoveRunner } from '#commands/emojis/remove/RemoveRunner';
import { PROCEED } from '#core/output/confirm';
import { StepPrinter } from '#core/output/StepPrinter';
import { fakeEmojiDiscord, projectWith } from '#tests/commands/emojis/fakeEmojiDiscord';
import { fakeTerminal } from '#tests/fakeTerminal';

import type { EmojiPrompts } from '#commands/emojis/prompts';
import type { RemoveOptions } from '#commands/emojis/remove/RemoveRunner';
import type { FakeProject } from '#tests/commands/commands/fakeBot';
import type { REST } from '@discordjs/rest';

interface Removed {
    printed: () => string;
    done: Promise<void>;
}

function remove(
    project: FakeProject,
    rest: REST,
    {
        confirm = PROCEED,
        offer = () => Promise.resolve(false),
        pick = () => Promise.resolve([]),
        ...options
    }: RemoveOptions & Partial<EmojiPrompts>
): Removed {
    const stdout = fakeTerminal();
    const printer = new StepPrinter({
        command: 'emojis',
        labels: REMOVE_STEPS,
        verbose: false,
        stdout,
        stderr: stdout
    });
    const runner = new RemoveRunner({ projectLoader: project, openDiscord: () => rest });
    return { printed: stdout.text, done: runner.run(new RemovePresenter(printer, { confirm, offer, pick }), options) };
}

describe('emojis RemoveRunner', () => {
    it('deletes the named emojis from the application', async () => {
        const project = await projectWith({ 'seed.png': 's' });
        const discord = fakeEmojiDiscord({ emojis: ['seed', 'old_logo', 'test'] });
        const questions: string[] = [];

        const { printed, done } = remove(project, discord.rest, {
            names: ['old_logo', 'test'],
            confirm: (question) => {
                questions.push(question);
                return Promise.resolve(true);
            }
        });
        await done;

        expect(discord.emojis().map(({ name }) => name)).toEqual(['seed']);
        expect(questions).toEqual(['Delete 2 emojis from seed beta?']);
        expect(printed()).toContain('  seed beta  2 emojis\n    - old_logo test\n');
        expect(printed()).toMatch(/delete +\S+ +2 deleted\n/u);
    });

    it("doesn't delete anything when the answer is no", async () => {
        const project = await projectWith({});
        const discord = fakeEmojiDiscord({ emojis: ['old_logo'] });

        const { printed, done } = remove(project, discord.rest, {
            names: ['old_logo'],
            confirm: () => Promise.resolve(false)
        });
        await done;

        expect(discord.emojis()).toHaveLength(1);
        expect(printed()).toContain('Nothing deleted.');
    });

    it('asks whether to delete the file too, and keeps it on a no', async () => {
        const project = await projectWith({ 'seed.png': 's' });
        const discord = fakeEmojiDiscord({ emojis: ['seed'] });
        const folder = join(project.dir, 'emojis');
        const offers: string[] = [];

        const { printed, done } = remove(project, discord.rest, {
            names: ['seed'],
            offer: (question) => {
                offers.push(question);
                return Promise.resolve(false);
            }
        });
        await done;

        expect(offers).toEqual([`Delete 1 file from ${folder} too?`]);
        expect(discord.emojis()).toEqual([]);
        expect(existsSync(join(folder, 'seed.png'))).toBe(true);
        expect(printed()).toContain(
            [
                '    - seed',
                `      Keeping 1 file in ${folder}, so the next seedcord emojis push uploads it again.`,
                ''
            ].join('\n')
        );
    });

    it('deletes the file after a yes to that question', async () => {
        const project = await projectWith({ 'seed.png': 's' });
        const discord = fakeEmojiDiscord({ emojis: ['seed'] });

        await remove(project, discord.rest, { names: ['seed'], offer: () => Promise.resolve(true) }).done;

        expect(discord.emojis()).toEqual([]);
        expect(existsSync(join(project.dir, 'emojis/seed.png'))).toBe(false);
    });

    it("doesn't ask about files for an emoji without one", async () => {
        const project = await projectWith({});
        const discord = fakeEmojiDiscord({ emojis: ['old_logo'] });
        const offer = (): Promise<never> => Promise.reject(new Error('remove asked about files'));

        await remove(project, discord.rest, { names: ['old_logo'], offer }).done;

        expect(discord.emojis()).toEqual([]);
    });

    it('deletes the emoji and its file with --delete-file', async () => {
        const project = await projectWith({ 'reactions/seed.png': 's', 'wave.png': 'w' });
        const discord = fakeEmojiDiscord({ emojis: ['seed', 'wave'] });
        const questions: string[] = [];
        const folder = join(project.dir, 'emojis');

        const { printed, done } = remove(project, discord.rest, {
            names: ['seed'],
            deleteFile: true,
            confirm: (question) => {
                questions.push(question);
                return Promise.resolve(true);
            }
        });
        await done;

        expect(discord.emojis().map(({ name }) => name)).toEqual(['wave']);
        expect(existsSync(join(folder, 'reactions/seed.png'))).toBe(false);
        expect(existsSync(join(folder, 'wave.png'))).toBe(true);
        expect(questions).toEqual([`Delete 1 emoji from seed beta and 1 file from ${folder}?`]);
        expect(printed()).toContain(`  ${folder}  1 file\n    - reactions/seed.png\n`);
    });

    it('throws CliEmojiNameUnknown for a name that the application lacks', async () => {
        const project = await projectWith({ 'wave.png': 'w' });
        const discord = fakeEmojiDiscord({ emojis: ['seed'] });

        const { done } = remove(project, discord.rest, { names: ['wave'] });

        await expect(done).rejects.toMatchObject({ code: SeedcordErrorCode.CliEmojiNameUnknown });
    });

    it('offers every emoji on the application without names and marks the ones with a file', async () => {
        const project = await projectWith({ 'seed.png': 's' });
        const discord = fakeEmojiDiscord({ emojis: ['seed', 'old_logo'] });
        const offered: unknown[] = [];

        const { done } = remove(project, discord.rest, {
            names: [],
            pick: (choices) => {
                offered.push(...choices);
                return Promise.resolve(['old_logo']);
            }
        });
        await done;

        expect(offered).toEqual([
            { value: 'seed', label: 'seed', hint: join(project.dir, 'emojis/seed.png') },
            { value: 'old_logo', label: 'old_logo' }
        ]);
        expect(discord.emojis().map(({ name }) => name)).toEqual(['seed']);
    });

    it('keeps the file of an emoji that discord refused to delete, then throws CliSomeFailed', async () => {
        const project = await projectWith({ 'seed.png': 's' });
        const discord = fakeEmojiDiscord({ emojis: ['seed', 'test'], rejects: { seed: new Error('Missing Access') } });

        const { printed, done } = remove(project, discord.rest, { names: ['seed', 'test'], deleteFile: true });

        await expect(done).rejects.toMatchObject({ code: SeedcordErrorCode.CliSomeFailed });
        expect(existsSync(join(project.dir, 'emojis/seed.png'))).toBe(true);
        expect(discord.emojis().map(({ name }) => name)).toEqual(['seed']);
        expect(printed()).toMatch(/delete +\S+ +1 deleted, 1 failed\n/u);
        expect(printed()).toContain('Could not delete seed (Missing Access).');
    });
});
