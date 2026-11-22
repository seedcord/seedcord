import { stat } from 'node:fs/promises';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { discordErrorOf, errorReason } from '@seedcord/utils/internal';
import { RESTJSONErrorCodes } from 'discord-api-types/v10';
import { partition } from 'es-toolkit';

import { assertNoneFailed } from '#commands/emojis/outcome';
import { EMOJI_STEPS, readEmojis } from '#commands/emojis/readEmojis';
import { defaultRunnerDeps } from '#core/discord/runnerDeps';
import { unknownName } from '#src/commands/emojis/EmojiDiff';

import type { RunnerDeps } from '#core/discord/runnerDeps';
import type { UploadedEmoji, UploadedFile } from '#src/commands/emojis/EmojiDiff';
import type { PushPresenter } from './PushPresenter';
import type { DiscordErrorFields, EmojiFile } from '@seedcord/utils/internal';

export const PUSH_STEPS = [...EMOJI_STEPS, 'upload'] as const;
export type PushStep = (typeof PUSH_STEPS)[number];

export interface PushOptions {
    // true means open the picker
    readonly replace?: readonly string[] | true | undefined;
}

export interface PushPlan {
    folder: string;
    source: string;
    add: EmojiFile[];
    replace: UploadedFile[];
    keep: UploadedFile[];
    onlyOnDiscord: UploadedEmoji[];
}

// an UploadedFile replaces the emoji it comes with
export type Upload = UploadedFile | { file: EmojiFile; emoji?: never };

// 2048 KiB. discord's own error reads "File cannot be larger than 2048.0 kb"
const MAX_UPLOAD_BYTES = 2_097_152;

const REJECTIONS: Partial<Record<DiscordErrorFields['code'], string>> = {
    [RESTJSONErrorCodes.InvalidFileUploaded]: "Discord can't read it as an image",
    [RESTJSONErrorCodes.FailedToResizeAssetBelowTheMaximumSize]:
        'it is still over 256 KiB after Discord resized it to 128px'
};

function rejectionOf(error: unknown): string {
    const code = discordErrorOf(error)?.code;
    return (code === undefined ? undefined : REJECTIONS[code]) ?? errorReason(error);
}

async function assertUploadable(files: readonly EmojiFile[]): Promise<void> {
    const sized = await Promise.all(
        files.map(async ({ file }) => {
            const { size } = await stat(file);
            return { file, size };
        })
    );
    throwSingleOrAggregate(
        sized
            .filter(({ size }) => size > MAX_UPLOAD_BYTES)
            .map(({ file }) => new SeedcordRangeError(SeedcordErrorCode.ConfigEmojiFileUnusable, [file, 'size'])),
        SeedcordErrorCode.ConfigEmojiFolderInvalid
    );
}

export class PushRunner {
    constructor(private readonly deps: RunnerDeps) {}

    public static create(): PushRunner {
        return new PushRunner(defaultRunnerDeps());
    }

    public async run(presenter: PushPresenter, { replace = [] }: PushOptions): Promise<void> {
        const { folder, target, session, source, files, diff } = await readEmojis(presenter, this.deps, process.cwd());

        const names = replace === true ? await presenter.pickReplacements(diff.uploaded) : replace;
        if (names === undefined) return;
        const unknown = names.find((name) => !files.some((file) => file.name === name));
        if (unknown !== undefined) {
            unknownName(unknown, paint.path(folder), 'Pass the name of a file in that folder, without its extension.');
        }

        const [replacing, keep] = partition(diff.uploaded, ({ file }) => names.includes(file.name));
        const { missing: add, onlyOnDiscord } = diff;
        const plan = { folder, source, add, replace: replacing, keep, onlyOnDiscord };
        const uploads: Upload[] = [...plan.add.map((file) => ({ file })), ...plan.replace];
        if (uploads.length === 0) {
            presenter.nothingToUpload(plan);
            return;
        }
        await assertUploadable(uploads.map(({ file }) => file));

        presenter.preview(plan);
        if (!(await presenter.approve(plan))) return;

        const outcome = await presenter.upload(
            uploads,
            (upload) => (upload.emoji ? session.replace(upload) : session.upload(upload.file)),
            rejectionOf
        );
        if (target === 'edge' && outcome.done.length > 0) presenter.edgeHint();
        assertNoneFailed(outcome, 'upload');
    }
}
