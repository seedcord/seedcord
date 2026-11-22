import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { differenceBy, partition, uniq, upperFirst } from 'es-toolkit';

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

// paint `where` before you pass it
export function unknownName(name: string, where: string, fix = 'Check the spelling. Names are case sensitive.'): never {
    throw new SeedcordTypeError(SeedcordErrorCode.CliEmojiNameUnknown, [name, where, fix]);
}

// names are case sensitive on discord
export class EmojiDiff {
    public readonly missing: EmojiFile[];
    public readonly uploaded: UploadedFile[];
    public readonly onlyOnDiscord: UploadedEmoji[];

    // `source` is the application's name, or "guild <id>"
    constructor(
        files: readonly EmojiFile[],
        onDiscord: readonly UploadedEmoji[],
        private readonly source: string
    ) {
        const byName = new Map(onDiscord.map((emoji) => [emoji.name, emoji]));
        const [uploaded, missing] = partition(
            files.map((file) => ({ file, emoji: byName.get(file.name) })),
            (paired): paired is UploadedFile => paired.emoji !== undefined
        );
        this.uploaded = uploaded;
        this.missing = missing.map(({ file }) => file);
        this.onlyOnDiscord = differenceBy(onDiscord, files, ({ name }) => name);
    }

    public onDiscord(): OnDiscord[] {
        return [...this.uploaded, ...this.onlyOnDiscord.map((emoji) => ({ emoji }))];
    }

    // throws if a name isn't on discord
    public named(names: readonly string[]): OnDiscord[] {
        const byName = new Map(this.onDiscord().map((found) => [found.emoji.name, found]));
        return uniq(names).map((name) => byName.get(name) ?? unknownName(name, paint.bold(upperFirst(this.source))));
    }
}
