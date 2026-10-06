import { paint } from '@seedcord/errors';
import { WORDMARK } from '@seedcord/errors/internal';

export function banner(version = process.env.PACKAGE_VERSION): string {
    const wordmark = `${WORDMARK}${paint.mute(' create')}`;
    if (version === undefined) return wordmark;

    return `${wordmark}${paint.pith(` • v${version}`)}`;
}
