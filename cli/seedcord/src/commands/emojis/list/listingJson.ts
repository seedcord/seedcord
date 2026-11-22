import type { UploadedEmoji } from '#commands/emojis/EmojiDiff';
import type { EmojiSession } from '#commands/emojis/EmojiSession';
import type { EmojiState } from '#commands/emojis/readEmojis';
import type { EmojiFile } from '@seedcord/utils/internal';

interface ListingJson {
    application: EmojiSession['app'];
    folder: string;
    uploaded: (EmojiFile & Pick<UploadedEmoji, 'id'>)[];
    notUploaded: EmojiFile[];
    onlyOnDiscord: UploadedEmoji[];
}

export function listingJson({ session, folder, diff }: EmojiState): ListingJson {
    return {
        application: session.app,
        folder,
        uploaded: diff.uploaded.map(({ file, emoji }) => ({ ...file, id: emoji.id })),
        notUploaded: diff.missing,
        onlyOnDiscord: diff.onlyOnDiscord
    };
}
