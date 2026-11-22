import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { differenceBy } from 'es-toolkit';

import type { EmojiFile } from '@seedcord/utils/internal';

export interface UploadedEmoji {
    id: string;
    name: string;
}

export interface UploadedFile {
    file: EmojiFile;
    emoji: UploadedEmoji;
}

export type OnDiscord = UploadedFile | { emoji: UploadedEmoji; file?: never };

export interface EmojiDiff {
    missing: EmojiFile[];
    uploaded: UploadedFile[];
    onlyOnDiscord: UploadedEmoji[];
}

// names are case sensitive on discord
export function diffEmojis(files: readonly EmojiFile[], onDiscord: readonly UploadedEmoji[]): EmojiDiff {
    const byName = new Map(onDiscord.map((emoji) => [emoji.name, emoji]));
    const diff: EmojiDiff = {
        missing: [],
        uploaded: [],
        onlyOnDiscord: differenceBy(onDiscord, files, ({ name }) => name)
    };
    for (const file of files) {
        const emoji = byName.get(file.name);
        if (emoji) diff.uploaded.push({ file, emoji });
        else diff.missing.push(file);
    }
    return diff;
}

export function onDiscord({ uploaded, onlyOnDiscord }: EmojiDiff): OnDiscord[] {
    return [...uploaded, ...onlyOnDiscord.map((emoji) => ({ emoji }))];
}

// `where` isn't painted in here, do that before passing it in
export function unknownName(name: string, where: string, fix = 'Check the spelling. Names are case sensitive.'): never {
    throw new SeedcordTypeError(SeedcordErrorCode.CliEmojiNameUnknown, [name, where, fix]);
}

// throws if a name isn't on discord
export function namedOnDiscord(diff: EmojiDiff, names: readonly string[], source: string): OnDiscord[] {
    const byName = new Map(onDiscord(diff).map((found) => [found.emoji.name, found]));
    return names.map((name) => byName.get(name) ?? unknownName(name, paint.bold(source)));
}
