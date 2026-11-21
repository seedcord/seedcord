import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { folderEmojis } from '@seedcord/utils/internal';

import type { EmojiConfig } from '@seedcord/types';

export type ExpectedEmoji =
    | { kind: 'folder'; key: string; name: string }
    // from bot.emojis. also on the application, like the folder ones
    | { kind: 'application'; key: string; name: string }
    | { kind: 'guild'; key: string; name: string; guildId: string };

function isNameAndGuild(value: unknown): value is readonly [string, string] {
    return Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'string';
}

function configuredEmoji(key: string, value: unknown): ExpectedEmoji | undefined {
    if (typeof value === 'string') return { kind: 'application', key, name: value };
    if (isNameAndGuild(value)) return { kind: 'guild', key, name: value[0], guildId: value[1] };
    return undefined;
}

function whereOf(emoji: ExpectedEmoji): string {
    return emoji.kind === 'guild' ? `guild ${emoji.guildId}` : 'the application';
}

export function emojiNotFound(emoji: ExpectedEmoji): SeedcordError {
    const { key, name, kind } = emoji;
    const fix =
        kind === 'folder'
            ? `Run ${paint.bold('seedcord emojis push')} to upload it from your emojis folder.`
            : 'Check the spelling, or upload the emoji there.';
    return new SeedcordError(SeedcordErrorCode.ConfigEmojiNotFound, [key, name, whereOf(emoji), fix]);
}

export function emojiUnreadable(emoji: ExpectedEmoji, reason: string, fix: string, cause?: Error): SeedcordError {
    const { key, name } = emoji;
    return new SeedcordError(SeedcordErrorCode.ConfigEmojiSourceUnreadable, [key, name, whereOf(emoji), reason, fix], {
        cause
    });
}

export async function expectedEmojis(configured: EmojiConfig = {}): Promise<ExpectedEmoji[]> {
    const inFolder = await folderEmojis();
    const expected: ExpectedEmoji[] = inFolder.map(({ key, name }) => ({ kind: 'folder', key, name }));
    const folderKeys = new Set(inFolder.map(({ key }) => key));
    const problems: SeedcordTypeError[] = [];

    // bot.emojis hasn't been validated before this
    for (const [key, value] of Object.entries<unknown>(configured)) {
        const emoji = configuredEmoji(key, value);
        if (!emoji) {
            problems.push(new SeedcordTypeError(SeedcordErrorCode.ConfigEmojiInvalid, [key]));
        } else if (folderKeys.has(key)) {
            problems.push(
                new SeedcordTypeError(SeedcordErrorCode.CoreDuplicateName, [
                    `${paint.bold('Emojis')} key`,
                    key,
                    [paint.bold('bot.emojis'), 'the emojis folder']
                ])
            );
        } else {
            expected.push(emoji);
        }
    }

    throwSingleOrAggregate(problems, SeedcordErrorCode.ConfigEmojiUnresolved);
    return expected;
}
