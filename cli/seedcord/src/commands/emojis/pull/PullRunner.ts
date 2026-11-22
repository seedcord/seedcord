import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { emojiFileAt, usableEmojiFiles } from '@seedcord/utils/internal';
import { partition } from 'es-toolkit';

import { namedOnDiscord, onDiscord } from '#commands/emojis/emojiDiff';
import { assertNoneFailed } from '#commands/emojis/outcome';
import { EMOJI_STEPS, readDiscord, readFolder } from '#commands/emojis/readEmojis';
import { readBotGuilds } from '#core/discord/readBotGuilds';
import { defaultRunnerDeps } from '#core/discord/runnerDeps';

import type { UploadedEmoji } from '#commands/emojis/emojiDiff';
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
        const { folder, files, session, source, diff } = await readDiscord(presenter, read, guildId);

        const wanted = names.length > 0 ? namedOnDiscord(diff, names, source) : onDiscord(diff);
        const inFolder = wanted.filter(({ file }) => file !== undefined).length;
        const overwrite = force || (inFolder > 0 && (await presenter.offerOverwrite(inFolder)));
        if (overwrite === undefined) return;

        const saves = wanted.flatMap(({ emoji, file }): Save[] => {
            const name = `${emoji.name}.webp`;
            if (!file) return [{ emoji, to: join(folder, name) }];
            return overwrite ? [{ emoji, to: join(dirname(file.file), name), replaces: file.file }] : [];
        });
        // discord allows party_parrot and PartyParrot together, and both would be Emojis.PartyParrot
        const replaced = new Set(saves.map(({ replaces }) => replaces));
        usableEmojiFiles([
            ...files.filter(({ file }) => !replaced.has(file)),
            ...saves.map(({ to }) => emojiFileAt(to))
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
        await writeFile(to, await response.bytes());
        if (replaces !== undefined && replaces !== to) await rm(replaces);
    }
}
