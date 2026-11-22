import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { PullPresenter } from '#commands/emojis/pull/PullPresenter';
import { PULL_STEPS, PullRunner } from '#commands/emojis/pull/PullRunner';
import { StepPrinter } from '#core/output/StepPrinter';
import { fakeEmojiDiscord, GUILD_ID, projectWith } from '#tests/commands/emojis/fakeEmojiDiscord';
import { fakeTerminal } from '#tests/fakeTerminal';

import type { PullOptions } from '#commands/emojis/pull/PullRunner';
import type { Confirm } from '#core/output/confirm';
import type { FakeProject } from '#tests/commands/commands/fakeBot';
import type { REST } from '@discordjs/rest';

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

// only --force over existing files is allowed to ask
const neverAsked: Confirm = () => Promise.reject(new Error('pull asked a question'));

function pull(
    project: FakeProject,
    rest: REST,
    options: PullOptions,
    { cdn = fakeCdn(), confirm = neverAsked } = {}
): Pulled {
    const stdout = fakeTerminal();
    const printer = new StepPrinter({ command: 'emojis', labels: PULL_STEPS, verbose: false, stdout, stderr: stdout });
    const runner = new PullRunner({ projectLoader: project, openDiscord: () => rest, fetch: cdn });
    return { printed: stdout.text, done: runner.run(new PullPresenter(printer, confirm), options) };
}

function saved(project: FakeProject, path: string): Promise<string> {
    return readFile(join(project.dir, 'emojis', path), 'utf8');
}

describe('emojis PullRunner', () => {
    it('downloads the emojis that the folder is missing as webp files', async () => {
        const project = await projectWith({ 'seed.png': 's' });
        const { rest } = fakeEmojiDiscord({ emojis: ['seed', 'old_logo', 'test'] });

        const { printed, done } = pull(project, rest, { names: [] });
        await done;

        expect(await saved(project, 'old_logo.webp')).toBe('old_logo-id');
        expect(await saved(project, 'test.webp')).toBe('test-id');
        expect(await saved(project, 'seed.png')).toBe('s');
        expect(printed()).toContain(
            [
                `  ${join(project.dir, 'emojis')}  2 downloads`,
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

    it('points at --force when the folder already has everything', async () => {
        const project = await projectWith({ 'seed.png': 's' });
        const { rest } = fakeEmojiDiscord({ emojis: ['seed'] });

        const { printed, done } = pull(project, rest, { names: [] });
        await done;

        expect(printed()).toContain('Nothing to download.');
        expect(printed()).toContain('Pass --force to download them again.');
    });

    it('asks before --force downloads over a file, then keeps one file per name', async () => {
        const project = await projectWith({ 'reactions/seed.png': 's' });
        const { rest } = fakeEmojiDiscord({ emojis: ['seed', 'old_logo'] });
        const questions: string[] = [];

        const { printed, done } = pull(
            project,
            rest,
            { names: [], force: true },
            {
                confirm: (question) => {
                    questions.push(question);
                    return Promise.resolve(true);
                }
            }
        );
        await done;

        expect(questions).toEqual([`Overwrite 1 file in ${join(project.dir, 'emojis')} with what's on seed beta?`]);
        expect(await saved(project, 'reactions/seed.webp')).toBe('seed-id');
        expect(existsSync(join(project.dir, 'emojis/reactions/seed.png'))).toBe(false);
        expect(printed()).toContain('    ~ reactions/seed.webp\n');
    });

    it("doesn't download anything when the answer to --force is no", async () => {
        const project = await projectWith({ 'seed.png': 'mine' });
        const { rest } = fakeEmojiDiscord({ emojis: ['seed', 'old_logo'] });

        const { printed, done } = pull(
            project,
            rest,
            { names: [], force: true },
            { confirm: () => Promise.resolve(false) }
        );
        await done;

        expect(await saved(project, 'seed.png')).toBe('mine');
        expect(existsSync(join(project.dir, 'emojis/old_logo.webp'))).toBe(false);
        expect(printed()).toContain('Nothing downloaded.');
    });

    it("doesn't ask for --force when every download is a new file", async () => {
        const project = await projectWith({});
        const { rest } = fakeEmojiDiscord({ emojis: ['seed'] });

        await pull(project, rest, { names: [], force: true }).done;

        expect(await saved(project, 'seed.webp')).toBe('seed-id');
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

    it('throws CliEmojiNameUnknown for a name that discord lacks', async () => {
        const project = await projectWith({});
        const { rest } = fakeEmojiDiscord({ emojis: ['seed'] });

        const { done } = pull(project, rest, { names: ['wave'] });

        await expect(done).rejects.toMatchObject({ code: SeedcordErrorCode.CliEmojiNameUnknown });
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
