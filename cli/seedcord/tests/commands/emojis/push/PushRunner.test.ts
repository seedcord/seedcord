import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { RESTJSONErrorCodes } from 'discord-api-types/v10';
import { describe, expect, it } from 'vite-plus/test';

import { PushPresenter } from '#commands/emojis/push/PushPresenter';
import { PUSH_STEPS, PushRunner } from '#commands/emojis/push/PushRunner';
import { PROCEED } from '#core/output/confirm';
import { StepPrinter } from '#core/output/StepPrinter';
import { discordError, fakeEmojiDiscord, projectWith } from '#tests/commands/emojis/fakeEmojiDiscord';
import { fakeTerminal } from '#tests/fakeTerminal';

import type { EmojiPrompts } from '#commands/emojis/prompts';
import type { PushOptions } from '#commands/emojis/push/PushRunner';
import type { FakeProject } from '#tests/commands/commands/fakeBot';
import type { REST } from '@discordjs/rest';

interface PushSetup extends PushOptions, Partial<EmojiPrompts> {
    verbose?: boolean;
}

interface Pushed {
    printed: () => string;
    done: Promise<void>;
}

// printed() still works after done rejects
function push(
    project: FakeProject,
    rest: REST,
    { verbose = false, confirm = PROCEED, pick = () => Promise.resolve([]), ...options }: PushSetup = {}
): Pushed {
    const stdout = fakeTerminal();
    const printer = new StepPrinter({ command: 'emojis', labels: PUSH_STEPS, verbose, stdout, stderr: stdout });
    const presenter = new PushPresenter(printer, { confirm, pick }, verbose);
    const runner = new PushRunner({ projectLoader: project, openDiscord: () => rest });
    return { printed: stdout.text, done: runner.run(presenter, options) };
}

const TWO_MEBIBYTES = 2048 * 1024;

describe('PushRunner', () => {
    it('uploads only the files that the application is missing', async () => {
        const project = await projectWith({
            'wave.png': 'wave',
            'reactions/party_parrot.gif': 'parrot',
            'seed.png': 's'
        });
        const discord = fakeEmojiDiscord({ emojis: ['seed', 'old_logo'] });

        const { printed, done } = push(project, discord.rest);
        await done;

        expect(discord.requests.filter((request) => request.startsWith('POST'))).toEqual([
            'POST party_parrot',
            'POST wave'
        ]);
        expect(discord.emojis().find(({ name }) => name === 'wave')?.image).toBe(
            `data:image/png;base64,${Buffer.from('wave').toString('base64')}`
        );
        expect(printed()).toContain(
            [
                `  ${join(project.dir, 'emojis')}  3 emojis`,
                '    + party_parrot wave',
                '      1 already uploaded',
                '',
                '  only on Discord  1 emoji, kept',
                '      old_logo'
            ].join('\n')
        );
        expect(printed()).toMatch(/read discord +\S+ +2 emojis on seed beta\n/u);
        expect(printed()).toMatch(/upload +\S+ +2 uploaded\n/u);
    });

    it('lists the emojis it keeps under --verbose', async () => {
        const project = await projectWith({ 'wave.png': 'wave', 'seed.png': 's' });

        const { printed, done } = push(project, fakeEmojiDiscord({ emojis: ['seed'] }).rest, { verbose: true });
        await done;

        expect(printed()).toContain('    + wave\n      seed\n');
    });

    it('skips the question when the application already has every file', async () => {
        const project = await projectWith({ 'seed.png': 's' });
        const discord = fakeEmojiDiscord({ emojis: ['seed'] });
        const confirm = (): Promise<never> => Promise.reject(new Error('push asked a question'));

        const { printed, done } = push(project, discord.rest, { confirm });
        await done;

        expect(printed()).toContain(
            `Nothing to upload. seed beta has all 1 emoji from ${join(project.dir, 'emojis')}.`
        );
        expect(printed()).toContain('Changed an image? seedcord emojis push --replace <name> uploads it again.');
        expect(discord.requests.filter((request) => !request.startsWith('GET'))).toEqual([]);
    });

    it('prints the replace hint under a preview only when nothing is being replaced', async () => {
        const project = await projectWith({ 'wave.png': 'wave', 'seed.png': 's' });
        const hint = 'Changed an image?';

        const added = push(project, fakeEmojiDiscord({ emojis: ['seed'] }).rest);
        await added.done;
        const replaced = push(project, fakeEmojiDiscord({ emojis: ['seed', 'wave'] }).rest, { replace: ['wave'] });
        await replaced.done;

        expect(added.printed()).toContain(hint);
        expect(replaced.printed()).not.toContain(hint);
    });

    it("doesn't upload when the answer is no", async () => {
        const project = await projectWith({ 'wave.png': 'wave' });
        const discord = fakeEmojiDiscord();
        const questions: string[] = [];

        const { printed, done } = push(project, discord.rest, {
            confirm: (question) => {
                questions.push(question);
                return Promise.resolve(false);
            }
        });
        await done;

        expect(questions).toEqual(['Upload 1 emoji to seed beta?']);
        expect(discord.emojis()).toEqual([]);
        expect(printed()).toContain('Nothing uploaded.');
    });

    it('replaces an emoji with the file under the same name and deletes the old one', async () => {
        const project = await projectWith({ 'wave.png': 'new wave', 'seed.png': 's' });
        const discord = fakeEmojiDiscord({ emojis: ['wave', 'seed'] });

        const { printed, done } = push(project, discord.rest, { replace: ['wave'] });
        await done;

        expect(discord.requests.filter((request) => !request.startsWith('GET'))).toEqual([
            'PATCH wave to sc_wave-id',
            'POST wave',
            'DELETE sc_wave-id'
        ]);
        expect(discord.emojis().map(({ id, name }) => `${name} ${id}`)).toEqual(['seed seed-id', 'wave new-1']);
        expect(printed()).toContain('    ~ wave\n      1 already uploaded\n');
        expect(printed()).toMatch(/upload +\S+ +1 replaced\n/u);
    });

    it('gives the old emoji its name back when the new upload fails', async () => {
        const project = await projectWith({ 'wave.png': 'new wave' });
        const discord = fakeEmojiDiscord({
            emojis: ['wave'],
            rejects: { wave: discordError(RESTJSONErrorCodes.InvalidFileUploaded, 'Invalid Asset') }
        });

        const { printed, done } = push(project, discord.rest, { replace: ['wave'] });

        await expect(done).rejects.toMatchObject({ code: SeedcordErrorCode.CliSomeFailed });
        expect(discord.emojis().map(({ id, name }) => `${name} ${id}`)).toEqual(['wave wave-id']);
        expect(printed()).toContain(
            `Could not upload ${join(project.dir, 'emojis/wave.png')} (Discord can't read it as an image).`
        );
    });

    it('uploads the other files when discord rejects one, then throws CliSomeFailed', async () => {
        const project = await projectWith({ 'boom.gif': 'boom', 'wave.png': 'wave' });
        const discord = fakeEmojiDiscord({
            rejects: {
                boom: discordError(
                    RESTJSONErrorCodes.FailedToResizeAssetBelowTheMaximumSize,
                    'Failed to resize asset below the maximum size: 262144'
                )
            }
        });

        const { printed, done } = push(project, discord.rest);

        await expect(done).rejects.toMatchObject({ code: SeedcordErrorCode.CliSomeFailed });
        expect(discord.emojis().map(({ name }) => name)).toEqual(['wave']);
        expect(printed()).toMatch(/upload +\S+ +1 uploaded, 1 failed\n/u);
        expect(printed()).toContain('(it is still over 256 KiB after Discord resized it to 128px).');
    });

    it('throws for a file over 2048 KiB before it uploads anything', async () => {
        const project = await projectWith({ 'huge.png': new Uint8Array(TWO_MEBIBYTES + 1), 'wave.png': 'wave' });
        const discord = fakeEmojiDiscord();

        const { done } = push(project, discord.rest);

        await expect(done).rejects.toMatchObject({ code: SeedcordErrorCode.ConfigEmojiFileUnusable });
        expect(discord.emojis()).toEqual([]);
    });

    it('throws CliEmojiNameUnknown for a --replace name without a file', async () => {
        const project = await projectWith({ 'wave.png': 'wave' });
        const discord = fakeEmojiDiscord({ emojis: ['wave', 'old_logo'] });

        const { done } = push(project, discord.rest, { replace: ['old_logo'] });

        await expect(done).rejects.toMatchObject({ code: SeedcordErrorCode.CliEmojiNameUnknown });
        expect(discord.requests.filter((request) => !request.startsWith('GET'))).toEqual([]);
    });

    it('offers the uploaded emojis for a bare --replace and replaces the picked ones', async () => {
        const project = await projectWith({ 'wave.png': 'new wave', 'seed.png': 's', 'fresh.png': 'f' });
        const discord = fakeEmojiDiscord({ emojis: ['wave', 'seed'] });
        const offered: string[][] = [];
        const questions: string[] = [];

        const { done } = push(project, discord.rest, {
            replace: true,
            pick: (choices) => {
                offered.push(choices.map(({ value }) => value));
                return Promise.resolve(['seed']);
            },
            confirm: (question) => {
                questions.push(question);
                return Promise.resolve(true);
            }
        });
        await done;

        expect(offered).toEqual([['seed', 'wave']]);
        expect(questions).toEqual(['Upload 1 emoji to seed beta and replace 1? It gets a new id.']);
        expect(discord.emojis().map(({ id, name }) => `${name} ${id}`)).toEqual([
            'wave wave-id',
            'fresh new-1',
            'seed new-2'
        ]);
    });

    it('tells an edge bot to rebuild after an upload', async () => {
        const project = await projectWith({ 'wave.png': 'wave' }, true);

        const { printed, done } = push(project, fakeEmojiDiscord().rest);
        await done;

        expect(printed()).toContain("Your edge worker doesn't have ids for the emojis that this push uploaded.");
    });
});
