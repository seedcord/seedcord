import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { partition } from 'es-toolkit';

import { namedOnDiscord, onDiscord } from '#commands/emojis/emojiDiff';
import { assertNoneFailed } from '#commands/emojis/outcome';
import { EMOJI_STEPS, readEmojis } from '#commands/emojis/readEmojis';
import { defaultRunnerDeps } from '#core/discord/runnerDeps';

import type { UploadedEmoji } from '#commands/emojis/emojiDiff';
import type { EmojiSession } from '#commands/emojis/EmojiSession';
import type { RunnerDeps } from '#core/discord/runnerDeps';
import type { PullPresenter } from './PullPresenter';

export const PULL_STEPS = [...EMOJI_STEPS, 'download'] as const;
export type PullStep = (typeof PULL_STEPS)[number];

export interface PullOptions {
    // an empty list means pull everything
    readonly names: readonly string[];
    readonly force?: boolean | undefined;
    readonly guild?: string | undefined;
}

export interface Save {
    emoji: UploadedEmoji;
    to: string;
    // the existing file that --force overwrites. it might be a .png while `to` is a .webp
    replaces?: string;
}

export interface PullPlan {
    folder: string;
    source: string;
    fresh: Save[];
    // the ones that download over a file
    over: Save[];
    alreadyInFolder: number;
}

type PullDeps = RunnerDeps & { readonly fetch: (url: string) => Promise<Response> };

export class PullRunner {
    constructor(private readonly deps: PullDeps) {}

    public static create(): PullRunner {
        return new PullRunner({ ...defaultRunnerDeps(), fetch });
    }

    public async run(presenter: PullPresenter, { names, force = false, guild }: PullOptions): Promise<void> {
        const { folder, session, source, diff } = await readEmojis(presenter, this.deps, process.cwd(), guild);

        const wanted = names.length > 0 ? namedOnDiscord(diff, names, source) : onDiscord(diff);
        const saves = wanted.flatMap(({ emoji, file }): Save[] => {
            const name = `${emoji.name}.webp`;
            if (!file) return [{ emoji, to: join(folder, name) }];
            return force ? [{ emoji, to: join(dirname(file.file), name), replaces: file.file }] : [];
        });

        const [over, fresh] = partition(saves, ({ replaces }) => replaces !== undefined);
        const plan = { folder, source, fresh, over, alreadyInFolder: wanted.length - saves.length };
        if (saves.length === 0) {
            presenter.nothingToDownload(plan);
            return;
        }
        presenter.preview(plan);
        if (over.length > 0 && !(await presenter.approveOverwrite(plan))) return;

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
