import { paint } from '@seedcord/errors/internal';

export function banner(version = process.env.PACKAGE_VERSION): string {
    const wordmark = `${paint.flesh.bold('seed')}${paint.rind.bold('cord')}`;
    if (version === undefined) return wordmark;

    return `${wordmark}${paint.pith(` • v${version}`)}`;
}
