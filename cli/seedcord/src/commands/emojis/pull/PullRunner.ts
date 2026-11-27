import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { emojiClashes, emojiFileAt } from '@seedcord/utils/internal';
import { partition } from 'es-toolkit';

import { assertNoneFailed } from '#commands/emojis/outcome';
import { EMOJI_STEPS, readEmojisOnDiscord, readFolder } from '#commands/emojis/readEmojis';
import { readBotGuilds } from '#core/discord/readBotGuilds';
import { defaultRunnerDeps } from '#core/discord/runnerDeps';

import type { UploadedEmoji } from '#commands/emojis/EmojiDiff';
import type { EmojiSession } from '#commands/emojis/EmojiSession';
import type { RunnerDeps } from '#core/discord/runnerDeps';
import type { PullPresenter } from './PullPresenter';

export const PULL_STEPS = [...EMOJI_STEPS, 'read guilds', 'download'] as const;
export type PullStep = (typeof PULL_STEPS)[number];

export interface PullOptions {
    // an empty list means pull everything
    readonly names: readonly string[];
    // if it's not set, pull asks in a terminal and skips the existing files everywhere else
    readonly force?: boolean | undefined;
    // true means pick one from the guilds that the bot is in
    readonly guild?: string | true | undefined;
}

interface Download {
    emoji: UploadedEmoji;
    to: string;
    replaces?: never;
}

// `replaces` might be a .png while `to` is a .webp
interface Overwrite extends Omit<Download, 'replaces'> {
    replaces: string;
}

export type Save = Download | Overwrite;

export interface PullPlan {
    folder: string;
    source: string;
    fresh: Download[];
    overwrites: Overwrite[];
    alreadyInFolder: number;
}

interface Planned {
    path: string;
    key: string;
    label: string;
}

// discord's names are case sensitive, and discord allows party_parrot and PartyParrot together
function assertNoClashes(planned: readonly Planned[]): void {
    throwSingleOrAggregate(
        emojiClashes(planned, {
            by: ({ path }) => path.toLowerCase(),
            kind: 'file',
            note: 'macOS and Windows save them as one file.',
            labelOf: ({ label }) => label
        }),
        SeedcordErrorCode.CliProblems
    );
}

// wave.WEBP and wave.webp are one file on macOS and Windows.
// bigint because two windows file ids over 2^53 can round to the same number
async function sameFile(first: string, second: string): Promise<boolean> {
    const [a, b] = await Promise.all([stat(first, { bigint: true }), stat(second, { bigint: true })]);
    return a.dev === b.dev && a.ino === b.ino;
}

type PullDeps = RunnerDeps & { readonly fetch: (url: string) => Promise<Response> };

export class PullRunner {
    constructor(private readonly deps: PullDeps) {}

    public static create(): PullRunner {
        return new PullRunner({ ...defaultRunnerDeps(), fetch });
    }

    public async run(presenter: PullPresenter, { names, force = false, guild }: PullOptions): Promise<void> {
        const read = await readFolder(presenter, this.deps, process.cwd());
        const guildId = guild === true ? await presenter.pickGuild(() => readBotGuilds(read.rest)) : guild;
        if (guild === true && guildId === undefined) return;
        const { folder, files, session, source, diff } = await readEmojisOnDiscord(presenter, read, guildId);

        const wanted = names.length > 0 ? diff.named(names) : diff.onDiscord();
        const inFolder = wanted.filter(({ file }) => file !== undefined).length;
        const overwrite = force || (inFolder > 0 && (await presenter.offerOverwrite(inFolder)));
        if (overwrite === undefined) return;

        const saves = wanted.flatMap(({ emoji, file }): Save[] => {
            const name = `${emoji.name}.webp`;
            if (!file) return [{ emoji, to: join(folder, name) }];
            return overwrite ? [{ emoji, to: join(dirname(file.file), name), replaces: file.file }] : [];
        });
        const replaced = new Set(saves.map(({ replaces }) => replaces));
        assertNoClashes([
            ...files.flatMap(({ file, key }) =>
                replaced.has(file) ? [] : [{ path: file, key, label: paint.path(file) }]
            ),
            ...saves.map(({ emoji, to }) => ({
                path: to,
                key: emojiFileAt(to).key,
                label: `${paint.bold(emoji.name)} on ${paint.bold(source)}`
            }))
        ]);

        const [overwrites, fresh] = partition(saves, (save) => save.replaces !== undefined);
        const plan = { folder, source, fresh, overwrites, alreadyInFolder: wanted.length - saves.length };
        if (saves.length === 0) {
            presenter.nothingToDownload(plan);
            return;
        }
        presenter.preview(plan);

        const outcome = await presenter.download(saves, (save) => this.save(session, save));
        assertNoneFailed(outcome, 'download');
    }

    private async save(session: EmojiSession, { emoji, to, replaces }: Save): Promise<void> {
        const response = await this.deps.fetch(session.imageUrl(emoji));
        if (!response.ok) throw new SeedcordError(SeedcordErrorCode.CliEmojiDownloadFailed, [response.status]);

        await mkdir(dirname(to), { recursive: true });
        // starts with a dot because the folder read skips dotfiles
        const temp = join(dirname(to), `.${basename(to)}.download`);
        const image = await response.bytes();
        try {
            await writeFile(temp, image);
            await rename(temp, to);
        } catch (error: unknown) {
            await rm(temp, { force: true });
            throw error;
        }
        if (replaces !== undefined && !(await sameFile(replaces, to))) await rm(replaces);
    }
}
