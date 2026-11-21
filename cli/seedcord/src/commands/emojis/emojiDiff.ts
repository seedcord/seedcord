import type { EmojiFile } from '@seedcord/utils/internal';

export interface UploadedEmoji {
    id: string;
    name: string;
}

export interface UploadedFile {
    file: EmojiFile;
    emoji: UploadedEmoji;
}

export interface EmojiDiff {
    missing: EmojiFile[];
    uploaded: UploadedFile[];
    onlyOnDiscord: UploadedEmoji[];
}

// names are case sensitive on discord
export function diffEmojis(files: readonly EmojiFile[], onDiscord: readonly UploadedEmoji[]): EmojiDiff {
    const byName = new Map(onDiscord.map((emoji) => [emoji.name, emoji]));
    const inFolder = new Set(files.map(({ name }) => name));
    const diff: EmojiDiff = {
        missing: [],
        uploaded: [],
        onlyOnDiscord: onDiscord.filter(({ name }) => !inFolder.has(name))
    };
    for (const file of files) {
        const emoji = byName.get(file.name);
        if (emoji) diff.uploaded.push({ file, emoji });
        else diff.missing.push(file);
    }
    return diff;
}
