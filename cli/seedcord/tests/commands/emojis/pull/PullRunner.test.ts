import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { PullPresenter } from '#commands/emojis/pull/PullPresenter';
import { PULL_STEPS, PullRunner } from '#commands/emojis/pull/PullRunner';
import { StepPrinter } from '#core/output/StepPrinter';
import { fakeEmojiDiscord, GUILD_ID, printedPath, projectWith } from '#tests/commands/emojis/fakeEmojiDiscord';
import { fakeTerminal } from '#tests/fakeTerminal';

import type { EmojiPrompts } from '#commands/emojis/prompts';
import type { PullOptions } from '#commands/emojis/pull/PullRunner';
import type { FakeProject } from '#tests/commands/commands/fakeBot';
import type { REST } from '@discordjs/rest';

interface PullSetup extends Partial<Pick<EmojiPrompts, 'offer' | 'pickGuild'>> {
    cdn?: (url: string) => Promise<Response>;
}

interface Pulled {
    printed: () => string;
    done: Promise<void>;
}

const NOT_FOUND = 404;

// returns the emoji's id as its image, or a 404 if the id is in `missing`
function fakeCdn(missing: readonly string[] = []): (url: string) => Promise<Response> {
    return (url) => {
        const id = /emojis\/(?<id>[^.]+)\.webp\?animated=true&quality=lossless$/u.exec(url)?.groups?.id ?? '';
        return Promise.resolve(missing.includes(id) ? new Response(null, { status: NOT_FOUND }) : new Response(id));
    };
}

// pull only asks when the folder already has some of the emojis
const neverAsked = (): Promise<never> => Promise.reject(new Error('pull asked a question'));

function pull(
    project: FakeProject,
    rest: REST,
    options: PullOptions,
    { cdn = fakeCdn(), offer = neverAsked, pickGuild = neverAsked }: PullSetup = {}
): Pulled {
    const stdout = fakeTerminal();
    const printer = new StepPrinter({ command: 'emojis', labels: PULL_STEPS, verbose: false, stdout, stderr: stdout });
    const runner = new PullRunner({ projectLoader: project, openDiscord: () => rest, fetch: cdn });
    return { printed: stdout.text, done: runner.run(new PullPresenter(printer, { offer, pickGuild }), options) };
}

function saved(project: FakeProject, path: string): Promise<string> {
    return readFile(join(project.dir, 'emojis', path), 'utf8');
}

describe('emojis PullRunner', () => {
    it('downloads the emojis that the folder is missing as webp files', async () => {
        const project = await projectWith({ 'seed.png': 's' });
        const { rest } = fakeEmojiDiscord({ emojis: ['seed', 'old_logo', 'test'] });

        const { printed, done } = pull(project, rest, { names: [] }, { offer: () => Promise.resolve(false) });
        await done;

        expect(await saved(project, 'old_logo.webp')).toBe('old_logo-id');
        expect(await saved(project, 'test.webp')).toBe('test-id');
        expect(await saved(project, 'seed.png')).toBe('s');
        expect(printed()).toContain(
            [
                `  ${printedPath(project)}  2 downloads`,
                '    + old_logo.webp test.webp',
                '      1 already in the folder'
            ].join('\n')
        );
        expect(printed()).toMatch(/download +\S+ +2 downloaded\n/u);
    });

    it("creates the folder when the project doesn't have one", async () => {
        const project = await projectWith({});
        const { rest } = fakeEmojiDiscord({ emojis: ['seed'] });

        await pull(project, rest, { names: [] }).done;

        expect(await saved(project, 'seed.webp')).toBe('seed-id');
    });

    it('downloads only the named emojis', async () => {
        const project = await projectWith({});
        const { rest } = fakeEmojiDiscord({ emojis: ['seed', 'old_logo'] });

        await pull(project, rest, { names: ['seed'] }).done;

        expect(existsSync(join(project.dir, 'emojis/old_logo.webp'))).toBe(false);
        expect(await saved(project, 'seed.webp')).toBe('seed-id');
    });

    it('asks whether to overwrite the ones it already has, and keeps them on a no', async () => {
        const project = await projectWith({ 'seed.png': 'mine', 'wave.png': 'mine' });
        const { rest } = fakeEmojiDiscord({ emojis: ['seed', 'wave', 'old_logo'] });
        const offers: string[] = [];

        const { done } = pull(
            project,
            rest,
            { names: [] },
            {
                offer: (question) => {
                    offers.push(question);
                    return Promise.resolve(false);
                }
            }
        );
        await done;

        expect(offers).toEqual(['Overwrite the 2 you already have?']);
        expect(await saved(project, 'seed.png')).toBe('mine');
        expect(await saved(project, 'old_logo.webp')).toBe('old_logo-id');
    });

    it('downloads over a file after a yes and keeps one file per name', async () => {
        const project = await projectWith({ 'reactions/seed.png': 's' });
        const { rest } = fakeEmojiDiscord({ emojis: ['seed'] });

        const { printed, done } = pull(project, rest, { names: [] }, { offer: () => Promise.resolve(true) });
        await done;

        expect(await saved(project, 'reactions/seed.webp')).toBe('seed-id');
        expect(existsSync(join(project.dir, 'emojis/reactions/seed.png'))).toBe(false);
        expect(printed()).toContain('    ~ reactions/seed.webp\n');
    });

    it('keeps the download when the old file differs from it only in the case of its extension', async () => {
        const project = await projectWith({ 'wave.WEBP': 'mine' });
        const { rest } = fakeEmojiDiscord({ emojis: ['wave'] });

        await pull(project, rest, { names: [], force: true }).done;

        expect(await saved(project, 'wave.webp')).toBe('wave-id');
    });

    it('keeps the old file when the new one fails to write', async () => {
        const project = await projectWith({ 'seed.png': 'mine' });
        // pull can't write seed.webp while a folder has that name
        await mkdir(join(project.dir, 'emojis/seed.webp'));
        const { rest } = fakeEmojiDiscord({ emojis: ['seed'] });

        const { done } = pull(project, rest, { names: [], force: true });

        await expect(done).rejects.toMatchObject({ code: SeedcordErrorCode.CliSomeFailed });
        expect(await saved(project, 'seed.png')).toBe('mine');
    });

    it('overwrites without asking with --force', async () => {
        const project = await projectWith({ 'seed.png': 'mine' });
        const { rest } = fakeEmojiDiscord({ emojis: ['seed'] });

        await pull(project, rest, { names: [], force: true }).done;

        expect(await saved(project, 'seed.webp')).toBe('seed-id');
    });

    it('lists the guilds that the bot is in for a bare --guild and pulls from the picked one', async () => {
        const project = await projectWith({});
        const { rest } = fakeEmojiDiscord({ emojis: ['seed'], guildEmojis: ['blob'] });
        const offered: unknown[] = [];

        const { printed, done } = pull(
            project,
            rest,
            { names: [], guild: true },
            {
                pickGuild: (choices) => {
                    offered.push(...choices);
                    return Promise.resolve(GUILD_ID);
                }
            }
        );
        await done;

        expect(offered).toEqual([{ value: GUILD_ID, label: 'Alpha', hint: GUILD_ID }]);
        expect(await saved(project, 'blob.webp')).toBe('blob-guild-id');
        expect(printed()).toMatch(/read guilds +\S+ +1 guild\n/u);
    });

    it("downloads a guild's emojis with --guild", async () => {
        const project = await projectWith({});
        const { rest } = fakeEmojiDiscord({ emojis: ['seed'], guildEmojis: ['blob'] });

        const { printed, done } = pull(project, rest, { names: [], guild: GUILD_ID });
        await done;

        expect(await saved(project, 'blob.webp')).toBe('blob-guild-id');
        expect(existsSync(join(project.dir, 'emojis/seed.webp'))).toBe(false);
        expect(printed()).toMatch(/read discord +\S+ +1 emoji on guild 111\n/u);
    });

    it('downloads an emoji whose name starts with a digit', async () => {
        const project = await projectWith({});
        const { rest } = fakeEmojiDiscord({ emojis: ['1up'] });

        await pull(project, rest, { names: [] }).done;

        expect(await saved(project, '1up.webp')).toBe('1up-id');
    });

    it.for<{ why: string; files: Record<string, string>; emojis: string[]; shown: string[] }>([
        {
            why: 'two downloads would share a key',
            files: {},
            emojis: ['party_parrot', 'PartyParrot'],
            shown: ['party_parrot on seed beta', 'PartyParrot on seed beta', 'PartyParrot']
        },
        {
            why: 'a download would share a key with a file',
            files: { 'party_parrot.png': 'p' },
            emojis: ['PartyParrot'],
            shown: ['party_parrot.png', 'PartyParrot on seed beta', 'PartyParrot']
        },
        {
            why: 'two downloads differ only in case',
            files: {},
            emojis: ['wave', 'WaVe'],
            shown: ['wave on seed beta', 'WaVe on seed beta', 'macOS and Windows']
        },
        {
            why: 'a download differs from a file only in case',
            files: { 'wave.webp': 'mine' },
            emojis: ['WAVE'],
            shown: ['wave.webp', 'WAVE on seed beta', 'macOS and Windows']
        }
    ])('stops before any download when $why', async ({ files, emojis, shown }) => {
        const project = await projectWith(files);
        const { rest } = fakeEmojiDiscord({ emojis: [...emojis, 'seed'] });

        const { done } = pull(project, rest, { names: [] });

        const inOrder = new RegExp(shown.map((part) => RegExp.escape(part)).join('.*'), 's');
        await expect(done).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreDuplicateName,
            message: expect.stringMatching(inOrder) as string
        });
        expect(existsSync(join(project.dir, 'emojis/seed.webp'))).toBe(false);
    });

    it.for([
        { from: 'the application', guild: undefined, opens: "seed beta doesn't have" },
        { from: 'a guild', guild: GUILD_ID, opens: "Guild 111 doesn't have" }
    ])('throws CliEmojiNameUnknown for a name that $from lacks', async ({ guild, opens }) => {
        const project = await projectWith({});
        const { rest } = fakeEmojiDiscord({ emojis: ['seed'], guildEmojis: ['blob'] });

        const { done } = pull(project, rest, { names: ['wave'], guild });

        await expect(done).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEmojiNameUnknown,
            message: expect.stringContaining(opens) as string
        });
    });

    it('saves the others when one download fails, then throws CliSomeFailed', async () => {
        const project = await projectWith({});
        const { rest } = fakeEmojiDiscord({ emojis: ['seed', 'old_logo'] });

        const { printed, done } = pull(project, rest, { names: [] }, { cdn: fakeCdn(['seed-id']) });

        await expect(done).rejects.toMatchObject({ code: SeedcordErrorCode.CliSomeFailed });
        expect(existsSync(join(project.dir, 'emojis/seed.webp'))).toBe(false);
        expect(await saved(project, 'old_logo.webp')).toBe('old_logo-id');
        expect(printed()).toContain("Could not download seed (Discord's CDN answered 404).");
    });
});
