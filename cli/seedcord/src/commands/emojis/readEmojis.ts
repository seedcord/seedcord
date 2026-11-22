import { paint } from '@seedcord/errors';
import { readEmojiFolder } from '@seedcord/utils/internal';

import { plural } from '#core/format';
import { BOT_STEPS, loadBot } from '#core/modules/loadBot';

import { EmojiDiff } from './EmojiDiff';
import { EmojiSession } from './EmojiSession';

import type { ResolvedTarget } from '#core/config/schema';
import type { DiscordRest, RunnerDeps } from '#core/discord/runnerDeps';
import type { Steps } from '#core/output/Steps';
import type { EmojiFile } from '@seedcord/utils/internal';

export const EMOJI_STEPS = [...BOT_STEPS, 'read folder', 'read discord'] as const;
export type EmojiStep = (typeof EMOJI_STEPS)[number];

export interface EmojiFolder {
    folder: string;
    target: ResolvedTarget['kind'];
    files: EmojiFile[];
    rest: DiscordRest;
}

export interface EmojiState extends EmojiFolder {
    session: EmojiSession;
    source: string;
    diff: EmojiDiff;
}

export async function readFolder(
    steps: Steps<EmojiStep>,
    { projectLoader, openDiscord }: RunnerDeps,
    projectDir: string
): Promise<EmojiFolder> {
    const { config, instance } = await loadBot(steps, projectLoader, projectDir);
    const folder = config.emojis.dir;
    const files = await steps.step(
        'read folder',
        () => readEmojiFolder(folder),
        (found) => plural(found.length, 'emoji')
    );
    return { folder, target: config.target.kind, files, rest: openDiscord(instance) };
}

export async function readEmojisOnDiscord(
    steps: Steps<EmojiStep>,
    read: EmojiFolder,
    guildId?: string
): Promise<EmojiState> {
    const { session, source, onDiscord } = await steps.step(
        'read discord',
        async () => {
            const session = await EmojiSession.open(read.rest);
            const source = guildId === undefined ? session.app.name : `guild ${guildId}`;
            return { session, source, onDiscord: await session.list(guildId) };
        },
        ({ source, onDiscord }) => `${plural(onDiscord.length, 'emoji')} on ${paint.bold(source)}`
    );
    steps.detail('app', paint.mute(session.app.id));

    return { ...read, session, source, diff: new EmojiDiff(read.files, onDiscord, source) };
}

export async function readEmojis(steps: Steps<EmojiStep>, deps: RunnerDeps, projectDir: string): Promise<EmojiState> {
    return readEmojisOnDiscord(steps, await readFolder(steps, deps, projectDir));
}
