import { stat } from 'node:fs/promises';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { discordErrorOf, errorReason, readEmojiFolder } from '@seedcord/utils/internal';
import { RESTJSONErrorCodes } from 'discord-api-types/v10';

import { diffEmojis } from '#commands/emojis/emojiDiff';
import { EmojiSession } from '#commands/emojis/EmojiSession';
import { defaultRunnerDeps } from '#core/discord/runnerDeps';
import { BOT_STEPS, loadBot } from '#core/modules/loadBot';

import type { EmojiDiff, UploadedEmoji, UploadedFile } from '#commands/emojis/emojiDiff';
import type { RunnerDeps } from '#core/discord/runnerDeps';
import type { PushPresenter } from './PushPresenter';
import type { EmojiFile } from '@seedcord/utils/internal';

export const PUSH_STEPS = [...BOT_STEPS, 'read folder', 'read discord', 'upload'] as const;
export type PushStep = (typeof PUSH_STEPS)[number];

export interface PushOptions {
    // true opens the picker
    readonly replace?: readonly string[] | true | undefined;
}

export interface PushPlan {
    folder: string;
    app: string;
    add: EmojiFile[];
    replace: UploadedFile[];
    keep: UploadedFile[];
    onlyOnDiscord: UploadedEmoji[];
}

type PlanSource = Pick<PushPlan, 'folder' | 'app'> & { diff: EmojiDiff; replacing: ReadonlySet<string> };

interface UploadFailure {
    file: string;
    reason: string;
}

export interface PushResult {
    added: number;
    replaced: number;
    failed: UploadFailure[];
}

// 2048 KiB. discord's own error reads "File cannot be larger than 2048.0 kb"
const MAX_UPLOAD_BYTES = 2_097_152;

const REJECTIONS: Partial<Record<number | string, string>> = {
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
            .map(({ file }) => new SeedcordTypeError(SeedcordErrorCode.ConfigEmojiFileUnusable, [file, 'size'])),
        SeedcordErrorCode.ConfigEmojiUnresolved
    );
}

function planOf({ folder, app, diff, replacing }: PlanSource): PushPlan {
    const { missing, uploaded, onlyOnDiscord } = diff;
    const plan: PushPlan = { folder, app, add: missing, replace: [], keep: [], onlyOnDiscord };
    for (const pair of uploaded) (replacing.has(pair.file.name) ? plan.replace : plan.keep).push(pair);
    return plan;
}

export class PushRunner {
    constructor(private readonly deps: RunnerDeps) {}

    public static create(): PushRunner {
        return new PushRunner(defaultRunnerDeps());
    }

    public async run(presenter: PushPresenter, { replace = [] }: PushOptions): Promise<void> {
        const { config, instance } = await loadBot(presenter, this.deps.projectLoader, process.cwd());
        const folder = config.emojis.dir;

        const files = await presenter.readFolder(() => readEmojiFolder(folder));
        const { session, onDiscord } = await presenter.readDiscord(async () => {
            const session = await EmojiSession.open(this.deps.openDiscord(instance));
            return { session, onDiscord: await session.list() };
        });
        const diff = diffEmojis(files, onDiscord);

        const names = replace === true ? await presenter.pickReplacements(diff.uploaded) : replace;
        if (names === undefined) return;
        const unknown = names.find((name) => !files.some((file) => file.name === name));
        if (unknown !== undefined) {
            throw new SeedcordTypeError(SeedcordErrorCode.CliEmojiNotInFolder, [unknown, folder]);
        }

        const plan = planOf({ folder, app: session.app.name, diff, replacing: new Set(names) });
        const sending = [...plan.add, ...plan.replace.map(({ file }) => file)];
        if (sending.length === 0) {
            presenter.nothingToUpload(plan);
            return;
        }
        await assertUploadable(sending);

        presenter.preview(plan);
        if (!(await presenter.approve(plan))) return;

        const result = await presenter.upload(() => this.send(session, plan));
        presenter.result(result, config.target.kind === 'edge');
        if (result.failed.length > 0) throw new SeedcordError(SeedcordErrorCode.CliSomeFailed, ['emojis', 'uploaded']);
    }

    private async send(session: EmojiSession, { add, replace }: PushPlan): Promise<PushResult> {
        const result: PushResult = { added: 0, replaced: 0, failed: [] };
        const uploads = [
            ...add.map((file) => ({ file, counted: 'added' as const, send: () => session.upload(file) })),
            ...replace.map((pair) => ({
                file: pair.file,
                counted: 'replaced' as const,
                send: () => session.replace(pair)
            }))
        ];
        for (const { file, counted, send } of uploads) {
            try {
                await send();
                result[counted]++;
            } catch (error: unknown) {
                result.failed.push({ file: file.file, reason: rejectionOf(error) });
            }
        }
        return result;
    }
}
