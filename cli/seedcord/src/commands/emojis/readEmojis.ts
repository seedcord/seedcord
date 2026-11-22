import { paint } from '@seedcord/errors';
import { readEmojiFolder } from '@seedcord/utils/internal';

import { plural } from '#core/format';
import { BOT_STEPS, loadBot } from '#core/modules/loadBot';

import { diffEmojis } from './emojiDiff';
import { EmojiSession } from './EmojiSession';

import type { ResolvedTarget } from '#core/config/schema';
import type { RunnerDeps } from '#core/discord/runnerDeps';
import type { Steps } from '#core/output/Steps';
import type { EmojiDiff } from './emojiDiff';
import type { EmojiFile } from '@seedcord/utils/internal';

export const EMOJI_STEPS = [...BOT_STEPS, 'read folder', 'read discord'] as const;
export type EmojiStep = (typeof EMOJI_STEPS)[number];

export interface EmojiState {
    folder: string;
    target: ResolvedTarget['kind'];
    session: EmojiSession;
    // the app's name, or "guild <id>"
    source: string;
    files: EmojiFile[];
    diff: EmojiDiff;
}

export async function readEmojis(
    steps: Steps<EmojiStep>,
    { projectLoader, openDiscord }: RunnerDeps,
    projectDir: string,
    guildId?: string
): Promise<EmojiState> {
    const { config, instance } = await loadBot(steps, projectLoader, projectDir);
    const folder = config.emojis.dir;

    const files = await steps.step(
        'read folder',
        () => readEmojiFolder(folder),
        (found) => plural(found.length, 'emoji')
    );
    const { session, source, onDiscord } = await steps.step(
        'read discord',
        async () => {
            const session = await EmojiSession.open(openDiscord(instance));
            const source = guildId === undefined ? session.app.name : `guild ${guildId}`;
            return { session, source, onDiscord: await session.list(guildId) };
        },
        ({ source, onDiscord }) => `${plural(onDiscord.length, 'emoji')} on ${paint.bold(source)}`
    );
    steps.detail('app', paint.mute(session.app.id));

    return { folder, target: config.target.kind, session, source, files, diff: diffEmojis(files, onDiscord) };
}
